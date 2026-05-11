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
    origin: "http://localhost:5173", 
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5001;

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


const roomRosters = {};

io.on("connection", (socket) => {
  console.log(`⚡ Agent Connected: ${socket.id}`);
  
  let currentRoom = null;
  let currentUser = null;

  socket.on("join_room", (data) => {
    currentRoom = data.roomCode;
    currentUser = data.displayName;
    socket.join(data.roomCode);

    if (!roomRosters[data.roomCode]) {
      roomRosters[data.roomCode] = [];
    }

    const exists = roomRosters[data.roomCode].find(p => p.name === data.displayName);
    if (!exists) {
      roomRosters[data.roomCode].push({ id: socket.id, name: data.displayName });
    }

    socket.to(data.roomCode).emit("player_joined", {
      message: `${data.displayName} has entered the lobby.`,
      user: data.displayName,
      id: socket.id
    });

    socket.emit("room_roster", roomRosters[data.roomCode]);
  });

  socket.on("update_ready_status", (data) => {
   const { roomCode, isReady } = data;
  
   if (roomRosters[roomCode]) {
     const playerIndex = roomRosters[roomCode].findIndex(p => p.id === socket.id);
     if (playerIndex !== -1) {
       roomRosters[roomCode][playerIndex].isReady = isReady;
       io.in(roomCode).emit("room_roster", roomRosters[roomCode]);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Agent Disconnected: ${socket.id}`);
    if (currentRoom && roomRosters[currentRoom]) {
      roomRosters[currentRoom] = roomRosters[currentRoom].filter(p => p.id !== socket.id);
      socket.to(currentRoom).emit("player_left", { id: socket.id, name: currentUser });
    }
  });
});


app.get('/', (req, res) => {
  res.send('Cipher.gg API is running!');
});

const Player = require('./models/Player');

app.post('/api/join', async (req, res) => {
  try {
    const { displayName, roomCode } = req.body;

    const existingPlayer = await Player.findOne({ 
      displayName: displayName.trim(), 
      roomCode: roomCode.toUpperCase() 
    });

    if (existingPlayer) {
      return res.status(400).json({ error: "❌ Name is already taken in this room!" });
    }

    const newPlayer = new Player({
      displayName: displayName,
      roomCode: roomCode
    });
    await newPlayer.save();

    res.status(201).json({ 
      message: "✅ Successfully joined the lobby!", 
      player: newPlayer 
    });

  } catch (error) {
    console.error("❌ Error joining game:", error.message);
    res.status(500).json({ error: error.message });
  }
});