const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { auth } = require("../middleware/auth");

// Clear chat history (soft delete messages) - MUST BE BEFORE PARAMETERIZED ROUTES
router.delete("/:conversationId/clear", auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    console.log("🧹 DELETE request received for clear endpoint");
    console.log("Conversation ID:", conversationId);
    console.log("User ID:", userId);

    // Verify the user is part of this conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      console.log("❌ Conversation not found:", conversationId);
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (!conversation.participants.includes(userId)) {
      console.log("❌ User not authorized for this conversation");
      return res
        .status(403)
        .json({ message: "Unauthorized: Not part of this conversation" });
    }

    // Soft delete all messages in this conversation by marking them as deleted
    await Message.updateMany(
      { conversation: conversationId },
      { isDeleted: true }
    );

    console.log(`✅ Chat history cleared for conversation: ${conversationId}`);
    res.json({ success: true, message: "Chat history cleared successfully" });
  } catch (error) {
    console.error("❌ Error clearing chat history:", error);
    res.status(500).json({ message: "Error clearing chat history" });
  }
});

// Get available therapists
router.get("/therapists", auth, async (req, res) => {
  try {
    const therapists = await User.find({
      role: "therapist",
      registrationStatus: { $ne: "rejected" }, // Exclude rejected therapists
    }).select(
      "firstName lastName specialization yearsExperience bio areasOfExpertise languagesSpoken stats profilePicture"
    );

    console.log("Found therapists:", therapists.length);

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
        fullName: t.fullName,
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

    // Verify therapist exists and is not rejected
    const therapist = await User.findOne({
      _id: therapistId,
      role: "therapist",
      registrationStatus: { $ne: "rejected" }, // Exclude rejected therapists
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
      .populate("sender", "firstName lastName role")
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

    // Verify the user exists and is not rejected, and is not an admin or therapist
    const user = await User.findOne({
      _id: userId,
      role: "user", // Only allow users, not therapists or admins
      registrationStatus: { $ne: "rejected" }, // Exclude rejected users
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
      .populate("sender", "firstName lastName role")
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
        registrationStatus: { $ne: "rejected" }, // Exclude rejected users
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
      recipient = await User.findOne({
        _id: therapistId,
        role: "therapist",
        registrationStatus: { $ne: "rejected" }, // Exclude rejected therapists
      });
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
    await newMessage.populate("sender", "firstName lastName role");

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

    console.log("=== LOADING CONVERSATIONS FOR THERAPIST ===");
    console.log("Therapist ID:", therapistId);
    console.log("User role:", req.user.role);

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
      .populate({
        path: "participants",
        select:
          "firstName lastName email role profilePicture registrationStatus",
        match: { registrationStatus: { $ne: "rejected" } }, // Exclude rejected participants
      })
      .populate("lastMessage.sender", "firstName lastName")
      .sort({ "lastMessage.timestamp": -1 });

    console.log("Found conversations:", conversations.length);

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
    const conversationsWithDetails = conversations
      .map((conv) => {
        try {
          const otherParticipant = conv.getOtherParticipant(therapistId);

          // Skip if otherParticipant is null or undefined
          if (!otherParticipant) {
            console.warn(
              `No other participant found for conversation ${conv._id}`
            );
            return null;
          }

          // Skip if the other participant is an admin
          if (otherParticipant.role === "admin") {
            console.log(
              `Skipping admin participant in conversation ${conv._id}`
            );
            return null;
          }

          const unreadCount = conv.unreadCount.get(therapistId.toString()) || 0;

          // Compute display name from firstName and lastName
          let displayName = "";
          if (otherParticipant.firstName || otherParticipant.lastName) {
            displayName = `${otherParticipant.firstName || ""} ${
              otherParticipant.lastName || ""
            }`.trim();
          } else {
            displayName = otherParticipant.email || "Unknown User";
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
        } catch (err) {
          console.error(
            `Error processing conversation ${conv._id}:`,
            err.message
          );
          return null;
        }
      })
      .filter((conv) => conv !== null); // Remove null entries

    console.log(
      "Returning conversations with details:",
      conversationsWithDetails.length
    );
    res.json(conversationsWithDetails);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      message: "Error fetching conversations",
      error: error.message,
    });
  }
});

// Get conversations for users (shows therapists they've chatted with)
router.get("/my-conversations", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log("=== LOADING CONVERSATIONS FOR USER ===");
    console.log("User ID:", userId);
    console.log("User role:", req.user.role);

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
      .populate({
        path: "participants",
        select:
          "firstName lastName email role profilePicture specialization registrationStatus",
        match: { registrationStatus: { $ne: "rejected" } }, // Exclude rejected participants
      })
      .populate("lastMessage.sender", "firstName lastName")
      .sort({ "lastMessage.timestamp": -1 });

    console.log("Found conversations:", conversations.length);

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
    const conversationsWithDetails = conversations
      .map((conv) => {
        try {
          const therapist = conv.getOtherParticipant(userId);

          // Skip if therapist is null or undefined
          if (!therapist) {
            console.warn(
              `No other participant found for conversation ${conv._id}`
            );
            return null;
          }

          // Skip if the other participant is an admin
          if (therapist.role === "admin") {
            console.log(
              `Skipping admin participant in conversation ${conv._id}`
            );
            return null;
          }

          const unreadCount = conv.unreadCount.get(userId.toString()) || 0;

          // Compute display name from firstName and lastName
          let displayName = "";
          if (therapist.firstName || therapist.lastName) {
            displayName = `${therapist.firstName || ""} ${
              therapist.lastName || ""
            }`.trim();
          } else {
            displayName = therapist.email || "Unknown User";
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
        } catch (err) {
          console.error(
            `Error processing conversation ${conv._id}:`,
            err.message
          );
          return null;
        }
      })
      .filter((conv) => conv !== null); // Remove null entries

    console.log(
      "Returning user conversations with details:",
      conversationsWithDetails.length
    );
    res.json(conversationsWithDetails);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      message: "Error fetching conversations",
      error: error.message,
    });
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
