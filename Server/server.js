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

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", require("./routes/profile"));
app.use("/api/chat", require("./routes/chat"));

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
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture || "",
    });
  } catch (err) {
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

// WebRTC Signaling Server
const connectedUsers = new Map(); // Store connected users
const therapistUsers = new Map(); // Store therapist users
const activeRooms = new Map(); // Store active video call rooms

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // User registration
  socket.on("register", (data) => {
    const { userId, userType, userName } = data;

    connectedUsers.set(socket.id, {
      userId,
      userType,
      userName,
      socketId: socket.id,
      isAvailable: userType === "therapist" ? false : true,
    });

    if (userType === "therapist") {
      therapistUsers.set(socket.id, {
        userId,
        userName,
        socketId: socket.id,
        isAvailable: false,
      });
    }

    console.log(`${userType} registered: ${userName} (${socket.id})`);

    // Broadcast therapist availability to all users
    if (userType === "therapist") {
      io.emit("therapist-availability-update", getTherapistAvailability());
    }
  });

  // Handle chat room joining
  socket.on("join-chat", (data) => {
    const { room, userId, therapistId } = data;
    const user = connectedUsers.get(socket.id);
    
    if (user && room) {
      socket.join(room);
      console.log(`${user.userName} (${user.userType}) joined chat room: ${room}`);
      
      // Notify the room that someone joined
      socket.to(room).emit("user-joined-chat", {
        userId: user.userId,
        userName: user.userName,
        userType: user.userType
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
  socket.on("join-chat", (data) => {
    const { therapistId, userId } = data;
    const chatRoom = `chat_${userId}_${therapistId}`;
    socket.join(chatRoom);
    console.log(`User ${userId} joined chat with therapist ${therapistId}`);
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

  socket.on("send-message", (data) => {
    const { to, message, timestamp } = data;
    const user = connectedUsers.get(socket.id);

    if (user) {
      // Create consistent room naming: chat_{userId}_{therapistId}
      let chatRoom;
      if (user.userType === "therapist") {
        chatRoom = `chat_${to}_${user.userId}`; // therapist sending to user
      } else {
        chatRoom = `chat_${user.userId}_${to}`; // user sending to therapist
      }
      
      // Send message to the chat room
      io.to(chatRoom).emit("message", {
        from: user.userId,
        fromName: user.userName,
        message,
        timestamp: timestamp || new Date().toISOString(),
        sender: user.userType,
      });
      
      console.log(`Message sent in chat room ${chatRoom} from ${user.userType} ${user.userName}: ${message}`);
    }
  });

  socket.on("typing", (data) => {
    const { to } = data;
    const user = connectedUsers.get(socket.id);

    if (user) {
      const chatRoom = `chat_${user.userId}_${to}`;
      socket.to(chatRoom).emit("typing", {
        from: user.userId,
        userName: user.userName,
      });
    }
  });

  socket.on("stop-typing", (data) => {
    const { to } = data;
    const user = connectedUsers.get(socket.id);

    if (user) {
      const chatRoom = `chat_${user.userId}_${to}`;
      socket.to(chatRoom).emit("stop-typing", {
        from: user.userId,
      });
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);

    const user = connectedUsers.get(socket.id);
    if (user) {
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

      // Remove from connected users
      connectedUsers.delete(socket.id);

      if (user.userType === "therapist") {
        therapistUsers.delete(socket.id);
        // Broadcast updated therapist availability
        io.emit("therapist-availability-update", getTherapistAvailability());
      }
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
