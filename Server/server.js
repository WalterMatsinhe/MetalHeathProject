const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const User = require("./models/User");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(cookieParser());

// Serve static files from client directory
app.use(express.static(path.join(__dirname, "../client")));

// Serve index.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// Serve assets folder for images and other static files
app.use("/assets", express.static(path.join(__dirname, "../assets")));

// Store connectedUsers in app for routes to access
app.set("connectedUsers", new Map());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", require("./routes/profile"));
app.use("/api/chat", require("./routes/chat"));
app.use("/api/admin", require("./routes/admin"));

console.log("✅ All routes registered:");
console.log("  - /api/auth");
console.log("  - /api/profile");
console.log("  - /api/chat");
console.log("  - /api/admin");

// Import models for Socket.IO usage
const Conversation = require("./models/Conversation");
const Message = require("./models/Message");

// JWT Middleware
const { auth, therapist } = require("./middleware/auth");

// Add direct route for therapists (delegates to chat route)
app.get("/api/therapists", auth, async (req, res) => {
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

// Protected route for any authenticated user
app.get("/api/user/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      _id: user._id,
      id: user._id, // Include both _id and id for compatibility
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture || "",
      specialization: user.specialization,
      yearsExperience: user.yearsExperience,
      bio: user.bio,
    });
  } catch (err) {
    console.error("Error in /api/user/profile:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Protected route for therapist only
app.get("/api/therapist/dashboard", auth, therapist, (req, res) => {
  res.json({ message: `Welcome, therapist ${req.user.id}!`, user: req.user });
});

// Test endpoint to check server status and JWT secret
app.get("/api/test", (req, res) => {
  res.json({
    message: "Server is running",
    hasJwtSecret: !!process.env.JWT_SECRET,
    timestamp: new Date().toISOString(),
  });
});

// Test endpoint to check authentication
app.get("/api/test-auth", auth, (req, res) => {
  res.json({
    message: "Authentication working",
    user: req.user,
    timestamp: new Date().toISOString(),
  });
});

// Debug endpoint to check connected users
app.get("/api/debug/connected-users", (req, res) => {
  const appConnectedUsers = app.get("connectedUsers") || new Map();
  const users = [];
  for (const [socketId, user] of appConnectedUsers.entries()) {
    users.push({
      socketId,
      userId: user.userId,
      userType: user.userType,
      userName: user.userName,
    });
  }
  res.json({
    totalConnected: appConnectedUsers.size,
    users,
    timestamp: new Date().toISOString(),
  });
});

// WebRTC Signaling Server
const connectedUsers = new Map(); // Store connected users
const therapistUsers = new Map(); // Store therapist users
const activeRooms = new Map(); // Store active video call rooms

// Function to get online user IDs
function getOnlineUserIds() {
  const onlineIds = new Set();
  for (const [socketId, user] of connectedUsers.entries()) {
    if (user.userId) {
      onlineIds.add(user.userId.toString());
    }
  }
  return onlineIds;
}

// Function to check if user is online
function isUserOnline(userId) {
  const onlineIds = getOnlineUserIds();
  return onlineIds.has(userId.toString());
}

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User registration
  socket.on("register", (data) => {
    console.log("=== REGISTER EVENT RECEIVED ===");
    console.log("Data:", JSON.stringify(data, null, 2));
    console.log("Socket ID:", socket.id);

    const { userId, userType, userName } = data;

    if (!userId || !userType || !userName) {
      console.error("❌ ERROR: Missing required registration data");
      console.error("userId:", userId);
      console.error("userType:", userType);
      console.error("userName:", userName);
      return;
    }

    const userInfo = {
      userId,
      userType,
      userName,
      socketId: socket.id,
      isAvailable: userType === "therapist" ? false : true,
    };

    connectedUsers.set(socket.id, userInfo);

    // Also update the app-level connectedUsers
    const appConnectedUsers = app.get("connectedUsers");
    appConnectedUsers.set(socket.id, userInfo);
    app.set("connectedUsers", appConnectedUsers);

    if (userType === "therapist") {
      therapistUsers.set(socket.id, {
        userId,
        userName,
        socketId: socket.id,
        isAvailable: false,
      });
    }

    console.log(`✅ ${userType} registered: ${userName} (${socket.id})`);
    console.log("Total connected users:", connectedUsers.size);

    // Broadcast therapist availability to all users
    if (userType === "therapist") {
      io.emit("therapist-availability-update", getTherapistAvailability());
    }

    console.log("=== REGISTER COMPLETE ===");
  });

  // Handle chat room joining
  socket.on("join-chat", (data) => {
    const { room, userId, therapistId } = data;
    const user = connectedUsers.get(socket.id);

    if (user && room) {
      socket.join(room);
      console.log(
        `${user.userName} (${user.userType}) joined chat room: ${room}`
      );

      // Notify the room that someone joined
      socket.to(room).emit("user-joined-chat", {
        userId: user.userId,
        userName: user.userName,
        userType: user.userType,
      });
    }
  });

  // Therapist availability toggle
  socket.on("toggle-therapist-availability", (isAvailable) => {
    const user = connectedUsers.get(socket.id);
    if (user && user.userType === "therapist") {
      user.isAvailable = isAvailable;
      const therapist = therapistUsers.get(socket.id);
      if (therapist) {
        therapist.isAvailable = isAvailable;
      }

      console.log(
        `Therapist ${user.userName} is now ${
          isAvailable ? "available" : "unavailable"
        }`
      );

      // Broadcast to all users
      io.emit("therapist-availability-update", getTherapistAvailability());
    }
  });

  // Call request from user to therapist
  socket.on("request-call", (data) => {
    const { userName } = data;
    const user = connectedUsers.get(socket.id);

    if (user) {
      // Find available therapist
      const availableTherapist = findAvailableTherapist();

      if (availableTherapist) {
        const roomId = generateRoomId();

        // Create room
        activeRooms.set(roomId, {
          user: { socketId: socket.id, userName: user.userName },
          therapist: {
            socketId: availableTherapist.socketId,
            userName: availableTherapist.userName,
          },
          startTime: Date.now(),
        });

        // Join both users to the room
        socket.join(roomId);
        io.sockets.sockets.get(availableTherapist.socketId)?.join(roomId);

        // Notify therapist of incoming call
        io.to(availableTherapist.socketId).emit("incoming-call", {
          roomId,
          userName: user.userName,
          userId: user.userId,
        });

        // Notify user that call is being connected
        socket.emit("call-connecting", {
          roomId,
          therapistName: availableTherapist.userName,
        });

        console.log(
          `Call request from ${user.userName} to therapist ${availableTherapist.userName}, room: ${roomId}`
        );
      } else {
        socket.emit("no-therapist-available");
      }
    }
  });

  // Therapist accepts call
  socket.on("accept-call", (data) => {
    const { roomId } = data;
    const room = activeRooms.get(roomId);

    if (room) {
      // Notify user that therapist accepted
      io.to(room.user.socketId).emit("call-accepted", { roomId });
      console.log(`Therapist accepted call in room ${roomId}`);
    }
  });

  // WebRTC Signaling Events
  socket.on("offer", (data) => {
    const { roomId, offer } = data;
    socket.to(roomId).emit("offer", { offer, from: socket.id });
    console.log(`Offer sent in room ${roomId}`);
  });

  socket.on("answer", (data) => {
    const { roomId, answer } = data;
    socket.to(roomId).emit("answer", { answer, from: socket.id });
    console.log(`Answer sent in room ${roomId}`);
  });

  socket.on("ice-candidate", (data) => {
    const { roomId, candidate } = data;
    socket.to(roomId).emit("ice-candidate", { candidate, from: socket.id });
    console.log(`ICE candidate sent in room ${roomId}`);
  });

  // End call
  socket.on("end-call", (data) => {
    const { roomId } = data;
    const room = activeRooms.get(roomId);

    if (room) {
      // Notify both users
      io.to(roomId).emit("call-ended");

      // Clean up room
      activeRooms.delete(roomId);
      console.log(`Call ended in room ${roomId}`);
    }
  });

  // Chat functionality
  socket.on("join-chat", async (data) => {
    try {
      const { therapistId, userId, currentUserId } = data;
      const user = connectedUsers.get(socket.id);

      if (user && therapistId && userId) {
        // Create consistent room naming: always user_therapist format
        const chatRoom = `chat_${userId}_${therapistId}`;
        socket.join(chatRoom);

        console.log(
          `${user.userName} (${user.userType}) joined chat room: ${chatRoom}`
        );

        // Notify the room that someone joined (but not the joiner themselves)
        socket.to(chatRoom).emit("user-joined-chat", {
          userId: user.userId,
          userName: user.userName,
          userType: user.userType,
          room: chatRoom,
        });

        // Send room confirmation to the user who joined
        socket.emit("chat-room-joined", {
          room: chatRoom,
          message: "Successfully joined chat room",
        });
      }
    } catch (error) {
      console.error("Error joining chat room:", error);
      socket.emit("chat-error", { message: "Failed to join chat room" });
    }
  });

  socket.on("register-therapist", (data) => {
    const { therapistId, therapistName } = data;
    // Store therapist information for this socket
    connectedUsers.set(socket.id, {
      userId: therapistId,
      userName: therapistName,
      userType: "therapist",
      socketId: socket.id,
    });
    console.log(`Therapist ${therapistName} registered with ID ${therapistId}`);
  });

  socket.on("send-message", async (data) => {
    try {
      console.log("=== RECEIVED send-message EVENT ===");
      console.log("Data received:", JSON.stringify(data, null, 2));
      console.log("Socket ID:", socket.id);

      const { to, message, therapistId, userId } = data;
      const user = connectedUsers.get(socket.id);

      console.log("User from connectedUsers:", user);
      console.log("Message content:", message);
      console.log("To:", to);
      console.log("TherapistId:", therapistId);
      console.log("UserId:", userId);

      if (!user) {
        console.error("❌ ERROR: User not found in connectedUsers!");
        console.error(
          "Available socket IDs:",
          Array.from(connectedUsers.keys())
        );
        socket.emit("message-error", {
          message: "User not registered. Please refresh the page.",
        });
        return;
      }

      if (!message || !message.trim()) {
        console.error("❌ ERROR: Message is empty or invalid");
        socket.emit("message-error", { message: "Message cannot be empty" });
        return;
      }

      // Determine recipient ID and chat room based on sender type
      let recipientId, chatRoom;

      if (user.userType === "therapist") {
        recipientId = to || userId;
        chatRoom = `chat_${recipientId}_${user.userId}`;
        console.log("→ Therapist sending message");
      } else {
        recipientId = to || therapistId;
        chatRoom = `chat_${user.userId}_${recipientId}`;
        console.log("→ User sending message");
      }

      console.log("Recipient ID:", recipientId);
      console.log("Chat room:", chatRoom);

      // Find or create conversation in database
      const conversation = await Conversation.findOrCreate(
        user.userType === "therapist" ? recipientId : user.userId,
        user.userType === "therapist" ? user.userId : recipientId
      );

      console.log("Conversation found/created:", conversation._id);

      // Create and save message to database
      const newMessage = new Message({
        conversation: conversation._id,
        sender: user.userId,
        content: message.trim(),
        messageType: "text",
        readBy: [{ user: user.userId, readAt: new Date() }],
      });

      await newMessage.save();
      await newMessage.populate("sender", "name firstName lastName role");

      console.log("Message saved to database:", newMessage._id);

      // Update conversation unread count for recipient
      await conversation.incrementUnreadCount(recipientId);

      // Prepare message data for real-time broadcast
      const messageData = {
        id: newMessage._id,
        from: user.userId,
        fromName: user.userName,
        message: message.trim(),
        timestamp: newMessage.createdAt.toISOString(),
        sender: user.userType,
        messageType: "text",
        conversationId: conversation._id,
      };

      // Send message to the chat room (includes sender and recipient if online)
      io.to(chatRoom).emit("message", messageData);

      console.log(
        `✅ Message sent in chat room ${chatRoom} from ${user.userType} ${
          user.userName
        }: ${message.trim()}`
      );

      // Send delivery confirmation to sender
      socket.emit("message-sent", {
        success: true,
        message: newMessage,
        conversationId: conversation._id,
      });

      console.log("=== send-message EVENT COMPLETE ===");
    } catch (error) {
      console.error("❌ ERROR in send-message:", error);
      console.error("Error stack:", error.stack);
      socket.emit("message-error", {
        message: `Failed to send message: ${error.message}`,
      });
    }
  });

  socket.on("typing", (data) => {
    const { to, therapistId, userId } = data;
    const user = connectedUsers.get(socket.id);

    if (user) {
      let chatRoom;
      if (user.userType === "therapist") {
        const recipientId = to || userId;
        chatRoom = `chat_${recipientId}_${user.userId}`;
      } else {
        const recipientId = to || therapistId;
        chatRoom = `chat_${user.userId}_${recipientId}`;
      }

      socket.to(chatRoom).emit("typing", {
        from: user.userId,
        userName: user.userName,
        userType: user.userType,
      });
    }
  });

  socket.on("stop-typing", (data) => {
    const { to, therapistId, userId } = data;
    const user = connectedUsers.get(socket.id);

    if (user) {
      let chatRoom;
      if (user.userType === "therapist") {
        const recipientId = to || userId;
        chatRoom = `chat_${recipientId}_${user.userId}`;
      } else {
        const recipientId = to || therapistId;
        chatRoom = `chat_${user.userId}_${recipientId}`;
      }

      socket.to(chatRoom).emit("stop-typing", {
        from: user.userId,
        userType: user.userType,
      });
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);

    const user = connectedUsers.get(socket.id);
    if (user) {
      console.log(`Cleaning up user: ${user.userName} (${user.userType})`);

      // Clean up active rooms
      for (const [roomId, room] of activeRooms.entries()) {
        if (
          room.user.socketId === socket.id ||
          room.therapist.socketId === socket.id
        ) {
          io.to(roomId).emit("call-ended");
          activeRooms.delete(roomId);
          console.log(`Cleaned up room ${roomId} due to disconnect`);
        }
      }

      // Remove from connected users (both local and app-level)
      connectedUsers.delete(socket.id);

      // Also remove from app-level connectedUsers
      const appConnectedUsers = app.get("connectedUsers");
      appConnectedUsers.delete(socket.id);
      app.set("connectedUsers", appConnectedUsers);

      if (user.userType === "therapist") {
        therapistUsers.delete(socket.id);
        // Broadcast updated therapist availability
        io.emit("therapist-availability-update", getTherapistAvailability());

        // Broadcast status change to all clients
        io.emit("user-status-changed", {
          userId: user.userId,
          status: "offline",
          userType: user.userType,
        });
      } else {
        // Broadcast user status change
        io.emit("user-status-changed", {
          userId: user.userId,
          status: "offline",
          userType: user.userType,
        });
      }

      console.log(
        `✅ User ${user.userName} cleaned up. Remaining users: ${connectedUsers.size}`
      );
    }
  });
});

