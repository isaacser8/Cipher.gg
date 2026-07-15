const express = require("express");
const { getAuth } = require("@clerk/express");
const User = require("../models/User");
const Friendship = require("../models/Friendship");

const router = express.Router();
const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function getCurrentUser(req, res) {
  const { isAuthenticated, userId } = getAuth(req);

  if (!isAuthenticated || !userId) {
    res.status(401).json({ error: "User not authenticated." });
    return null;
  }

  const user = await User.findOne({ clerkId: userId });

  if (!user) {
    res.status(404).json({ error: "User profile not found." });
    return null;
  }

  return user;
}

router.get("/search", async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req, res);
    if (!currentUser) return;

    const query = String(req.query.username || "").trim();

    if (!query) {
      return res.json({ users: [] });
    }

    const users = await User.find({
      _id: { $ne: currentUser._id },
      username: { $regex: escapeRegex(query), $options: "i" },
    })
      .limit(10)
      .select("_id username stats");

    return res.json({
      users: users.map((user) => ({
        id: user._id.toString(),
        username: user.username,
        stats: user.stats,
      })),
    });
  } catch (error) {
    console.error("Friend search error:", error);
    return res.status(500).json({ error: "Failed to search users." });
  }
});

router.post("/request", async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req, res);
    if (!currentUser) return;

    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ error: "Recipient is required." });
    }

    if (currentUser._id.toString() === recipientId) {
      return res.status(400).json({ error: "Cannot add yourself as a friend." });
    }

    const recipient = await User.findById(recipientId);

    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found." });
    }

    const existing = await Friendship.findOne({
      $or: [
        { requester: currentUser._id, recipient: recipientId },
        { requester: recipientId, recipient: currentUser._id },
      ],
    });

    if (existing?.status === "accepted") {
      return res.status(409).json({ error: "You are already friends." });
    }

    if (existing?.status === "pending") {
      return res.status(409).json({ error: "Friend request already pending." });
    }

    if (existing?.status === "declined") {
      existing.requester = currentUser._id;
      existing.recipient = recipientId;
      existing.status = "pending";

      await existing.save();

      return res.status(200).json({
        friendship: {
          id: existing._id.toString(),
          requester: existing.requester.toString(),
          recipient: existing.recipient.toString(),
          status: existing.status,
        },
      });
    }

    const friendship = await Friendship.create({
      requester: currentUser._id,
      recipient: recipientId,
      status: "pending",
    });

    return res.status(201).json({
      friendship: {
        id: friendship._id.toString(),
        requester: friendship.requester.toString(),
        recipient: friendship.recipient.toString(),
        status: friendship.status,
      },
    });
  } catch (error) {
    console.error("Friend request error:", error);
    return res.status(500).json({ error: "Failed to send friend request." });
  }
});

router.get("/requests", async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req, res);
    if (!currentUser) return;

    const incoming = await Friendship.find({
      recipient: currentUser._id,
      status: "pending",
    })
      .populate("requester", "username stats")
      .sort({ createdAt: -1 });

    return res.json({
      requests: incoming.map((request) => ({
        friendshipId: request._id.toString(),
        requester: {
          id: request.requester._id.toString(),
          username: request.requester.username,
          stats: request.requester.stats,
        },
        createdAt: request.createdAt,
      })),
    });
  } catch (error) {
    console.error("Friend requests error:", error);
    return res.status(500).json({ error: "Failed to load friend requests." });
  }
});

router.post("/accept", async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req, res);
    if (!currentUser) return;

    const { friendshipId } = req.body;

    const friendship = await Friendship.findOneAndUpdate(
      {
        _id: friendshipId,
        recipient: currentUser._id,
        status: "pending",
      },
      { status: "accepted" },
      { new: true },
    );

    if (!friendship) {
      return res.status(404).json({ error: "Friend request not found." });
    }

    return res.json({
      friendship: {
        id: friendship._id.toString(),
        status: friendship.status,
      },
    });
  } catch (error) {
    console.error("Accept friend request error:", error);
    return res.status(500).json({ error: "Failed to accept friend request." });
  }
});

router.post("/decline", async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req, res);
    if (!currentUser) return;

    const { friendshipId } = req.body;

    const friendship = await Friendship.findOneAndUpdate(
      {
        _id: friendshipId,
        recipient: currentUser._id,
        status: "pending",
      },
      { status: "declined" },
      { new: true },
    );

    if (!friendship) {
      return res.status(404).json({ error: "Friend request not found." });
    }

    return res.json({
      friendship: {
        id: friendship._id.toString(),
        status: friendship.status,
      },
    });
  } catch (error) {
    console.error("Decline friend request error:", error);
    return res.status(500).json({ error: "Failed to decline friend request." });
  }
});

router.get("/", async (req, res) => {
  try {
    const currentUser = await getCurrentUser(req, res);
    if (!currentUser) return;

    const friendships = await Friendship.find({
      status: "accepted",
      $or: [
        { requester: currentUser._id },
        { recipient: currentUser._id },
      ],
    })
      .populate("requester", "username stats")
      .populate("recipient", "username stats")
      .sort({ updatedAt: -1 });

    const friends = friendships.map((friendship) => {
      const requester = friendship.requester;
      const recipient = friendship.recipient;

      const friend =
        requester._id.toString() === currentUser._id.toString()
          ? recipient
          : requester;

      return {
        friendshipId: friendship._id.toString(),
        id: friend._id.toString(),
        username: friend.username,
        stats: friend.stats,
      };
    });

    return res.json({ friends });
  } catch (error) {
    console.error("List friends error:", error);
    return res.status(500).json({ error: "Failed to load friends." });
  }
});

module.exports = router;