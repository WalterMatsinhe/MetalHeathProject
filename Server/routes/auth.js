const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { loginLimiter, registerLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

// Register with rate limiting
router.post("/register", registerLimiter, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      licenseNumber,
      specialization,
      yearsExperience,
      education,
      certifications,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: "First name, last name, email, and password are required",
      });
    }

    // Additional validation for therapist registration
    if (role === "therapist") {
      if (!licenseNumber || !specialization || !education) {
        return res.status(400).json({
          message:
            "License number, specialization, and education are required for therapist registration",
        });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user with appropriate registration status
    const userData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || "user",
    };

    // Add therapist-specific fields if role is therapist
    if (role === "therapist") {
      userData.registrationStatus = "pending";
      userData.licenseNumber = licenseNumber;
      userData.specialization = specialization;
      userData.yearsExperience = yearsExperience || 0;
      userData.education = education;
      userData.certifications = certifications || "";
    } else {
      userData.registrationStatus = "active";
    }

    const user = new User(userData);

    await user.save();

    const message =
      role === "therapist"
        ? "Therapist application submitted successfully. Please wait for admin approval."
        : "User registered successfully";

    res.status(201).json({ message });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Login with rate limiting
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Check if therapist registration is still pending
    if (user.role === "therapist" && user.registrationStatus === "pending") {
      return res.status(403).json({
        message:
          "Your therapist application is pending admin approval. Please wait for confirmation.",
      });
    }

    // Check if therapist registration was rejected
    if (user.role === "therapist" && user.registrationStatus === "rejected") {
      return res.status(403).json({
        message: `Your therapist application was rejected. Reason: ${
          user.rejectionReason || "No reason provided"
        }`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "fallback_jwt_secret_for_development_only",
      { expiresIn: "1d" }
    );

    // Set cookie for browser
    res.cookie("authToken", token, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
