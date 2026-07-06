const User = require("../models/User");

const {
  MIN_PLAYERS,
  MAX_PLAYERS,
  isSupportedPlayerCount,
} = require("../gameEngine/config/gameConfig");

const {
  rooms,
  roomSettings,
  roomLogs,
  activeGames,
  getOrInitRoom,
  deleteRoom,
} = require("../services/roomStore");

const { buildClientGameState } = require("../services/gameStatePresenter");

function registerLobbyHandlers(io, socket) {
  socket.on("join_room", async ({ roomCode, displayName, action, clerkId }) => {
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

    if (action !== "host" && !rooms[roomCode]) {
      return socket.emit("room_error", "ACCESS DENIED: Room does not exist.");
    }

    let mongoDbId = null;

    if (clerkId) {
      try {
        let dbUser = await User.findOne({ clerkId });

        if (!dbUser) {
          dbUser = await User.create({
            clerkId,
            username: safeName,
          });

          console.log(`👤 New agent profile created for ${safeName}`);
        }

        mongoDbId = dbUser._id;
      } catch (err) {
        console.error("❌ Error fetching/creating user:", err);
      }
    }

    if (
      activeGames[roomCode] &&
      activeGames[roomCode].getState().phase === "GAME_OVER"
    ) {
      delete activeGames[roomCode];

      if (rooms[roomCode]) {
        rooms[roomCode].forEach((player) => {
          player.isReady = false;
        });
      }
    }

    const isExistingPlayer = rooms[roomCode]?.some((player) => player.name === safeName);

    if (activeGames[roomCode] && !isExistingPlayer) {
      return socket.emit(
        "room_error",
        "ACCESS DENIED: The game has already started!",
      );
    }

    getOrInitRoom(roomCode);

    const maxPlayers = roomSettings[roomCode]?.teamSize ?? MIN_PLAYERS;

    if (!isExistingPlayer && rooms[roomCode].length >= maxPlayers) {
      return socket.emit(
        "room_error",
        `ACCESS DENIED: The lobby is full (Max ${maxPlayers} Agents).`,
      );
    }

    const existingPlayer = rooms[roomCode].find((player) => player.name === safeName);

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

    const staleSocket = Array.from(io.sockets.sockets.values()).find(
      (candidateSocket) =>
        candidateSocket.displayName === safeName &&
        candidateSocket.roomCode === roomCode &&
        candidateSocket.id !== socket.id,
    );

    if (staleSocket) {
      staleSocket.disconnect(true);
    }

    socket.join(roomCode);
    socket.emit("settings_update", roomSettings[roomCode]);
    socket.emit("chat_history", roomLogs[roomCode]);

    const isFirstPlayer = rooms[roomCode].length === 0;
    const shouldBeHost = action === "host" || isFirstPlayer;

    if (!existingPlayer) {
      rooms[roomCode].push({
        id: socket.id,
        name: safeName,
        isHost: shouldBeHost,
        isReady: false,
        isConnected: true,
        dbId: mongoDbId,
      });

      socket.to(roomCode).emit("player_joined", { user: safeName });
    } else {
      const oldId = existingPlayer.id;
      const newId = socket.id;
      const idChanged = oldId !== newId;

      existingPlayer.id = newId;
      existingPlayer.isConnected = true;
      existingPlayer.isReady = false;

      if (shouldBeHost) {
        existingPlayer.isHost = true;
      }

      if (mongoDbId) {
        existingPlayer.dbId = mongoDbId;
      }

      if (idChanged && activeGames[roomCode]) {
        activeGames[roomCode].remapPlayerId(oldId, newId);

        const roleData = activeGames[roomCode].roleAssignments?.get(newId);

        if (roleData?.team === "evil") {
          socket.join(`${roomCode}_EVIL`);
        }
      }
    }

    socket.roomCode = roomCode;
    socket.displayName = safeName;

    const hasHost = rooms[roomCode].some((player) => player.isHost);

    if (!hasHost && rooms[roomCode].length > 0) {
      rooms[roomCode][0].isHost = true;
    }

    io.to(roomCode).emit("roster_update", rooms[roomCode]);

    if (activeGames[roomCode]) {
      const game = activeGames[roomCode];
      const player = rooms[roomCode].find((roomPlayer) => roomPlayer.name === safeName);
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

  socket.on("return_to_base", () => {
    const { roomCode, displayName } = socket;

    if (!roomCode || !rooms[roomCode]) return;

    const playerIndex = rooms[roomCode].findIndex(
      (player) => player.name === displayName,
    );

    if (playerIndex !== -1) {
      const leavingPlayer = rooms[roomCode][playerIndex];

      rooms[roomCode].splice(playerIndex, 1);
      socket.leave(roomCode);

      io.to(roomCode).emit("player_left", {
        id: socket.id,
        name: displayName,
      });

      if (leavingPlayer.isHost && rooms[roomCode].length > 0) {
        rooms[roomCode][0].isHost = true;
      }

      if (rooms[roomCode].length === 0) {
        deleteRoom(roomCode);
      } else {
        io.to(roomCode).emit("roster_update", rooms[roomCode]);
      }
    }

    socket.roomCode = null;
    socket.displayName = null;
  });

  socket.on("status_update", ({ roomCode, isReady }) => {
    const player = rooms[roomCode]?.find((roomPlayer) => roomPlayer.id === socket.id);

    if (player && player.isReady !== isReady) {
      player.isReady = isReady;

      io.to(roomCode).emit("roster_update", rooms[roomCode]);
      io.to(roomCode).emit("player_ready_log", {
        name: player.name,
        isReady,
      });
    }
  });

  socket.on("change_settings", ({ roomCode, teamSize }) => {
    getOrInitRoom(roomCode);

    const requester = rooms[roomCode]?.find((player) => player.id === socket.id);

    if (!requester?.isHost) return;

    const parsedTeamSize = Number(teamSize);

    if (!isSupportedPlayerCount(parsedTeamSize)) {
      return socket.emit(
        "room_error",
        `Invalid lobby size. Choose between ${MIN_PLAYERS} and ${MAX_PLAYERS} players.`,
      );
    }

    if (rooms[roomCode].length > parsedTeamSize) {
      return socket.emit(
        "room_error",
        `Cannot reduce lobby size below current player count (${rooms[roomCode].length}).`,
      );
    }

    roomSettings[roomCode].teamSize = parsedTeamSize;

    io.to(roomCode).emit("settings_update", roomSettings[roomCode]);
    io.to(roomCode).emit("roster_update", rooms[roomCode]);
  });
}

module.exports = {
  registerLobbyHandlers,
};