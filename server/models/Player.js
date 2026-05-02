const mongoose = require('mongoose');

// rules for a Player
const playerSchema = new mongoose.Schema({
  displayName: {
    type: String,
    required: true, // server will reject if no name
    trim: true,     
  },
  roomCode: {
    type: String,
    required: true,
    uppercase: true, 
    maxLength: 6     
  },
  isHost: {
    type: Boolean,
    default: false   // first person in the room will eventually be set to true
  }
}, { 
  timestamps: true   // create timestamps for players
});

// export
module.exports = mongoose.model('Player', playerSchema);