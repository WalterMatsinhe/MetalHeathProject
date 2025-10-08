const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    // Basic Authentication Fields
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "therapist"],
      default: "user",
    },

    // Profile Information
    firstName: {
      type: String,
      default: "",
    },
    lastName: {
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
      enum: ["english", "swahili", "kikuyu", "luo", "other"],
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

// Calculate years on platform before saving
UserSchema.pre("save", function (next) {
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

module.exports = mongoose.model("User", UserSchema);
