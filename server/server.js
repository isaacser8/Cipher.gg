require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB Atlas (CipherGG-DB)');
    // Only start the server if the database connects!
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Error connecting to MongoDB:', error.message);
  });

// Test route
app.get('/', (req, res) => {
  res.send('Cipher.gg API is running!');

});
// Player sign up
// Import player schema
const Player = require('./models/Player');

app.post('/api/join', async (req, res) => {
  try {
    // Extract front end data
    const { displayName, roomCode } = req.body;

    // Room check for existing name
    const existingPlayer = await Player.findOne({ 
      displayName: displayName.trim(), 
      roomCode: roomCode.toUpperCase() 
    });

    if (existingPlayer) {
      return res.status(400).json({ error: "Name is already taken in this room!" });
    }

    // Create new player
    const newPlayer = new Player({
      displayName: displayName,
      roomCode: roomCode
    });
    await newPlayer.save();

    // Push success message
    res.status(201).json({ 
      message: "Successfully joined the lobby!", 
      player: newPlayer 
    });

  } catch (error) {
    console.error("❌ Error joining game:", error.message);
    res.status(500).json({ error: error.message });
  }

});

