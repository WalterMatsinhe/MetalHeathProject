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
const healthcheck = require("./healthcheck");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
    methods: ["GET", "POST"],
  },
  // ===== OPTIMIZATION: Socket.IO Performance Settings =====
  transports: ["websocket", "polling"], // WebSocket first for better performance
  compression: true, // Enable compression for payloads
  perMessageDeflate: {
    threshold: 1024, // Only compress messages over 1KB
  },
  // Reconnection settings for resilience
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  // Performance optimizations
  maxHttpBufferSize: 1e6, // 1MB max buffer
  allowEIO3: false, // Use EIO4 for better performance
  pingInterval: 25000,
  pingTimeout: 60000,
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
app.use("/api/mood", require("./routes/mood"));
app.use("/api/goals", require("./routes/goals"));
app.use("/api/reminders", require("./routes/reminders"));
app.use("/api/reports", require("./routes/reports"));

console.log("✅ All routes registered:");
console.log("  - /api/auth");
console.log("  - /api/profile");
console.log("  - /api/chat");
console.log("  - /api/admin");
console.log("  - /api/mood");
console.log("  - /api/goals");
console.log("  - /api/reminders");
console.log("  - /api/reports");

// Import models for Socket.IO usage
const Conversation = require("./models/Conversation");
const Message = require("./models/Message");

// JWT Middleware
const { auth, therapist } = require("./middleware/auth");

