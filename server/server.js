const RoleAssigner = require('./gameEngine/RoleAssigner'); 
const QuestManager = require('./gameEngine/QuestManager');

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http'); 
const { Server } = require('socket.io'); 

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",               
      "https://cipher-gg.vercel.app"   
    ], 
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5005;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB Atlas (CipherGG-DB)');
    server.listen(PORT, () => {
      console.log(`🚀 Server and WebSockets are running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Error connecting to MongoDB:', error.message);
  });

const rooms = {
  'DEMO99': [
    { id: 'bot_1', name: 'Alpha', isHost: true, isReady: true, isConnected: true },
    { id: 'bot_2', name: 'Beta', isHost: false, isReady: false, isConnected: true }
  ]
};
const roomSettings = {};
const activeGames = {}; 
const roomLogs = {}; 

function buildGameState(roomCode) {
  const game = activeGames[roomCode];
  if (!game) return null;
  const roomPlayers = rooms[roomCode] || [];
  const qs = game.questManager.getGameState();
  return {
    ...qs,
    phase: game.phase || 'TEAM_SELECTION',
    players: roomPlayers.map(p => ({
      id: p.id,
      name: p.name,
      isLeader: qs.currentLeader?.id === p.id,
      isOnTeam: qs.proposedTeam.includes(p.id)
    }))
  };
}

io.on('connection', (socket) => {
  console.log(`⚡ Agent Connected: ${socket.id}`);

  socket.on('join_room', ({ roomCode, displayName, action }) => {

    const existingSocket = Array.from(io.sockets.sockets.values())
      .find(s => s.displayName === displayName && s.roomCode === roomCode && s.id !== socket.id);

    if (existingSocket) {
      existingSocket.disconnect(true); 
    }

    if (action !== 'host' && !rooms[roomCode]) {
      return socket.emit('room_error', 'ACCESS DENIED: Room does not exist.');
    }

    socket.join(roomCode);
    if (!rooms[roomCode]) rooms[roomCode] = [];
    if (!roomSettings[roomCode]) {
      roomSettings[roomCode] = { teamSize: 10 };
    }
    if (!roomLogs[roomCode]) roomLogs[roomCode] = [];
    socket.emit('settings_update', roomSettings[roomCode]);
    socket.emit('chat_history', roomLogs[roomCode]);

    const isFirstPlayer = rooms[roomCode].length === 0;
    const shouldBeHost = action === 'host' || isFirstPlayer;

    if (roomCode === 'DEMO99' && rooms[roomCode].length === 2) {
      rooms['DEMO99'][0].isHost = false; 
    }

    const existingPlayer = rooms[roomCode].find(p => p.name === displayName);
    
    if (!existingPlayer) {
      rooms[roomCode].push({
        id: socket.id,
        name: displayName,
        isHost: (roomCode === 'DEMO99' && rooms[roomCode].length === 2) ? true : shouldBeHost,
        isReady: false,
        isConnected: true 
      });
      socket.to(roomCode).emit('player_joined', { user: displayName });
    } else {
      existingPlayer.id = socket.id; 
      existingPlayer.isConnected = true; 
      
      if (shouldBeHost) {
        existingPlayer.isHost = true;
      }
    }

    socket.roomCode = roomCode; 
    socket.displayName = displayName;

    if (rooms[roomCode] && rooms[roomCode].length > 0) {
      const hasHost = rooms[roomCode].some(p => p.isHost);
      if (!hasHost) {
        rooms[roomCode][0].isHost = true; 
      }
    }

    io.to(roomCode).emit('roster_update', rooms[roomCode]);
  });

  socket.on('status_update', ({ roomCode, isReady }) => {
    if (rooms[roomCode]) {
      const player = rooms[roomCode].find(p => p.id === socket.id);
      if (player && player.isReady !== isReady) {
        player.isReady = isReady;
        io.to(roomCode).emit('roster_update', rooms[roomCode]);
        io.to(roomCode).emit('player_ready_log', { 
          name: player.name, 
          isReady: isReady 
        });
      }
    }
  });

  socket.on('change_settings', ({ roomCode, teamSize }) => {
    if (rooms[roomCode] && roomSettings[roomCode]) {
      const requester = rooms[roomCode].find(p => p.id === socket.id);
      if (requester && requester.isHost) {
        roomSettings[roomCode].teamSize = teamSize;
        io.to(roomCode).emit('settings_update', roomSettings[roomCode]);
      }
    }
  });

  socket.on('send_message', (data) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: false, hour: '2-digit', minute: '2-digit' 
    });
    
    const formattedMessage = `[${timestamp}] ${data.sender}: ${data.message}`;
    
    if (roomLogs[data.roomCode]) {
      roomLogs[data.roomCode].push(formattedMessage);
    }

    io.to(data.roomCode).emit('receive_message', { text: formattedMessage });
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Agent Disconnected: ${socket.id}`);
    const room = socket.roomCode;
    const name = socket.displayName;
    
    if (room && rooms[room]) {
      const leavingPlayer = rooms[room].find(p => p.name === name);
      if (leavingPlayer) leavingPlayer.isConnected = false;
      setTimeout(() => {
        if (rooms[room]) {
          const checkPlayer = rooms[room].find(p => p.name === name);
          
          if (checkPlayer && checkPlayer.isConnected === false) {
            rooms[room] = rooms[room].filter(p => p.name !== name);
            
            io.to(room).emit('player_left', { id: socket.id, name: checkPlayer.name });

            if (checkPlayer.isHost && rooms[room].length > 0) {
              rooms[room][0].isHost = true; 
            }
          
            if (rooms[room].length === 0) {
              delete rooms[room];
              delete roomSettings[room];
            } else {
              io.to(room).emit('roster_update', rooms[room]);
            }
          }
        }
      }, 3000);
    }
  });

  socket.on('join_game_dashboard', ({ roomCode, name }) => {
    const game = activeGames[roomCode];
    if (!game) return;

    const roomPlayers = rooms[roomCode] || [];
    const player = roomPlayers.find(p => p.name === name);
    const roleData = player ? game.roles.get(player.id) : null;

    if (roleData) {
      socket.emit('role_assigned', {
        role: roleData.role,
        team: roleData.team,
        specialInfo: roleData.specialInfo
      });
    }

    socket.emit('game_state_update', buildGameState(roomCode));
  });

  socket.on('start_game', ({ roomCode }) => {
    const players = rooms[roomCode]; 

    if (!players || players.length !== 5) {
      return socket.emit('game_error', 'Needs exactly 5 players to start');
    }

    const roles = RoleAssigner.assignRoles(players);
    const questManager = new QuestManager(players);

    activeGames[roomCode] = {
      roles,
      questManager,
      phase: 'TEAM_SELECTION'
    };

    console.log(`🎮 Game started in room ${roomCode}`);

    players.forEach(player => {
      const roleData = roles.get(player.id);
      io.to(player.id).emit('role_assigned', {
        role: roleData.role,
        team: roleData.team, 
        specialInfo: roleData.specialInfo
      });
    }); 

    const questInfo = questManager.startQuest(); 
    io.to(roomCode).emit('quest_started', questInfo);
    io.to(roomCode).emit('game_state_update', buildGameState(roomCode));
    io.to(roomCode).emit('game_started');
  }); 

});

app.get('/', (req, res) => {
  res.send('Cipher.gg API is running!');
});