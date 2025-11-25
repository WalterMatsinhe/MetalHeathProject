const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    // Basic Authentication Fields
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [1, "First name cannot be empty"],
      maxlength: [50, "First name cannot be longer than 50 characters"],
      validate: {
        validator: function (v) {
          return /^[a-zA-Z\s\-'\.]+$/.test(v);
        },
        message:
          "First name can only contain letters, spaces, hyphens, apostrophes, and periods",
      },
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [1, "Last name cannot be empty"],
      maxlength: [50, "Last name cannot be longer than 50 characters"],
      validate: {
        validator: function (v) {
          return /^[a-zA-Z\s\-'\.]+$/.test(v);
        },
        message:
          "Last name can only contain letters, spaces, hyphens, apostrophes, and periods",
      },
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "therapist", "admin"],
      default: "user",
    },
    // Registration status for therapist applications
    registrationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "active"],
      default: function () {
        return this.role === "therapist" ? "pending" : "active";
      },
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer-not-to-say", ""],
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    profilePicture: {
      type: String,
      default: "",
    },

    // Mental Health Specific Fields (for users)
    emergencyContact: {
      type: String,
      default: "",
    },
    preferredLanguage: {
      type: String,
      enum: [
        "english",
        "swahili",
        "kikuyu",
        "luo",
        "french",
        "spanish",
        "portuguese",
        "amharic",
        "arabic",
        "german",
        "italian",
        "chinese",
        "japanese",
        "korean",
        "russian",
        "other",
      ],
      default: "english",
    },
    mentalHealthConcerns: [
      {
        type: String,
        enum: [
          "anxiety",
          "depression",
          "stress",
          "relationships",
          "trauma",
          "addiction",
        ],
      },
    ],
    mentalHealthGoals: {
      type: String,
      default: "",
    },

    // Privacy Settings
    shareProgress: {
      type: Boolean,
      default: true,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    smsReminders: {
      type: Boolean,
      default: false,
    },

    // Professional Fields (for therapist users)
    licenseNumber: {
      type: String,
      default: "",
    },
    specialization: {
      type: String,
      enum: [
        "clinical-psychology",
        "counseling-psychology",
        "psychiatry",
        "social-work",
        "therapy",
        "other",
        "",
      ],
      default: "",
    },
    yearsExperience: {
      type: Number,
      default: 0,
    },
    institution: {
      type: String,
      default: "",
    },
    education: {
      type: String,
      default: "",
    },
    certifications: {
      type: String,
      default: "",
    },
    languagesSpoken: [
      {
        type: String,
        enum: ["english", "swahili", "kikuyu", "luo", "other"],
      },
    ],
    areasOfExpertise: [
      {
        type: String,
        enum: [
          "anxiety",
          "depression",
          "trauma",
          "addiction",
          "family",
          "adolescent",
        ],
      },
    ],
    workingHoursStart: {
      type: String,
      default: "08:00",
    },
    workingHoursEnd: {
      type: String,
      default: "17:00",
    },
    workingDays: [
      {
        type: String,
        enum: [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ],
      },
    ],

    // Statistics and Tracking
    stats: {
      daysActive: {
        type: Number,
        default: 0,
      },
      sessionsCompleted: {
        type: Number,
        default: 0,
      },
      moodEntries: {
        type: Number,
        default: 0,
      },
      goalsAchieved: {
        type: Number,
        default: 0,
      },
      // Therapist-specific stats
      patientsHelped: {
        type: Number,
        default: 0,
      },
      hoursThisMonth: {
        type: Number,
        default: 0,
      },
      averageRating: {
        type: Number,
        default: 0,
      },
      yearsOnPlatform: {
        type: Number,
        default: 0,
      },
    },

    // Account Status
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// ===== DATABASE INDEXES FOR PERFORMANCE =====
// Note: email already has unique: true in schema which creates an index
// Index role for filtering users by type
UserSchema.index({ role: 1 });

// Index for registration status (therapist approvals)
UserSchema.index({ registrationStatus: 1 });

// Compound index for therapist queries
UserSchema.index({ role: 1, registrationStatus: 1 });

// Index for date-based queries
UserSchema.index({ createdAt: -1 });
UserSchema.index({ registrationDate: -1 });

// Pre-save middleware
UserSchema.pre("save", function (next) {
  // Calculate years on platform
  if (this.isNew) {
    this.stats.yearsOnPlatform = 0;
  } else {
    const yearsSinceCreation = Math.floor(
      (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24 * 365)
    );
    this.stats.yearsOnPlatform = yearsSinceCreation;
  }
  next();
});

// Virtual field for computed full name
UserSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Ensure virtuals are included in JSON
UserSchema.set("toJSON", { virtuals: true });
UserSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("User", UserSchema);
