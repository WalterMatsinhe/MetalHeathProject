const mongoose = require("mongoose");

const MoodSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Mood level (1-5 scale)
    moodLevel: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      enum: [1, 2, 3, 4, 5],
    },
    // Mood type/label
    moodType: {
      type: String,
      required: true,
      enum: ["very-sad", "sad", "neutral", "happy", "very-happy"],
    },
    // Additional notes about the mood
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    // Activities associated with this mood
    activities: [
      {
        type: String,
        enum: [
          "exercise",
          "meditation",
          "social",
          "work",
          "sleep",
          "therapy",
          "hobbies",
          "self-care",
          "other",
        ],
      },
    ],
    // Factors affecting mood
    factors: [
      {
        type: String,
        enum: [
          "stress",
          "anxiety",
          "relationships",
          "work",
          "health",
          "sleep",
          "weather",
          "finances",
          "other",
        ],
      },
    ],
    // Energy level (1-5 scale)
    energyLevel: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    // Stress level (1-5 scale)
    stressLevel: {
      type: Number,
      min: 1,
      max: 5,
      default: 3,
    },
    // Date and time of mood entry
    entryDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // Is this the daily check-in
    isDailyCheckIn: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user and date queries
MoodSchema.index({ user: 1, entryDate: -1 });
MoodSchema.index({ user: 1, isDailyCheckIn: 1 });

// Static method to get mood statistics for a user
MoodSchema.statics.getUserMoodStats = async function (userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        entryDate: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: null,
        averageMood: { $avg: "$moodLevel" },
        averageEnergy: { $avg: "$energyLevel" },
        averageStress: { $avg: "$stressLevel" },
        totalEntries: { $sum: 1 },
        moodDistribution: {
          $push: {
            mood: "$moodType",
            level: "$moodLevel",
            date: "$entryDate",
          },
        },
      },
    },
  ]);

  return stats[0] || null;
};

// Static method to get mood trend over time
MoodSchema.statics.getMoodTrend = async function (userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const trend = await this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        entryDate: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$entryDate" },
        },
        averageMood: { $avg: "$moodLevel" },
        averageEnergy: { $avg: "$energyLevel" },
        averageStress: { $avg: "$stressLevel" },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  return trend;
};

// Static method to get most common mood factors
MoodSchema.statics.getTopFactors = async function (userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const factors = await this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        entryDate: { $gte: startDate },
      },
    },
    {
      $unwind: "$factors",
    },
    {
      $group: {
        _id: "$factors",
        count: { $sum: 1 },
        avgMoodWhenPresent: { $avg: "$moodLevel" },
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $limit: 5,
    },
  ]);

  return factors;
};

module.exports = mongoose.model("Mood", MoodSchema);
