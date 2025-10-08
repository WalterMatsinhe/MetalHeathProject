const multer = require("multer");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const { auth } = require("../middleware/auth");

// Set up multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "../../assets/profile-pictures");
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, req.user.id + "-" + Date.now() + ext);
  },
});

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const router = require("express").Router();

// Get user profile
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user profile
router.put("/", auth, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      dateOfBirth,
      gender,
      location,
      bio,
      emergencyContact,
      preferredLanguage,
      mentalHealthConcerns,
      mentalHealthGoals,
      shareProgress,
      emailNotifications,
      smsReminders,
      // Therapist-specific fields
      licenseNumber,
      specialization,
      yearsExperience,
      institution,
      education,
      certifications,
      languagesSpoken,
      areasOfExpertise,
      workingHoursStart,
      workingHoursEnd,
      workingDays,
    } = req.body;

    // Build update object
    const updateData = {};

    // Basic profile fields
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (gender !== undefined) updateData.gender = gender;
    if (location !== undefined) updateData.location = location;
    if (bio !== undefined) updateData.bio = bio;

    // Mental health fields (for users)
    if (emergencyContact !== undefined)
      updateData.emergencyContact = emergencyContact;
    if (preferredLanguage !== undefined)
      updateData.preferredLanguage = preferredLanguage;
    if (mentalHealthConcerns !== undefined)
      updateData.mentalHealthConcerns = mentalHealthConcerns;
    if (mentalHealthGoals !== undefined)
      updateData.mentalHealthGoals = mentalHealthGoals;

    // Privacy settings
    if (shareProgress !== undefined) updateData.shareProgress = shareProgress;
    if (emailNotifications !== undefined)
      updateData.emailNotifications = emailNotifications;
    if (smsReminders !== undefined) updateData.smsReminders = smsReminders;

    // Professional fields (for therapists)
    if (licenseNumber !== undefined) updateData.licenseNumber = licenseNumber;
    if (specialization !== undefined)
      updateData.specialization = specialization;
    if (yearsExperience !== undefined)
      updateData.yearsExperience = yearsExperience;
    if (institution !== undefined) updateData.institution = institution;
    if (education !== undefined) updateData.education = education;
    if (certifications !== undefined)
      updateData.certifications = certifications;
    if (languagesSpoken !== undefined)
      updateData.languagesSpoken = languagesSpoken;
    if (areasOfExpertise !== undefined)
      updateData.areasOfExpertise = areasOfExpertise;
    if (workingHoursStart !== undefined)
      updateData.workingHoursStart = workingHoursStart;
    if (workingHoursEnd !== undefined)
      updateData.workingHoursEnd = workingHoursEnd;
    if (workingDays !== undefined) updateData.workingDays = workingDays;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile updated successfully",
      user: user,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation error",
        errors: Object.values(error.errors).map((e) => e.message),
      });
    }
    res.status(500).json({ message: "Server error" });
  }
});

// Upload profile picture
router.post(
  "/picture",
  auth,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Delete old profile picture if it exists
      const user = await User.findById(req.user.id);
      if (user.profilePicture && user.profilePicture !== "") {
        const oldImagePath = path.join(__dirname, "../..", user.profilePicture);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      // Save new file path to user
      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        {
          $set: {
            profilePicture: `/assets/profile-pictures/${req.file.filename}`,
          },
        },
        { new: true }
      ).select("-password");

      res.json({
        message: "Profile picture updated successfully",
        profilePictureUrl: updatedUser.profilePicture,
        user: updatedUser,
      });
    } catch (error) {
      console.error("Upload profile picture error:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update user statistics
router.put("/stats", auth, async (req, res) => {
  try {
    const {
      daysActive,
      sessionsCompleted,
      moodEntries,
      goalsAchieved,
      patientsHelped,
      hoursThisMonth,
      averageRating,
    } = req.body;

    const updateData = {};
    if (daysActive !== undefined) updateData["stats.daysActive"] = daysActive;
    if (sessionsCompleted !== undefined)
      updateData["stats.sessionsCompleted"] = sessionsCompleted;
    if (moodEntries !== undefined)
      updateData["stats.moodEntries"] = moodEntries;
    if (goalsAchieved !== undefined)
      updateData["stats.goalsAchieved"] = goalsAchieved;
    if (patientsHelped !== undefined)
      updateData["stats.patientsHelped"] = patientsHelped;
    if (hoursThisMonth !== undefined)
      updateData["stats.hoursThisMonth"] = hoursThisMonth;
    if (averageRating !== undefined)
      updateData["stats.averageRating"] = averageRating;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateData },
      { new: true }
    ).select("-password");

    res.json({
      message: "Statistics updated successfully",
      stats: user.stats,
    });
  } catch (error) {
    console.error("Update stats error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete profile picture
router.delete("/picture", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.profilePicture && user.profilePicture !== "") {
      const imagePath = path.join(__dirname, "../..", user.profilePicture);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await User.findByIdAndUpdate(req.user.id, { $set: { profilePicture: "" } });

    res.json({ message: "Profile picture deleted successfully" });
  } catch (error) {
    console.error("Delete profile picture error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ message: "File too large. Maximum size is 5MB." });
    }
  }
  if (error.message === "Only image files are allowed!") {
    return res.status(400).json({ message: "Only image files are allowed!" });
  }
  res.status(500).json({ message: "File upload error" });
});

module.exports = router;
