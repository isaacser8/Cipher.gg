const express = require("express");
const User = require("../models/User");
const Match = require("../models/Match");

const router = express.Router();

router.get("/:clerkId", async (req, res) => {
  try {
    const { clerkId } = req.params;

    if (!clerkId) {
      return res.status(400).json({ error: "Missing Clerk ID." });
    }

    let user = await User.findOne({ clerkId });

    if (!user) {
      user = await User.create({
        clerkId,
        username: req.query.username || "New Agent",
      });
    }

    const matchesPlayed = user.stats?.matchesPlayed ?? 0;
    const winsAsGood = user.stats?.winsAsGood ?? 0;
    const winsAsEvil = user.stats?.winsAsEvil ?? 0;
    const totalWins = winsAsGood + winsAsEvil;
    const successfulAssassinations = user.stats?.successfulAssassinations ?? 0;

    const winRate =
      matchesPlayed > 0 ? Math.round((totalWins / matchesPlayed) * 100) : 0;

    const assassinationRate =
      winsAsEvil > 0
        ? Math.round((successfulAssassinations / winsAsEvil) * 100)
        : 0;

    const recentMatches = await Match.find({
      "players.userId": user._id,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("roomCode winner winReason questHistory players createdAt");

    return res.json({
      profile: {
        id: user._id,
        clerkId: user.clerkId,
        username: user.username,
        stats: {
          matchesPlayed,
          winsAsGood,
          winsAsEvil,
          totalWins,
          successfulAssassinations,
          winRate,
          assassinationRate,
        },
        recentMatches,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching profile:", err);
    return res.status(500).json({ error: "Failed to fetch profile." });
  }
});

module.exports = router;