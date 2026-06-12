require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const GameStateMachine = require("./gameEngine/GameStateMachine");

// App & server setup

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://cipher-gg.vercel.app"],
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 5005;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Successfully connected to MongoDB Atlas (CipherGG-DB)");
    if (require.main === module) {
      // Only start server if this file is run directly, not imported for tests
      server.listen(PORT, () => {
        console.log(`🚀 Server and WebSockets running on port ${PORT}`);
      });
    }
  })
  .catch((error) => {
    console.error("❌ Error connecting to MongoDB:", error.message);
  });

// Database Models
const Match = require('./models/Match'); 
const User = require('./models/User'); 

// Helpers
async function saveMatchRecord(roomCode, gameResult) {
  const game = activeGames[roomCode];
  const roomPlayers = rooms[roomCode] || [];

  if (!game || !game.roleAssignments) return;

  try {
    const formattedPlayers = roomPlayers.map(p => {
      const roleData = game.roleAssignments.get(p.id);
      return {
        userId: p.dbId || null, 
        guestName: p.dbId ? null : p.name,
        role: roleData ? roleData.role : 'Unknown',
        team: roleData ? roleData.team : 'Unknown'
      };
    });

    const newMatch = new Match({
      roomCode,
      winner: gameResult.winner,
      winReason: gameResult.winReason,
      questHistory: gameResult.questHistory || [],
      players: formattedPlayers
    });

    await newMatch.save();
    console.log(`💾 Match record saved for room ${roomCode}`);

  } catch (error) {
    console.error(`❌ Failed to save match record for ${roomCode}:`, error);
  }
}

// In-memory room state
/**
 * rooms[roomCode]        → Player[]
 * roomSettings[roomCode] → { teamSize }
 * roomLogs[roomCode]     → string[]
 * activeGames[roomCode]  → GameStateMachine
 */
const rooms = {
  DEMO99: [
    {
      id: "bot_1",
      name: "Alpha",
      isHost: true,
      isReady: true,
      isConnected: true,
    },
    {
      id: "bot_2",
      name: "Beta",
      isHost: false,
      isReady: false,
      isConnected: true,
    },
  ],
};
const roomSettings = {};
const roomLogs = {};
const activeGames = {};

// Helpers

function getOrInitRoom(roomCode) {
  if (!rooms[roomCode]) rooms[roomCode] = [];
  if (!roomSettings[roomCode]) roomSettings[roomCode] = { teamSize: 5 };
  if (!roomLogs[roomCode]) roomLogs[roomCode] = [];
}

/**
 * Serialise the current game state for broadcast.
 * Merges FSM state with the room roster so the client has everything it needs.
 */
function buildClientGameState(roomCode) {
  const game = activeGames[roomCode];
  if (!game) return null;

  const roomPlayers = rooms[roomCode] ?? [];
  const fsm = game.getState();

  return {
    ...fsm,
    gameId: game.gameId,
    players: roomPlayers.map((p) => {
      const pData = {
        id: p.id,
        name: p.name,
        isLeader: fsm.currentLeader?.id === p.id,
        isOnTeam: (fsm.proposedTeam ?? []).includes(p.id),
      };

      if (fsm.phase === "GAME_OVER" && game.roleAssignments) {
        const roleInfo = game.roleAssignments.get(p.id);
        if (roleInfo) {
          pData.role = roleInfo.role;
          pData.team = roleInfo.team;
        }
      }
      return pData;
    }),
  };
}

/**
 * Emit a fresh game_state_update to everyone in the room.
 */
function broadcastGameState(roomCode) {
  io.to(roomCode).emit("game_state_update", buildClientGameState(roomCode));
}

// Socket handlers

