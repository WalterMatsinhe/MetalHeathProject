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
const healthcheck = require("./utils/healthcheck");
const logger = require("./utils/logger");
const {
  apiLimiter,
  notificationsLimiter,
  loginLimiter,
  registerLimiter,
} = require("./middleware/rateLimiter");

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

// ===== SERVE STATIC FILES FIRST (BEFORE RATE LIMITING) =====
// Serve static files from client directory
app.use(express.static(path.join(__dirname, "../client")));

// Serve index.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// Serve assets folder for images and other static files
app.use("/assets", express.static(path.join(__dirname, "../assets")));

// ===== APPLY RATE LIMITING MIDDLEWARE =====
// Apply general API limiter to all requests (but static files already served above)
app.use(apiLimiter);

// Store connectedUsers in app for routes to access
app.set("connectedUsers", new Map());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", require("./routes/profile"));
app.use("/api/chat", notificationsLimiter, require("./routes/chat"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/mood", notificationsLimiter, require("./routes/mood"));
app.use("/api/goals", notificationsLimiter, require("./routes/goals"));
app.use("/api/reminders", notificationsLimiter, require("./routes/reminders"));
app.use("/api/reports", require("./routes/reports"));

logger.success("All routes registered");

// Import models for Socket.IO usage
const Conversation = require("./models/Conversation");
const Message = require("./models/Message");

// JWT Middleware
const { auth, therapist } = require("./middleware/auth");

// Add direct route for therapists with proper online status
app.get("/api/therapists", auth, async (req, res) => {
  try {
    // Use lean() and specific fields to reduce memory and query time
    const therapists = await User.find({
      role: "therapist",
      registrationStatus: { $ne: "rejected" },
    })
      .select(
        "firstName lastName specialization yearsExperience bio areasOfExpertise languagesSpoken stats profilePicture"
      )
      .lean();

    // Get connected users map for accurate online status
    const connectedUsers = app.get("connectedUsers") || new Map();

    // Create a more efficient online status map
    const onlineUserIds = new Set();
    for (const [, user] of connectedUsers.entries()) {
      if (user.userId) {
        onlineUserIds.add(user.userId.toString());
      }
    }

    // Add online status based on actual connections
    const therapistsWithStatus = therapists.map((therapist) => {
      const isOnline = onlineUserIds.has(therapist._id.toString());
      return {
        ...therapist,
        status: isOnline ? "online" : "offline",
        isOnline,
      };
    });

    res.json(therapistsWithStatus);
  } catch (error) {
    console.error("Error fetching therapists:", error);
    res.status(500).json({ message: "Error fetching therapists" });
  }
});

// Protected route for any authenticated user
app.get("/api/user/profile", auth, async (req, res) => {
  try {
    // Use lean() and select only needed fields for better performance
    const user = await User.findById(req.user.id).select("-password").lean();
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      _id: user._id,
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
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

// Debug endpoint to check connected users - ADMIN ONLY
// Requires authentication to prevent information disclosure
app.get("/api/debug/connected-users", auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id);
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

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
  } catch (error) {
    console.error("Error fetching connected users:", error);
    res.status(500).json({ message: "Error fetching connected users" });
  }
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
  logger.debug(`User connected: ${socket.id}`);

  // User registration
  socket.on("register", (data) => {
    logger.debug("Register event received", data);

    const { userId, userType, userName } = data;

    if (!userId || !userType || !userName) {
      logger.warn("Missing registration data", { userId, userType, userName });
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

    logger.debug(
      `${userType} registered: ${userName} (Total: ${connectedUsers.size})`
    );

    // Broadcast therapist availability to ALL users (both existing and new)
    const therapistAvailability = getTherapistAvailability();
    io.emit("therapist-availability-update", therapistAvailability);
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

      logger.info(`Therapist ${user.userName} availability: ${isAvailable}`);

      // Broadcast to all users
      const availability = getTherapistAvailability();
      io.emit("therapist-availability-update", availability);
    } else {
      logger.warn("User not found or not a therapist", { socketId: socket.id });
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

        logger.info(
          `Call request: ${user.userName} → ${availableTherapist.userName}`
        );
      } else {
        socket.emit("no-therapist-available");
        logger.info("No available therapist for call request");
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
      logger.info(`Call accepted in room ${roomId}`);
    }
  });

  // WebRTC Signaling Events
  socket.on("offer", (data) => {
    const { roomId, offer } = data;
    socket.to(roomId).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", (data) => {
    const { roomId, answer } = data;
    socket.to(roomId).emit("answer", { answer, from: socket.id });
  });

  socket.on("ice-candidate", (data) => {
    const { roomId, candidate } = data;
    socket.to(roomId).emit("ice-candidate", { candidate, from: socket.id });
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
      logger.info(`Call ended in room ${roomId}`);
    }
  });

  // Chat functionality - Join chat room with consistent room naming
  socket.on("join-chat", async (data) => {
    try {
      const { therapistId, userId, currentUserId } = data;
      const user = connectedUsers.get(socket.id);

      if (!user) {
        logger.warn("User not found in connectedUsers");
        return;
      }

      // Create consistent room naming: always sorted IDs
      const roomId1 = (therapistId || user.userId).toString();
      const roomId2 = (userId || user.userId).toString();
      const sortedIds = [roomId1, roomId2].sort();
      const chatRoom = `chat_${sortedIds[0]}_${sortedIds[1]}`;

      socket.join(chatRoom);
      logger.info(
        `${user.userName} (${user.userType}) joined room: ${chatRoom}`
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
    } catch (error) {
      logger.error("Error joining chat room", error.message);
      socket.emit("chat-error", { message: "Failed to join chat room" });
    }
  });

  // send-message event handler - users and therapists send messages
  socket.on("send-message", async (data) => {
    try {
      const { to, message, therapistId, userId } = data;
      const user = connectedUsers.get(socket.id);

      if (!user) {
        logger.warn("User not found in connectedUsers for message send");
        socket.emit("message-error", {
          message: "User not registered. Please refresh the page.",
        });
        return;
      }

      if (!message || !message.trim()) {
        logger.warn("Empty message attempted");
        socket.emit("message-error", { message: "Message cannot be empty" });
        return;
      }

      // Determine recipient ID and use consistent room naming (sorted IDs)
      let recipientId;

      if (user.userType === "therapist") {
        recipientId = to || userId;
      } else {
        recipientId = to || therapistId;
      }

      const roomId1 = user.userId.toString();
      const roomId2 = recipientId.toString();
      const sortedIds = [roomId1, roomId2].sort();
      const chatRoom = `chat_${sortedIds[0]}_${sortedIds[1]}`;

      // Find or create conversation in database
      const conversation = await Conversation.findOrCreate(
        user.userType === "therapist" ? recipientId : user.userId,
        user.userType === "therapist" ? user.userId : recipientId
      );

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

      // Update conversation unread count for recipient
      await conversation.incrementUnreadCount(recipientId);

      // Update conversation lastMessage field
      conversation.lastMessage = {
        content: message.trim(),
        sender: user.userId,
        timestamp: new Date(),
      };
      await conversation.save();

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

      logger.info(`Message sent in chat room ${chatRoom}`);

      // Send delivery confirmation to sender
      socket.emit("message-sent", {
        success: true,
        message: newMessage,
        conversationId: conversation._id,
      });
    } catch (error) {
      logger.error("Error in send-message", error.message);
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
    logger.debug(`User disconnected: ${socket.id}`);

    const user = connectedUsers.get(socket.id);
    if (user) {
      logger.debug(`Cleaning up: ${user.userName} (${user.userType})`);

      // Clean up active rooms
      for (const [roomId, room] of activeRooms.entries()) {
        if (
          room.user.socketId === socket.id ||
          room.therapist.socketId === socket.id
        ) {
          io.to(roomId).emit("call-ended");
          activeRooms.delete(roomId);
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

      logger.debug(`User cleaned up. Remaining: ${connectedUsers.size}`);
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
  for (const [socketId, therapist] of therapistUsers.entries()) {
    if (therapist.isAvailable === true) {
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
        logger.info(
          `Connection attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS}...`
        );

        await mongoose.connect(MONGO_URI, mongooseOptions);

        healthcheck.updateMongoStatus(true);
        logger.success("MongoDB connected successfully");

        // Setup connection event handlers
        mongoose.connection.on("disconnected", () => {
          logger.warn("MongoDB connection lost. Attempting to reconnect...");
          healthcheck.updateMongoStatus(false);
        });

        mongoose.connection.on("reconnected", () => {
          logger.success("MongoDB reconnected");
          healthcheck.updateMongoStatus(true);
        });

        mongoose.connection.on("error", (err) => {
          logger.error("MongoDB error", err.message);
          healthcheck.updateMongoStatus(false);
        });

        resolve();
      } catch (error) {
        connectionAttempts++;
        logger.error(`Connection attempt ${attempt + 1} failed`, error.message);

        if (attempt < MAX_RETRY_ATTEMPTS - 1) {
          const delay = getRetryDelay(attempt);
          logger.warn(`Retrying in ${Math.round(delay / 1000)} seconds...`);
          setTimeout(() => attemptConnection(attempt + 1), delay);
        } else {
          logger.error("Max connection attempts reached");
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
    logger.warn("Shutting down gracefully...");

    // Mark system as not ready to stop new requests
    healthcheck.markNotReady();

    // Stop accepting new connections
    server.close(async () => {
      logger.info("HTTP server closed");

      // Disconnect Socket.IO
      io.close();
      logger.info("Socket.IO server closed");

      // Close database connection
      try {
        await mongoose.connection.close();
        logger.info("MongoDB connection closed");
      } catch (err) {
        logger.error("Error closing MongoDB", err.message);
      }

      logger.success("Graceful shutdown complete");
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error("Forced shutdown - graceful shutdown timeout exceeded");
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
      // Display startup banner with configuration
      logger.displayStartupBanner({
        port: PORT,
        env: process.env.NODE_ENV || "development",
        db: true,
      });

      // Display connection status
      logger.displayConnectionStatus([
        { name: "MongoDB", connected: true, message: "Connected to database" },
        {
          name: "Socket.IO",
          connected: true,
          message: "WebRTC signaling ready",
        },
      ]);
    });
  } catch (error) {
    logger.error("Failed to start server", error.message);
    process.exit(1);
  }
}

// Start the server
startServer();
