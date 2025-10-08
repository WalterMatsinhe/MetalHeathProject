const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { auth } = require("../middleware/auth");

// Get available therapists
router.get("/therapists", auth, async (req, res) => {
  try {
    const therapists = await User.find({
      role: "therapist",
    }).select(
      "name firstName lastName specialization yearsExperience bio areasOfExpertise languagesSpoken stats"
    );

    // Add online status (in a real app, this would come from a session store)
    const therapistsWithStatus = therapists.map((therapist) => ({
      ...therapist.toObject(),
      status:
        Math.random() > 0.3
          ? "online"
          : Math.random() > 0.5
          ? "away"
          : "offline",
    }));

    res.json(therapistsWithStatus);
  } catch (error) {
    console.error("Error fetching therapists:", error);
    res.status(500).json({ message: "Error fetching therapists" });
  }
});

// Get chat history with a specific therapist (for users)
router.get("/history/:therapistId", auth, async (req, res) => {
  try {
    const { therapistId } = req.params;
    const userId = req.user.id;

    // In a real app, you would have a Chat/Message model
    // For now, return empty history
    res.json([]);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ message: "Error fetching chat history" });
  }
});

// Get chat history with a specific user (for therapists)
router.get("/history/user/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const therapistId = req.user.id;

    // Verify the current user is a therapist
    if (req.user.role !== "therapist") {
      return res
        .status(403)
        .json({ message: "Access denied: Therapists only" });
    }

    // Verify the user exists
    const user = await User.findOne({
      _id: userId,
      role: { $ne: "therapist" },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // In a real app, you would have a Chat/Message model
    // For now, return empty history
    res.json([]);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ message: "Error fetching chat history" });
  }
});

// Send a message (works for both users -> therapists and therapists -> users)
router.post("/send", auth, async (req, res) => {
  try {
    const { therapistId, userId, message } = req.body;
    const senderId = req.user.id;
    const senderRole = req.user.role;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    let recipientId;
    let recipient;

    // Determine recipient based on sender role and provided IDs
    if (senderRole === "therapist") {
      // Therapist sending to user
      if (!userId) {
        return res
          .status(400)
          .json({
            message: "User ID is required when therapist sends message",
          });
      }
      recipientId = userId;
      recipient = await User.findOne({
        _id: userId,
        role: { $ne: "therapist" },
      });
      if (!recipient) {
        return res.status(404).json({ message: "User not found" });
      }
    } else {
      // User sending to therapist
      if (!therapistId) {
        return res
          .status(400)
          .json({
            message: "Therapist ID is required when user sends message",
          });
      }
      recipientId = therapistId;
      recipient = await User.findOne({ _id: therapistId, role: "therapist" });
      if (!recipient) {
        return res.status(404).json({ message: "Therapist not found" });
      }
    }

    // In a real app, you would save the message to a database
    // For now, just return success
    res.json({
      success: true,
      message: "Message sent successfully",
      timestamp: new Date().toISOString(),
      sender: {
        id: senderId,
        role: senderRole,
      },
      recipient: {
        id: recipientId,
        role: recipient.role,
      },
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Error sending message" });
  }
});

// Get active conversations for therapists
router.get("/conversations", auth, async (req, res) => {
  try {
    const therapistId = req.user.id;

    // Fetch real users from the database (excluding therapists and admins)
    const users = await User.find({
      role: { $ne: "therapist" },
      _id: { $ne: therapistId },
    }).select("name firstName lastName email _id");

    // Transform users into conversation format
    const conversations = users.map((user) => ({
      id: user._id.toString(),
      name:
        user.name ||
        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        user.email,
      status: Math.random() > 0.5 ? "online" : "offline", // Random status for demo
      lastMessage: "Start a conversation...",
      lastSeen: new Date(Date.now() - Math.random() * 3600000).toISOString(), // Random last seen within last hour
      unreadCount: Math.floor(Math.random() * 3), // Random unread count 0-2
    }));

    res.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Error fetching conversations" });
  }
});

module.exports = router;
