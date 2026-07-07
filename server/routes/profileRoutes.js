const express = require("express");
const { getAuth, clerkClient } = require("@clerk/express");
const User = require("../models/User");
const Match = require("../models/Match");

const router = express.Router();

const sanitizeUsername = (value = "") =>
  String(value)
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .slice(0, 15);

router.get("/me", async (req, res) => {
  try {
    const { isAuthenticated, userId } = getAuth(req);

    if (!isAuthenticated || !userId) {
      return res.status(401).json({ error: "User not authenticated." });
    }

    const clerkUser = await clerkClient.users.getUser(userId);

    const rawUsername =
      clerkUser.firstName ||
      clerkUser.username ||
      clerkUser.fullName ||
      clerkUser.emailAddresses?.[0]?.emailAddress ||
      "New Agent";

    const username = sanitizeUsername(rawUsername) || "New Agent";

    const user = await User.findOneAndUpdate(
      { clerkId: userId },
      {
        $setOnInsert: {
          clerkId: userId,
          username,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    const matchesPlayed = user.stats?.matchesPlayed ?? 0;
    const winsAsGood = user.stats?.winsAsGood ?? 0;
    const winsAsEvil = user.stats?.winsAsEvil ?? 0;
    const totalWins = winsAsGood + winsAsEvil;
    const successfulAssassinations =
      user.stats?.successfulAssassinations ?? 0;

    const winRate =
      matchesPlayed > 0 ? Math.round((totalWins / matchesPlayed) * 100) : 0;

    const recentMatches = await Match.find({
      "players.clerkId": userId,
    })
      .sort({ createdAt: -1 })
      .limit(5);

    return res.json({
      user: {
        clerkId: user.clerkId,
        username: user.username,
        stats: {
          matchesPlayed,
          winsAsGood,
          winsAsEvil,
          totalWins,
          winRate,
          successfulAssassinations,
        },
      },
      recentMatches,
    });
  } catch (error) {
    console.error("Profile route error:", error);
    return res.status(500).json({ error: "Failed to load profile." });
  }
});

module.exports = router;