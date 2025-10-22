const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ["daily", "weekly", "monthly", "custom"],
      default: "daily",
    },
    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    dueDate: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    recurringType: {
      type: String,
      enum: ["none", "daily", "weekly", "monthly"],
      default: "none",
    },
    streak: {
      type: Number,
      default: 0,
    },
    lastCompletedDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
goalSchema.index({ user: 1, status: 1, category: 1 });
goalSchema.index({ user: 1, dueDate: 1 });

// Static method to get user goals with stats
goalSchema.statics.getUserGoalsWithStats = async function (userId) {
  const goals = await this.find({ user: userId }).sort({ createdAt: -1 });

  const stats = {
    total: goals.length,
    active: goals.filter((g) => g.status === "active").length,
    completed: goals.filter((g) => g.status === "completed").length,
    highPriority: goals.filter(
      (g) => g.priority === "high" && g.status === "active"
    ).length,
  };

  return { goals, stats };
};

// Instance method to mark goal as completed
goalSchema.methods.markCompleted = async function () {
  this.status = "completed";
  this.completedAt = new Date();

  // Update streak for recurring goals
  if (this.recurringType !== "none") {
    const today = new Date();
    const lastCompleted = this.lastCompletedDate
      ? new Date(this.lastCompletedDate)
      : null;

    if (lastCompleted) {
      const daysDiff = Math.floor(
        (today - lastCompleted) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff === 1) {
        this.streak += 1;
      } else if (daysDiff > 1) {
        this.streak = 1;
      }
    } else {
      this.streak = 1;
    }

    this.lastCompletedDate = today;
  }

  await this.save();
  return this;
};

module.exports = mongoose.model("Goal", goalSchema);
