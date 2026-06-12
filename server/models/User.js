const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  clerkId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    maxLength: 15 
  },
  stats: {
    matchesPlayed: { type: Number, default: 0 },
    winsAsGood: { type: Number, default: 0 },
    winsAsEvil: { type: Number, default: 0 },
    successfulAssassinations: { type: Number, default: 0 }
  },
  friends: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);