// Helper functions
function getTherapistAvailability() {
  const availableTherapists = Array.from(therapistUsers.values()).filter(
    (therapist) => therapist.isAvailable
  );
  return {
    hasAvailableTherapists: availableTherapists.length > 0,
    availableCount: availableTherapists.length,
    totalTherapists: therapistUsers.size,
  };
}

function findAvailableTherapist() {
  for (const therapist of therapistUsers.values()) {
    if (therapist.isAvailable) {
      return therapist;
    }
  }
  return null;
}

function generateRoomId() {
  return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/mern-auth";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    server.listen(PORT, () => {
      console.log(`MongoDB connected`);
      console.log(`Server running on port http://localhost:${PORT}`);
      console.log(`Socket.IO server ready for WebRTC signaling`);
    });
  })
  .catch((error) => {
    console.log("MongoDB Atlas connection failed, trying local MongoDB...");
    // Try local MongoDB as fallback
    mongoose
      .connect("mongodb://localhost:27017/mern-auth")
      .then(() => {
        server.listen(PORT, () => {
          console.log(`MongoDB connected (local)`);
          console.log(`Server running on port http://localhost:${PORT}`);
          console.log(`Socket.IO server ready for WebRTC signaling`);
        });
      })
      .catch((localError) => {
        console.log("Both Atlas and local MongoDB connections failed:");
        console.log("Atlas error:", error);
        console.log("Local error:", localError);
      });
  });