// Add direct route for therapists with proper online status
app.get("/api/therapists", auth, async (req, res) => {
  try {
    const therapists = await User.find({
      role: "therapist",
      registrationStatus: { $ne: "rejected" },
    }).select(
      "firstName lastName specialization yearsExperience bio areasOfExpertise languagesSpoken stats profilePicture"
    );

    // Get connected users map for accurate online status
    const connectedUsers = app.get("connectedUsers") || new Map();

    // Helper function to check if user is online
    const isOnline = (userId) => {
      for (const [socketId, user] of connectedUsers.entries()) {
        if (user.userId && user.userId.toString() === userId.toString()) {
          return true;
        }
      }
      return false;
    };

    // Add online status based on actual connections
    const therapistsWithStatus = therapists.map((therapist) => ({
      ...therapist.toObject(),
      status: isOnline(therapist._id) ? "online" : "offline",
      isOnline: isOnline(therapist._id),
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
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
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

// ===== HEALTH CHECK ENDPOINTS FOR ZERO-DOWNTIME DEPLOYMENT =====
/**
 * Liveness probe - indicates if server is alive
 * Load balancers use this to detect dead instances
 */
app.get("/health/live", (req, res) => {
  const probe = healthcheck.livenessProbe();
  const statusCode = probe.status === "alive" ? 200 : 503;
  res.status(statusCode).json(probe);
});

/**
 * Readiness probe - indicates if server is ready for traffic
 * Load balancers use this to route traffic only to ready instances
 */
app.get("/health/ready", (req, res) => {
  const probe = healthcheck.readinessProbe();
  const statusCode = probe.status === "ready" ? 200 : 503;
  res.status(statusCode).json(probe);
});

/**
 * Detailed metrics for monitoring systems
 */
app.get("/health/metrics", (req, res) => {
  res.json(healthcheck.getDetailedMetrics());
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

    // Broadcast therapist availability to ALL users (both existing and new)
    const therapistAvailability = getTherapistAvailability();
    io.emit("therapist-availability-update", therapistAvailability);
    console.log("Broadcast therapist availability:", therapistAvailability);

    console.log("=== REGISTER COMPLETE ===");
  });

  // Therapist availability toggle
  socket.on("toggle-therapist-availability", (isAvailable) => {
    const user = connectedUsers.get(socket.id);
    console.log("=== TOGGLE THERAPIST AVAILABILITY ===");
    console.log("Socket ID:", socket.id);
    console.log("Is Available:", isAvailable);
    console.log("User:", user);

    if (user && user.userType === "therapist") {
      user.isAvailable = isAvailable;
      const therapist = therapistUsers.get(socket.id);
      if (therapist) {
        therapist.isAvailable = isAvailable;
      }

      console.log(
        `✅ Therapist ${user.userName} is now ${
          isAvailable ? "available" : "unavailable"
        }`
      );
      console.log(
        "Current therapists:",
        Array.from(therapistUsers.values()).map((t) => ({
          name: t.userName,
          available: t.isAvailable,
        }))
      );

      // Broadcast to all users
      const availability = getTherapistAvailability();
      console.log("Broadcasting availability:", availability);
      io.emit("therapist-availability-update", availability);
    } else {
      console.log("❌ User not found or not a therapist");
    }
    console.log("=== END TOGGLE ===");
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

  // Chat functionality - Join chat room with consistent room naming
  socket.on("join-chat", async (data) => {
    try {
      const { therapistId, userId, currentUserId } = data;
      const user = connectedUsers.get(socket.id);

      console.log("=== JOIN-CHAT EVENT ===");
      console.log("User:", user);
      console.log("Data:", { therapistId, userId, currentUserId });

      if (!user) {
        console.error("User not found in connectedUsers");
        return;
      }

      // Create consistent room naming: always sorted IDs
      const roomId1 = (therapistId || user.userId).toString();
      const roomId2 = (userId || user.userId).toString();
      const sortedIds = [roomId1, roomId2].sort();
      const chatRoom = `chat_${sortedIds[0]}_${sortedIds[1]}`;

      socket.join(chatRoom);
      console.log(
        `✅ ${user.userName} (${user.userType}) joined room: ${chatRoom}`
      );

      // Notify others in the room
      socket.to(chatRoom).emit("user-joined-chat", {
        userId: user.userId,
        userName: user.userName,
        userType: user.userType,
        room: chatRoom,
      });

      // Confirm to joiner
      socket.emit("chat-room-joined", {
        room: chatRoom,
        message: "Successfully joined chat room",
      });

      console.log("=== JOIN-CHAT COMPLETE ===");
    } catch (error) {
      console.error("Error joining chat room:", error);
      socket.emit("chat-error", { message: "Failed to join chat room" });
    }
  });

  // send-message event handler - users and therapists send messages
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

      // Determine recipient ID and use consistent room naming (sorted IDs)
      let recipientId;

      if (user.userType === "therapist") {
        recipientId = to || userId;
        console.log("→ Therapist sending message");
      } else {
        recipientId = to || therapistId;
        console.log("→ User sending message");
      }

      const roomId1 = user.userId.toString();
      const roomId2 = recipientId.toString();
      const sortedIds = [roomId1, roomId2].sort();
      const chatRoom = `chat_${sortedIds[0]}_${sortedIds[1]}`;

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
      await newMessage.populate("sender", "firstName lastName role");

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
      const recipientId =
        to || (user.userType === "therapist" ? userId : therapistId);
      const roomId1 = user.userId.toString();
      const roomId2 = recipientId.toString();
      const sortedIds = [roomId1, roomId2].sort();
      const chatRoom = `chat_${sortedIds[0]}_${sortedIds[1]}`;

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
      const recipientId =
        to || (user.userType === "therapist" ? userId : therapistId);
      const roomId1 = user.userId.toString();
      const roomId2 = recipientId.toString();
      const sortedIds = [roomId1, roomId2].sort();
      const chatRoom = `chat_${sortedIds[0]}_${sortedIds[1]}`;

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
    (therapist) => therapist.isAvailable === true
  );
  return {
    hasAvailableTherapists: availableTherapists.length > 0,
    availableCount: availableTherapists.length,
    totalTherapists: therapistUsers.size,
    therapists: availableTherapists.map((t) => ({
      socketId: t.socketId,
      userName: t.userName,
      userId: t.userId,
    })),
  };
}

function findAvailableTherapist() {
  console.log("=== FINDING AVAILABLE THERAPIST ===");
  console.log("Total therapists:", therapistUsers.size);

  for (const [socketId, therapist] of therapistUsers.entries()) {
    console.log(
      `Therapist: ${therapist.userName}, Available: ${therapist.isAvailable}`
    );
    if (therapist.isAvailable === true) {
      console.log(`✅ Found available therapist: ${therapist.userName}`);
      return therapist;
    }
  }
  console.log("❌ No available therapist found");
  return null;
}

function generateRoomId() {
  return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/mentalhealth";

/**
 * ===== OPTIMIZED MONGODB CONNECTION WITH RETRY LOGIC =====
 * Features:
 * - Connection pooling for efficient resource usage
 * - Exponential backoff retry mechanism
 * - Graceful error handling
 * - Health check integration
 */

const mongooseOptions = {
  // Connection pooling settings
  maxPoolSize: 10, // Maximum number of connections in pool
  minPoolSize: 2, // Minimum number of connections in pool
  maxIdleTimeMS: 45000, // Close idle connections after 45s

  // Retry settings
  retryWrites: true,
  retryReads: true,

  // Connection timeout
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,

  // Application name for monitoring
  appName: "MentalHealthApp",
};

let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 5;
const BASE_RETRY_DELAY = 1000; // 1 second

/**
 * Exponential backoff retry mechanism
 */
function getRetryDelay(attempt) {
  // Formula: baseDelay * 2^attempt with max 60 seconds
  const delay = Math.min(BASE_RETRY_DELAY * Math.pow(2, attempt), 60000);
  // Add jitter (random variation) to prevent thundering herd
  const jitter = Math.random() * 1000;
  return delay + jitter;
}

/**
 * Connect to MongoDB with retry logic
 */
async function connectToDatabase() {
  return new Promise((resolve, reject) => {
    async function attemptConnection(attempt = 0) {
      try {
        console.log(
          `\n📡 Connection attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS}...`
        );

        await mongoose.connect(MONGO_URI, mongooseOptions);

        healthcheck.updateMongoStatus(true);
        console.log("✅ MongoDB connected successfully");

        // Setup connection event handlers
        mongoose.connection.on("disconnected", () => {
          console.warn(
            "⚠️  MongoDB connection lost. Attempting to reconnect..."
          );
          healthcheck.updateMongoStatus(false);
        });

        mongoose.connection.on("reconnected", () => {
          console.log("✅ MongoDB reconnected");
          healthcheck.updateMongoStatus(true);
        });

        mongoose.connection.on("error", (err) => {
          console.error("❌ MongoDB error:", err.message);
          healthcheck.updateMongoStatus(false);
        });

        resolve();
      } catch (error) {
        connectionAttempts++;
        console.error(
          `❌ Connection attempt ${attempt + 1} failed:`,
          error.message
        );

        if (attempt < MAX_RETRY_ATTEMPTS - 1) {
          const delay = getRetryDelay(attempt);
          console.log(`⏳ Retrying in ${Math.round(delay / 1000)} seconds...`);
          setTimeout(() => attemptConnection(attempt + 1), delay);
        } else {
          console.error(
            "❌ Max connection attempts reached. Unable to connect to MongoDB."
          );
          reject(error);
        }
      }
    }

    attemptConnection();
  });
}

/**
 * Graceful shutdown handler
 */
function setupGracefulShutdown() {
  const gracefulShutdown = async () => {
    console.log(
      "\n⚠️  SIGTERM signal received: closing HTTP server gracefully..."
    );

    // Mark system as not ready to stop new requests
    healthcheck.markNotReady();

    // Stop accepting new connections
    server.close(async () => {
      console.log("HTTP server closed");

      // Disconnect Socket.IO
      io.close();
      console.log("Socket.IO server closed");

      // Close database connection
      try {
        await mongoose.connection.close();
        console.log("MongoDB connection closed");
      } catch (err) {
        console.error("Error closing MongoDB:", err);
      }

      console.log("✅ Graceful shutdown complete");
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error("❌ Forced shutdown - graceful shutdown timeout exceeded");
      process.exit(1);
    }, 30000);
  };

  // Handle graceful shutdown signals
  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
}

// Start server
async function startServer() {
  try {
    // Connect to database first
    await connectToDatabase();

    // Mark system as ready
    healthcheck.markReady();

    // Setup graceful shutdown
    setupGracefulShutdown();

    // Start listening
    server.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 Socket.IO server ready for WebRTC signaling`);
      console.log(`\n📊 Health check endpoints available:`);
      console.log(`   - Liveness:  http://localhost:${PORT}/health/live`);
      console.log(`   - Readiness: http://localhost:${PORT}/health/ready`);
      console.log(`   - Metrics:   http://localhost:${PORT}/health/metrics`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();