io.on("connection", (socket) => {
  console.log(`⚡ Agent Connected: ${socket.id}`);

  // Lobby
  socket.on("join_room", async ({ roomCode, displayName, action, clerkId }) => {
    // Ban all spaces, empty names, and absurdly long names
    const trimmedName = (displayName || "").trim();

    if (!trimmedName || trimmedName.length < 1) {
      return socket.emit(
        "room_error",
        "ACCESS DENIED: Agent name cannot be blank or just spaces.",
      );
    }
    if (trimmedName.length > 15) {
      return socket.emit(
        "room_error",
        "ACCESS DENIED: Agent name must be 15 characters or less.",
      );
    }

    const safeName = trimmedName;
    
    // Fetch or create user in MongoDB
    let mongoDbId = null;
    if (clerkId) {
      try {
        let dbUser = await User.findOne({ clerkId });
        if (!dbUser) {
          // First time logging in: Create profile.
          dbUser = await User.create({
            clerkId: clerkId,
            username: safeName
          });
          console.log(`👤 New agent profile created for ${safeName}`);
        }
        mongoDbId = dbUser._id;
      } catch (err) {
        console.error("❌ Error fetching/creating user:", err);
      }
    }

    // Wipe the old game state so the room can start fresh
    if (
      activeGames[roomCode] &&
      activeGames[roomCode].getState().phase === "GAME_OVER"
    ) {
      delete activeGames[roomCode];
      // Force everyone currently in the room back to standby
      if (rooms[roomCode]) {
        rooms[roomCode].forEach((p) => (p.isReady = false));
      }
    }

    // Validate room exists if joining
    if (action !== "host" && !rooms[roomCode]) {
      return socket.emit("room_error", "ACCESS DENIED: Room does not exist.");
    }

    // Prevent joining mid-game
    const isExistingPlayer = rooms[roomCode]?.some((p) => p.name === safeName);
    if (activeGames[roomCode] && !isExistingPlayer) {
      return socket.emit(
        "room_error",
        "ACCESS DENIED: The game has already started!",
      );
    }

    if (!isExistingPlayer && rooms[roomCode] && rooms[roomCode].length >= 5) {
      return socket.emit(
        "room_error",
        "ACCESS DENIED: The lobby is full (Max 5 Agents).",
      );
    }

    // Identity Theft / Reconnection logic
    const existingPlayer = rooms[roomCode]?.find((p) => p.name === safeName);

    if (
      existingPlayer &&
      existingPlayer.isConnected &&
      existingPlayer.id !== socket.id
    ) {
      return socket.emit(
        "room_error",
        "ACCESS DENIED: Alias already active. Please choose a different name.",
      );
    }

    // Clean up any stale sockets
    const stale = Array.from(io.sockets.sockets.values()).find(
      (s) =>
        s.displayName === safeName &&
        s.roomCode === roomCode &&
        s.id !== socket.id,
    );
    if (stale) stale.disconnect(true);

    // Initialize Room
    getOrInitRoom(roomCode);
    socket.join(roomCode);
    socket.emit("settings_update", roomSettings[roomCode]);
    socket.emit("chat_history", roomLogs[roomCode]);

    // Handle Player Data
    const isFirstPlayer = rooms[roomCode].length === 0;
    const shouldBeHost = action === "host" || isFirstPlayer;

    if (!existingPlayer) {
      // Brand new player
      rooms[roomCode].push({
        id: socket.id,
        name: safeName,
        isHost: shouldBeHost,
        isReady: false,
        isConnected: true,
      });
      socket.to(roomCode).emit("player_joined", { user: safeName });
    } else {
      // Returning player
      existingPlayer.id = socket.id;
      existingPlayer.isConnected = true;
      existingPlayer.isReady = false;
      if (shouldBeHost) existingPlayer.isHost = true;
    }

    socket.roomCode = roomCode;
    socket.displayName = safeName;

    // Ensure Host exists
    const hasHost = rooms[roomCode].some((p) => p.isHost);
    if (!hasHost && rooms[roomCode].length > 0)
      rooms[roomCode][0].isHost = true;

    io.to(roomCode).emit("roster_update", rooms[roomCode]);

    // Mid-game reconnection sync
    if (activeGames[roomCode]) {
      const game = activeGames[roomCode];
      const fsm = game.getState();
      const player = rooms[roomCode].find((p) => p.name === safeName);
      const roleData = player ? game.roleAssignments?.get(player.id) : null;

      if (roleData) {
        socket.emit("role_assigned", {
          role: roleData.role,
          team: roleData.team,
          specialInfo: roleData.specialInfo,
        });
      }
      socket.emit("game_state_update", buildClientGameState(roomCode));
    }
  });

  // Triggered whenever a player lands on the Home screen
  socket.on("return_to_base", () => {
    const { roomCode, displayName } = socket;
    if (!roomCode || !rooms[roomCode]) return;

    const playerIndex = rooms[roomCode].findIndex(
      (p) => p.name === displayName,
    );
    if (playerIndex !== -1) {
      const leavingPlayer = rooms[roomCode][playerIndex];
      rooms[roomCode].splice(playerIndex, 1);

      socket.leave(roomCode);
      io.to(roomCode).emit("player_left", { id: socket.id, name: displayName });

      if (leavingPlayer.isHost && rooms[roomCode].length > 0) {
        rooms[roomCode][0].isHost = true;
      }

      if (rooms[roomCode].length === 0) {
        delete rooms[roomCode];
        delete roomSettings[roomCode];
        delete roomLogs[roomCode];
        delete activeGames[roomCode];
      } else {
        io.to(roomCode).emit("roster_update", rooms[roomCode]);
      }
    }

    // Clear the socket's memory so they don't accidentally trigger this again
    socket.roomCode = null;
    socket.displayName = null;
  });

  socket.on("status_update", ({ roomCode, isReady }) => {
    const player = rooms[roomCode]?.find((p) => p.id === socket.id);
    if (player && player.isReady !== isReady) {
      player.isReady = isReady;
      io.to(roomCode).emit("roster_update", rooms[roomCode]);
      io.to(roomCode).emit("player_ready_log", { name: player.name, isReady });
    }
  });

  socket.on("change_settings", ({ roomCode, teamSize }) => {
    const requester = rooms[roomCode]?.find((p) => p.id === socket.id);
    if (requester?.isHost) {
      roomSettings[roomCode].teamSize = teamSize;
      io.to(roomCode).emit("settings_update", roomSettings[roomCode]);
    }
  });

  socket.on("send_message", ({ roomCode, sender, message }) => {
    const timestamp = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
    const formatted = `[${timestamp}] ${sender}: ${message}`;
    roomLogs[roomCode]?.push(formatted);
    io.to(roomCode).emit("receive_message", { text: formatted });
  });

  // Game start

  socket.on("start_game", ({ roomCode }) => {
    const players = rooms[roomCode];

    if (!players || players.length !== 5) {
      return socket.emit("game_error", "Needs exactly 5 players to start.");
    }

    const fsm = new GameStateMachine(players);
    fsm.gameId = Date.now();
    activeGames[roomCode] = fsm;

    fsm.startGame();
    const roleAssignments = fsm.roleAssignments;

    // Send each player their secret role.
    players.forEach((player) => {
      const roleData = roleAssignments.get(player.id);
      io.to(player.id).emit("role_assigned", {
        role: roleData.role,
        team: roleData.team,
        specialInfo: roleData.specialInfo,
      });
    });

    io.to(roomCode).emit("game_started");
    broadcastGameState(roomCode);
    console.log(`🎮 Game started in room ${roomCode}`);
  });

  socket.on("join_game_dashboard", ({ roomCode, name }) => {
    const game = activeGames[roomCode];
    if (!game) return;

    const roomPlayers = rooms[roomCode] || [];
    const player = roomPlayers.find((p) => p.name === name);

    if (player && game.roleAssignments) {
      const roleData = game.roleAssignments.get(player.id);
      if (roleData) {
        socket.emit("role_assigned", {
          role: roleData.role,
          team: roleData.team,
          specialInfo: roleData.specialInfo,
        });
      }
    }

    socket.emit("game_state_update", buildClientGameState(roomCode));
  });

  // Mid-game actions

  socket.on("propose_team", ({ roomCode, proposedTeamIds }) => {
    const game = activeGames[roomCode];
    if (!game) return;

    try {
      const result = game.proposeTeam(socket.id, proposedTeamIds);
      io.to(roomCode).emit("team_proposed", result);
      broadcastGameState(roomCode);
    } catch (err) {
      socket.emit("game_error", err.message);
    }
  });

  socket.on("submit_vote", ({ roomCode, vote }) => {
    const game = activeGames[roomCode];
    if (!game) return;
    try {
      const result = game.castVote(socket.id, vote);
      if (result.resolved) {
        io.to(roomCode).emit("vote_resolved", result);

        if (result.state === "VOTE_FAILED") {
          setTimeout(() => {
            const next = game.advanceAfterFailedVote();
            io.to(roomCode).emit("vote_failed_advance", next);
            broadcastGameState(roomCode);
          }, 3000);
        } else if (result.phase === "GAME_OVER") {
          saveMatchRecord(roomCode, result);
          io.to(roomCode).emit("game_over", result);
        }
      }
      broadcastGameState(roomCode);
    } catch (err) {
      socket.emit("game_error", err.message);
    }
  });

  socket.on("submit_quest_vote", ({ roomCode, vote }) => {
    const game = activeGames[roomCode];
    if (!game) return;
    try {
      const result = game.submitQuestAction(socket.id, vote);
      if (result.resolved) {
        io.to(roomCode).emit("quest_result", result);

        setTimeout(() => {
          const next = game.advanceAfterQuestResult();

          if (next.phase === "GAME_OVER") {
            saveMatchRecord(roomCode, next);
            io.to(roomCode).emit("game_over", next);
          } else {
            io.to(roomCode).emit("quest_result_advance", next);
          }

          broadcastGameState(roomCode);
        }, 4000);
      }
      broadcastGameState(roomCode);
    } catch (err) {
      socket.emit("game_error", err.message);
    }
  });

  socket.on("timer_expired", ({ roomCode, phase }) => {
    const game = activeGames[roomCode];
    if (!game) return;
    if (game.getState().phase !== phase) return;

    try {
      if (phase === "TEAM_SELECTION") {
        const { currentLeader, currentQuest } = game.getState();

        // Only process if the sender is actually the current leader
        if (socket.id !== currentLeader.id) return;

        const requiredSize =
          game.questManager.questConfig[currentQuest].teamSize;
        const players = rooms[roomCode];
        const forcedTeam = players.slice(0, requiredSize).map((p) => p.id);

        const result = game.proposeTeam(socket.id, forcedTeam);
        io.to(roomCode).emit("team_proposed", result);
        broadcastGameState(roomCode);
      }
    } catch (err) {
      socket.emit("game_error", err.message);
    }
  });

  socket.on("submit_assassination", ({ roomCode, targetId }) => {
    const game = activeGames[roomCode];
    if (!game) return;

    try {
      const result = game.resolveAssassination(socket.id, targetId);
      saveMatchRecord(roomCode, result);
      io.to(roomCode).emit("game_over", result);
      broadcastGameState(roomCode);
    } catch (err) {
      socket.emit("game_error", err.message);
    }
  });

  // Disconnect

  socket.on("disconnect", () => {
    console.log(`🔌 Agent Disconnected: ${socket.id}`);
    const { roomCode, displayName } = socket;
    if (!roomCode || !rooms[roomCode]) return;

    const leavingPlayer = rooms[roomCode].find((p) => p.name === displayName);
    if (leavingPlayer) leavingPlayer.isConnected = false;

    // Grace period for reconnection
    setTimeout(() => {
      if (!rooms[roomCode]) return;
      const player = rooms[roomCode].find((p) => p.name === displayName);
      if (!player || player.isConnected) return; // reconnected in time

      rooms[roomCode] = rooms[roomCode].filter((p) => p.name !== displayName);
      io.to(roomCode).emit("player_left", { id: socket.id, name: displayName });

      if (player.isHost && rooms[roomCode].length > 0) {
        rooms[roomCode][0].isHost = true;
      }

      if (rooms[roomCode].length === 0) {
        delete rooms[roomCode];
        delete roomSettings[roomCode];
        delete roomLogs[roomCode];
        delete activeGames[roomCode];
      } else {
        io.to(roomCode).emit("roster_update", rooms[roomCode]);
      }
    }, 3000);
  });
});

// REST

app.get("/", (_req, res) => res.send("Cipher.gg API is running!"));

module.exports = { testServer: server };
