require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const GameStateMachine = require('./gameEngine/GameStateMachine');

// App & server setup 

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'https://cipher-gg.vercel.app',
    ],
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5005;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB Atlas (CipherGG-DB)');
    server.listen(PORT, () => {
      console.log(`🚀 Server and WebSockets running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Error connecting to MongoDB:', error.message);
  });

// In-memory room state 

/**
 * rooms[roomCode]        → Player[]
 * roomSettings[roomCode] → { teamSize }
 * roomLogs[roomCode]     → string[]
 * activeGames[roomCode]  → GameStateMachine
 */
const rooms = {
  DEMO99: [
    { id: 'bot_1', name: 'Alpha', isHost: true,  isReady: true,  isConnected: true },
    { id: 'bot_2', name: 'Beta',  isHost: false, isReady: false, isConnected: true },
  ],
};
const roomSettings = {};
const roomLogs     = {};
const activeGames  = {};

// Helpers 

function getOrInitRoom(roomCode) {
  if (!rooms[roomCode])        rooms[roomCode]        = [];
  if (!roomSettings[roomCode]) roomSettings[roomCode] = { teamSize: 10 };
  if (!roomLogs[roomCode])     roomLogs[roomCode]     = [];
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
    players: roomPlayers.map((p) => ({
      id:       p.id,
      name:     p.name,
      isLeader: fsm.currentLeader?.id === p.id,
      isOnTeam: (fsm.proposedTeam ?? []).includes(p.id),
    })),
  };
}

/**
 * Emit a fresh game_state_update to everyone in the room.
 */
function broadcastGameState(roomCode) {
  io.to(roomCode).emit('game_state_update', buildClientGameState(roomCode));
}

// Socket handlers 

io.on('connection', (socket) => {
  console.log(`⚡ Agent Connected: ${socket.id}`);

  // Lobby 

  socket.on('join_room', ({ roomCode, displayName, action }) => {
    // Kick any stale socket with the same identity.
    const stale = Array.from(io.sockets.sockets.values()).find(
      (s) => s.displayName === displayName && s.roomCode === roomCode && s.id !== socket.id
    );
    if (stale) stale.disconnect(true);

    if (action !== 'host' && !rooms[roomCode]) {
      return socket.emit('room_error', 'ACCESS DENIED: Room does not exist.');
    }

    getOrInitRoom(roomCode);
    socket.join(roomCode);
    socket.emit('settings_update', roomSettings[roomCode]);
    socket.emit('chat_history', roomLogs[roomCode]);

    const isFirstPlayer = rooms[roomCode].length === 0;
    const shouldBeHost  = action === 'host' || isFirstPlayer;

    const existingPlayer = rooms[roomCode].find((p) => p.name === displayName);

    if (!existingPlayer) {
      // Demo room: the joining human becomes host, bots are demoted.
      if (roomCode === 'DEMO99') {
        rooms[roomCode].forEach((p) => { p.isHost = false; });
      }

      rooms[roomCode].push({
        id:          socket.id,
        name:        displayName,
        isHost:      shouldBeHost,
        isReady:     false,
        isConnected: true,
      });
      socket.to(roomCode).emit('player_joined', { user: displayName });
    } else {
      // Reconnecting player: restore their socket ID and connected state.
      existingPlayer.id          = socket.id;
      existingPlayer.isConnected = true;
      if (shouldBeHost) existingPlayer.isHost = true;
    }

    socket.roomCode    = roomCode;
    socket.displayName = displayName;

    // Safety net: ensure there is always exactly one host.
    const hasHost = rooms[roomCode].some((p) => p.isHost);
    if (!hasHost && rooms[roomCode].length > 0) rooms[roomCode][0].isHost = true;

    io.to(roomCode).emit('roster_update', rooms[roomCode]);

    // If a game is already running, sync the rejoining player immediately.
    if (activeGames[roomCode]) {
      const game      = activeGames[roomCode];
      const fsm       = game.getState();
      const player    = rooms[roomCode].find((p) => p.name === displayName);
      const roleData  = player ? game.roleAssignments?.get(player.id) : null;

      if (roleData) {
        socket.emit('role_assigned', {
          role:        roleData.role,
          team:        roleData.team,
          specialInfo: roleData.specialInfo,
        });
      }
      socket.emit('game_state_update', buildClientGameState(roomCode));
    }
  });

  socket.on('status_update', ({ roomCode, isReady }) => {
    const player = rooms[roomCode]?.find((p) => p.id === socket.id);
    if (player && player.isReady !== isReady) {
      player.isReady = isReady;
      io.to(roomCode).emit('roster_update', rooms[roomCode]);
      io.to(roomCode).emit('player_ready_log', { name: player.name, isReady });
    }
  });

  socket.on('change_settings', ({ roomCode, teamSize }) => {
    const requester = rooms[roomCode]?.find((p) => p.id === socket.id);
    if (requester?.isHost) {
      roomSettings[roomCode].teamSize = teamSize;
      io.to(roomCode).emit('settings_update', roomSettings[roomCode]);
    }
  });

  socket.on('send_message', ({ roomCode, sender, message }) => {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false, hour: '2-digit', minute: '2-digit',
    });
    const formatted = `[${timestamp}] ${sender}: ${message}`;
    roomLogs[roomCode]?.push(formatted);
    io.to(roomCode).emit('receive_message', { text: formatted });
  });

  // Game start 

  socket.on('start_game', ({ roomCode }) => {
    const players = rooms[roomCode];

    if (!players || players.length !== 5) {
      return socket.emit('game_error', 'Needs exactly 5 players to start.');
    }

    const fsm = new GameStateMachine(players);
    activeGames[roomCode] = fsm;

    const { roleAssignments } = fsm.startGame(); // LOBBY → TEAM_SELECTION

    // Send each player their secret role.
    players.forEach((player) => {
      const roleData = roleAssignments.get(player.id);
      io.to(player.id).emit('role_assigned', {
        role:        roleData.role,
        team:        roleData.team,
        specialInfo: roleData.specialInfo,
      });
    });

    io.to(roomCode).emit('game_started');
    broadcastGameState(roomCode);
    console.log(`🎮 Game started in room ${roomCode}`);
  });

  // Mid-game actions 

  socket.on('propose_team', ({ roomCode, proposedTeamIds }) => {
    const game = activeGames[roomCode];
    if (!game) return;

    try {
      const result = game.proposeTeam(socket.id, proposedTeamIds);
      io.to(roomCode).emit('team_proposed', result);
      broadcastGameState(roomCode);
    } catch (err) {
      socket.emit('game_error', err.message);
    }
  });

  socket.on('cast_vote', ({ roomCode, approve }) => {
    const game = activeGames[roomCode];
    if (!game) return;

    try {
      const result = game.castVote(socket.id, approve);
      if (result.resolved) {
        io.to(roomCode).emit('vote_resolved', result);

        if (result.state === 'VOTE_FAILED') {
          // Auto-advance after the 3 sec frontend pause.
          setTimeout(() => {
            const next = game.advanceAfterFailedVote();
            io.to(roomCode).emit('vote_failed_advance', next);
            broadcastGameState(roomCode);
          }, 3000);
        }
      }
      broadcastGameState(roomCode);
    } catch (err) {
      socket.emit('game_error', err.message);
    }
  });

  socket.on('submit_quest_action', ({ roomCode, pass }) => {
    const game = activeGames[roomCode];
    if (!game) return;

    try {
      const result = game.submitQuestAction(socket.id, pass);
      if (result.resolved) {
        io.to(roomCode).emit('quest_result', result);

        // Auto advance after the 4 sec reveal pause.
        setTimeout(() => {
          const next = game.advanceAfterQuestResult();
          io.to(roomCode).emit('quest_result_advance', next);
          broadcastGameState(roomCode);

          if (next.currentState === 'GAME_OVER') {
            io.to(roomCode).emit('game_over', next);
          }
        }, 4000);
      }
      broadcastGameState(roomCode);
    } catch (err) {
      socket.emit('game_error', err.message);
    }
  });

  socket.on('resolve_assassination', ({ roomCode, targetId }) => {
    const game = activeGames[roomCode];
    if (!game) return;

    try {
      const result = game.resolveAssassination(socket.id, targetId);
      io.to(roomCode).emit('game_over', result);
      broadcastGameState(roomCode);
    } catch (err) {
      socket.emit('game_error', err.message);
    }
  });

  // Disconnect

  socket.on('disconnect', () => {
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
      io.to(roomCode).emit('player_left', { id: socket.id, name: displayName });

      if (player.isHost && rooms[roomCode].length > 0) {
        rooms[roomCode][0].isHost = true;
      }

      if (rooms[roomCode].length === 0) {
        delete rooms[roomCode];
        delete roomSettings[roomCode];
        delete roomLogs[roomCode];
        delete activeGames[roomCode];
      } else {
        io.to(roomCode).emit('roster_update', rooms[roomCode]);
      }
    }, 3000);
  });
});

// REST 

app.get('/', (_req, res) => res.send('Cipher.gg API is running!'));