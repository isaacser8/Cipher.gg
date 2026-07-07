const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true },
    winner: { type: String, enum: ["good", "evil", "abandoned"], required: true },
    winReason: { type: String },

    // Store state of the quests for the review screen
    questHistory: [
      {
        questNumber: Number,
        team: [String],
        leader: {
          id: String,
          name: String,
          isHost: Boolean,
          isReady: Boolean,
          isConnected: Boolean,
        },
        succeeded: Boolean,
        successCount: Number,
        failCount: Number,
        teamVotes: {
          type: Map,
          of: String,
        },
        teamVoteHistory: [
          {
            attemptNumber: Number,
            questNumber: Number,
            leader: {
              id: String,
              name: String,
              isHost: Boolean,
              isReady: Boolean,
              isConnected: Boolean,
            },
            proposedTeam: [String],
            votes: {
              type: Map,
              of: String,
            },
            approvals: Number,
            rejections: Number,
            approved: Boolean,
            rejected: Boolean,
          },
        ],
      },
    ],

    players: [
      {
        // If they are logged in, link to their user document
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        // If they are a guest, just save the name they typed in the lobby
        guestName: { type: String },
        role: { type: String, required: true },
        team: { type: String, enum: ["good", "evil"], required: true },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Match", matchSchema);
