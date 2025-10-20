const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { auth } = require("../middleware/auth");

// Get available therapists
router.get("/therapists", auth, async (req, res) => {
  try {
    const therapists = await User.find({
      role: "therapist",
    }).select(
      "name firstName lastName specialization yearsExperience bio areasOfExpertise languagesSpoken stats profilePicture"
    );

    console.log("Found therapists:", therapists.length);
    therapists.forEach((t) => {
      console.log(
        `Therapist: ${t.name}, firstName: ${t.firstName}, lastName: ${t.lastName}`
      );
    });

    // Get online users from Socket.IO (passed via req.app.locals if needed)
    // For now, we'll use a simple check - in production, this would query Redis or similar
    const io = req.app.get("io");
    const connectedUsers = req.app.get("connectedUsers") || new Map();

    // Helper function to check if therapist is online
    const isOnline = (therapistId) => {
      for (const [socketId, user] of connectedUsers.entries()) {
        if (user.userId && user.userId.toString() === therapistId.toString()) {
          return true;
        }
      }
      return false;
    };

    // Add online status and ensure proper name display
    const therapistsWithStatus = therapists.map((therapist) => {
      const therapistObj = therapist.toObject();

      // ALWAYS use firstName/lastName if available, ignore the old name field
      if (therapistObj.firstName || therapistObj.lastName) {
        therapistObj.name = `${therapistObj.firstName || ""} ${
          therapistObj.lastName || ""
        }`.trim();
        console.log(
          `Updated name from "${therapist.name}" to "${therapistObj.name}"`
        );
      }

      return {
        ...therapistObj,
        status: isOnline(therapist._id) ? "online" : "offline",
        isOnline: isOnline(therapist._id),
      };
    });

    console.log(
      "Returning therapists with status:",
      therapistsWithStatus.map((t) => ({
        id: t._id,
        name: t.name,
        status: t.status,
      }))
    );
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verify therapist exists
    const therapist = await User.findOne({
      _id: therapistId,
      role: "therapist",
    });
    if (!therapist) {
      return res.status(404).json({ message: "Therapist not found" });
    }

    // Find or create conversation
    const conversation = await Conversation.findOrCreate(userId, therapistId);

    // Get messages for this conversation
    const messages = await Message.find({
      conversation: conversation._id,
      isDeleted: false,
    })
      .populate("sender", "name firstName lastName role")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    // Mark messages as read by current user
    await Message.markAsRead(conversation._id, userId);
    await conversation.resetUnreadCount(userId);

    // Get total count for pagination
    const totalMessages = await Message.countDocuments({
      conversation: conversation._id,
      isDeleted: false,
    });

    res.json({
      messages: messages.reverse(), // Return in chronological order
      conversation: {
        id: conversation._id,
        participants: conversation.participants,
        lastMessage: conversation.lastMessage,
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
        totalMessages,
        hasMore: skip + messages.length < totalMessages,
      },
    });
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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

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

    // Find or create conversation
    const conversation = await Conversation.findOrCreate(userId, therapistId);

    // Get messages for this conversation
    const messages = await Message.find({
      conversation: conversation._id,
      isDeleted: false,
    })
      .populate("sender", "name firstName lastName role")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    // Mark messages as read by current therapist
    await Message.markAsRead(conversation._id, therapistId);
    await conversation.resetUnreadCount(therapistId);

    // Get total count for pagination
    const totalMessages = await Message.countDocuments({
      conversation: conversation._id,
      isDeleted: false,
    });

    res.json({
      messages: messages.reverse(), // Return in chronological order
      conversation: {
        id: conversation._id,
        participants: conversation.participants,
        lastMessage: conversation.lastMessage,
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
        totalMessages,
        hasMore: skip + messages.length < totalMessages,
      },
    });
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

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message content is required" });
    }

    let recipientId;
    let recipient;

    // Determine recipient based on sender role and provided IDs
    if (senderRole === "therapist") {
      // Therapist sending to user
      if (!userId) {
        return res.status(400).json({
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
        return res.status(400).json({
          message: "Therapist ID is required when user sends message",
        });
      }
      recipientId = therapistId;
      recipient = await User.findOne({ _id: therapistId, role: "therapist" });
      if (!recipient) {
        return res.status(404).json({ message: "Therapist not found" });
      }
    }

    // Find or create conversation
    const conversation = await Conversation.findOrCreate(
      senderRole === "therapist" ? userId : senderId,
      senderRole === "therapist" ? senderId : therapistId
    );

    // Create the message
    const newMessage = new Message({
      conversation: conversation._id,
      sender: senderId,
      content: message.trim(),
      messageType: "text",
      readBy: [{ user: senderId, readAt: new Date() }], // Sender has read their own message
    });

    await newMessage.save();

    // Update conversation's unread count for recipient
    await conversation.incrementUnreadCount(recipientId);

    // Populate sender info for response
    await newMessage.populate("sender", "name firstName lastName role");

    res.json({
      success: true,
      message: newMessage,
      conversation: {
        id: conversation._id,
        participants: conversation.participants,
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

    if (req.user.role !== "therapist") {
      return res
        .status(403)
        .json({ message: "Access denied: Therapists only" });
    }

    // Find all conversations where this therapist is a participant
    const conversations = await Conversation.find({
      participants: therapistId,
      isActive: true,
    })
      .populate(
        "participants",
        "name firstName lastName email role profilePicture"
      )
      .populate("lastMessage.sender", "name firstName lastName")
      .sort({ "lastMessage.timestamp": -1 });

    // Get connected users for online status
    const connectedUsers = req.app.get("connectedUsers") || new Map();

    // Helper function to check if user is online
    const isOnline = (userId) => {
      for (const [socketId, user] of connectedUsers.entries()) {
        if (user.userId && user.userId.toString() === userId.toString()) {
          return true;
        }
      }
      return false;
    };

    // Transform conversations for frontend
    const conversationsWithDetails = conversations.map((conv) => {
      const otherParticipant = conv.getOtherParticipant(therapistId);
      const unreadCount = conv.unreadCount.get(therapistId.toString()) || 0;

      // ALWAYS prioritize firstName/lastName over old name field
      let displayName = "";
      if (otherParticipant.firstName || otherParticipant.lastName) {
        displayName = `${otherParticipant.firstName || ""} ${
          otherParticipant.lastName || ""
        }`.trim();
      } else if (otherParticipant.name) {
        displayName = otherParticipant.name;
      } else {
        displayName = otherParticipant.email;
      }

      // Check if user is online
      const userOnline = isOnline(otherParticipant._id);

      return {
        id: conv._id,
        userId: otherParticipant._id,
        name: displayName,
        email: otherParticipant.email,
        profilePicture: otherParticipant.profilePicture,
        status: userOnline ? "online" : "offline",
        isOnline: userOnline,
        lastMessage: conv.lastMessage.content || "No messages yet",
        lastMessageTime: conv.lastMessage.timestamp,
        unreadCount,
        lastSeen: conv.updatedAt,
      };
    });

    res.json(conversationsWithDetails);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Error fetching conversations" });
  }
});

// Get conversations for users (shows therapists they've chatted with)
router.get("/my-conversations", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    if (req.user.role === "therapist") {
      return res
        .status(403)
        .json({ message: "Use /conversations endpoint for therapists" });
    }

    // Find all conversations where this user is a participant
    const conversations = await Conversation.find({
      participants: userId,
      isActive: true,
    })
      .populate(
        "participants",
        "name firstName lastName email role profilePicture specialization"
      )
      .populate("lastMessage.sender", "name firstName lastName")
      .sort({ "lastMessage.timestamp": -1 });

    // Get connected users for online status
    const connectedUsers = req.app.get("connectedUsers") || new Map();

    // Helper function to check if user is online
    const isOnline = (userId) => {
      for (const [socketId, user] of connectedUsers.entries()) {
        if (user.userId && user.userId.toString() === userId.toString()) {
          return true;
        }
      }
      return false;
    };

    // Transform conversations for frontend
    const conversationsWithDetails = conversations.map((conv) => {
      const therapist = conv.getOtherParticipant(userId);
      const unreadCount = conv.unreadCount.get(userId.toString()) || 0;

      // ALWAYS prioritize firstName/lastName over old name field
      let displayName = "";
      if (therapist.firstName || therapist.lastName) {
        displayName = `${therapist.firstName || ""} ${
          therapist.lastName || ""
        }`.trim();
      } else if (therapist.name) {
        displayName = therapist.name;
      } else {
        displayName = therapist.email;
      }

      // Check if therapist is online
      const therapistOnline = isOnline(therapist._id);

      return {
        id: conv._id,
        therapistId: therapist._id,
        name: displayName,
        email: therapist.email,
        profilePicture: therapist.profilePicture,
        specialization: therapist.specialization,
        status: therapistOnline ? "online" : "offline",
        isOnline: therapistOnline,
        lastMessage: conv.lastMessage.content || "No messages yet",
        lastMessageTime: conv.lastMessage.timestamp,
        unreadCount,
        lastSeen: conv.updatedAt,
      };
    });

    res.json(conversationsWithDetails);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ message: "Error fetching conversations" });
  }
});

// Mark conversation as read
router.post("/mark-read/:conversationId", auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    // Verify conversation exists and user is participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Mark all messages as read by current user
    await Message.markAsRead(conversationId, userId);
    await conversation.resetUnreadCount(userId);

    res.json({ success: true, message: "Messages marked as read" });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ message: "Error marking messages as read" });
  }
});

// Get unread message count for user
router.get("/unread-count", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await Conversation.find({
      participants: userId,
      isActive: true,
    });

    let totalUnread = 0;
    conversations.forEach((conv) => {
      totalUnread += conv.unreadCount.get(userId.toString()) || 0;
    });

    res.json({ unreadCount: totalUnread });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ message: "Error fetching unread count" });
  }
});

module.exports = router;
