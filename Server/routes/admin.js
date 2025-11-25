const express = require("express");
const User = require("../models/User");
const Mood = require("../models/Mood");
const Goal = require("../models/Goal");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Reminder = require("../models/Reminder");
const { auth } = require("../middleware/auth");

const router = express.Router();

console.log("✅ Admin routes file loaded");

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied. Admin only." });
  }
  next();
};

// Get all pending therapist applications
router.get("/applications/pending", auth, isAdmin, async (req, res) => {
  try {
    const pendingApplications = await User.find({
      role: "therapist",
      registrationStatus: "pending",
    }).select("-password");

    res.json(pendingApplications);
  } catch (err) {
    console.error("Error fetching pending applications:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get all approved therapists
router.get("/applications/approved", auth, isAdmin, async (req, res) => {
  try {
    const approvedTherapists = await User.find({
      role: "therapist",
      registrationStatus: "approved",
    }).select("-password");

    res.json(approvedTherapists);
  } catch (err) {
    console.error("Error fetching approved therapists:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get all rejected applications
router.get("/applications/rejected", auth, isAdmin, async (req, res) => {
  try {
    const rejectedApplications = await User.find({
      role: "therapist",
      registrationStatus: "rejected",
    }).select("-password");

    res.json(rejectedApplications);
  } catch (err) {
    console.error("Error fetching rejected applications:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get single therapist application by ID
router.get("/applications/:id", auth, isAdmin, async (req, res) => {
  try {
    const application = await User.findById(req.params.id).select("-password");

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (application.role !== "therapist") {
      return res.status(400).json({ message: "User is not a therapist" });
    }

    res.json(application);
  } catch (err) {
    console.error("Error fetching application:", err);
    res.status(500).json({ message: err.message });
  }
});

// Approve therapist application
router.put("/applications/:id/approve", auth, isAdmin, async (req, res) => {
  try {
    const therapist = await User.findById(req.params.id);

    if (!therapist) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (therapist.role !== "therapist") {
      return res.status(400).json({ message: "User is not a therapist" });
    }

    if (therapist.registrationStatus !== "pending") {
      return res.status(400).json({
        message: `Application is already ${therapist.registrationStatus}`,
      });
    }

    therapist.registrationStatus = "approved";
    therapist.rejectionReason = ""; // Clear any previous rejection reason
    await therapist.save();

    res.json({
      message: "Therapist application approved successfully",
      therapist: {
        id: therapist._id,
        firstName: therapist.firstName,
        lastName: therapist.lastName,
        fullName: therapist.fullName,
        email: therapist.email,
        registrationStatus: therapist.registrationStatus,
      },
    });
  } catch (err) {
    console.error("Error approving application:", err);
    res.status(500).json({ message: err.message });
  }
});

// Reject therapist application
router.put("/applications/:id/reject", auth, isAdmin, async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        message: "Rejection reason is required",
      });
    }

    const therapist = await User.findById(req.params.id);

    if (!therapist) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (therapist.role !== "therapist") {
      return res.status(400).json({ message: "User is not a therapist" });
    }

    if (therapist.registrationStatus !== "pending") {
      return res.status(400).json({
        message: `Application is already ${therapist.registrationStatus}`,
      });
    }

    therapist.registrationStatus = "rejected";
    therapist.rejectionReason = reason.trim();
    await therapist.save();

    res.json({
      message: "Therapist application rejected",
      therapist: {
        id: therapist._id,
        firstName: therapist.firstName,
        lastName: therapist.lastName,
        fullName: therapist.fullName,
        email: therapist.email,
        registrationStatus: therapist.registrationStatus,
        rejectionReason: therapist.rejectionReason,
      },
    });
  } catch (err) {
    console.error("Error rejecting application:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get statistics for admin dashboard
router.get("/statistics", auth, isAdmin, async (req, res) => {
  console.log("📊 Statistics endpoint called");
  try {
    const [
      totalUsers,
      totalTherapists,
      pendingApplications,
      approvedTherapists,
      rejectedApplications,
    ] = await Promise.all([
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "therapist" }),
      User.countDocuments({ role: "therapist", registrationStatus: "pending" }),
      User.countDocuments({
        role: "therapist",
        registrationStatus: "approved",
      }),
      User.countDocuments({
        role: "therapist",
        registrationStatus: "rejected",
      }),
    ]);

    res.json({
      totalUsers,
      totalTherapists,
      pendingApplications,
      approvedTherapists,
      rejectedApplications,
    });
  } catch (err) {
    console.error("Error fetching statistics:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get all users
router.get("/users", auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: "user" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get all users (including therapists and admins)
router.get("/users/all", auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    console.error("Error fetching all users:", err);
    res.status(500).json({ message: err.message });
  }
});

// Delete user by ID
router.delete("/users/:id", auth, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Find the user first
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        message: "You cannot delete your own admin account",
      });
    }

    // Prevent deletion of other admin accounts
    if (user.role === "admin") {
      return res.status(403).json({
        message: "Cannot delete admin accounts",
      });
    }

    // Delete all related data in parallel
    await Promise.all([
      // Delete user's moods
      Mood.deleteMany({ userId: userId }),
      // Delete user's goals
      Goal.deleteMany({ userId: userId }),
      // Delete user's reminders
      Reminder.deleteMany({ userId: userId }),
      // Delete user's messages
      Message.deleteMany({
        $or: [{ senderId: userId }, { receiverId: userId }],
      }),
      // Delete user's conversations
      Conversation.deleteMany({
        $or: [{ user: userId }, { therapist: userId }],
      }),
    ]);

    // Delete the user
    await User.findByIdAndDelete(userId);

    console.log(
      `✅ User and all related data deleted: ${user.email} (ID: ${userId})`
    );

    res.json({
      message: "User and all related data deleted successfully",
      deletedUser: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
