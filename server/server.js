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

io.on('connection', (socket) => {
  console.log(`⚡ Agent Connected: ${socket.id}`);

  socket.on('join_room', ({ roomCode, displayName, action }) => {
    if (action !== 'host' && !rooms[roomCode]) {
      return socket.emit('room_error', 'ACCESS DENIED: Room does not exist.');
    }

    const isNameTaken = rooms[roomCode]?.some(p => p.name === displayName && p.isConnected);
    if (isNameTaken) {
      return socket.emit('room_error', 'That name is already taken in this lobby!');
    }

    socket.join(roomCode);
    if (!rooms[roomCode]) rooms[roomCode] = [];
    if (!roomSettings[roomCode]) {
      roomSettings[roomCode] = { teamSize: 10 };
    }
    socket.emit('settings_update', roomSettings[roomCode]);

    let isFirstPlayer = rooms[roomCode].length === 0;

    if (roomCode === 'DEMO99' && rooms[roomCode].length === 2) {
      isFirstPlayer = true; 
      rooms['DEMO99'][0].isHost = false; 
    }

    const existingPlayer = rooms[roomCode].find(p => p.name === displayName);
    
    if (!existingPlayer) {
      rooms[roomCode].push({
        id: socket.id,
        name: displayName,
        isHost: isFirstPlayer,
        isReady: false,
        isConnected: true 
      });
    } else {
      existingPlayer.id = socket.id; 
      existingPlayer.isConnected = true; 
    }

    socket.roomCode = roomCode; 
    socket.displayName = displayName;

    io.to(roomCode).emit('roster_update', rooms[roomCode]);
    socket.to(roomCode).emit('player_joined', { user: displayName });
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
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    io.to(data.roomCode).emit('receive_message', {
      text: `[${timestamp}] ${data.sender}: ${data.message}`,
    });
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
            
            socket.to(room).emit('player_left', { id: socket.id, name: checkPlayer.name });

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
});

app.get('/', (req, res) => {
  res.send('Cipher.gg API is running!');
});