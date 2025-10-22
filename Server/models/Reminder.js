const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema(
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
    reminderTime: {
      type: Date,
      required: true,
    },
    reminderType: {
      type: String,
      enum: [
        "mood_check",
        "therapy_session",
        "medication",
        "exercise",
        "meditation",
        "custom",
      ],
      default: "custom",
    },
    status: {
      type: String,
      enum: ["active", "completed", "dismissed"],
      default: "active",
    },
    recurring: {
      type: String,
      enum: ["none", "daily", "weekly", "monthly"],
      default: "none",
    },
    notificationSent: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
reminderSchema.index({ user: 1, status: 1, reminderTime: 1 });

// Static method to get upcoming reminders
reminderSchema.statics.getUpcomingReminders = async function (
  userId,
  daysAhead = 7
) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return this.find({
    user: userId,
    status: "active",
    reminderTime: { $gte: now, $lte: futureDate },
  }).sort({ reminderTime: 1 });
};

// Static method to get overdue reminders
reminderSchema.statics.getOverdueReminders = async function (userId) {
  const now = new Date();

  return this.find({
    user: userId,
    status: "active",
    reminderTime: { $lt: now },
  }).sort({ reminderTime: 1 });
};

// Instance method to mark reminder as completed
reminderSchema.methods.markCompleted = async function () {
  this.status = "completed";
  this.completedAt = new Date();

  // If recurring, create next reminder
  if (this.recurring !== "none") {
    const nextReminder = new this.constructor({
      user: this.user,
      title: this.title,
      description: this.description,
      reminderType: this.reminderType,
      recurring: this.recurring,
      reminderTime: this.getNextReminderTime(),
    });

    await nextReminder.save();
  }

  await this.save();
  return this;
};

// Helper method to calculate next reminder time
reminderSchema.methods.getNextReminderTime = function () {
  const nextTime = new Date(this.reminderTime);

  switch (this.recurring) {
    case "daily":
      nextTime.setDate(nextTime.getDate() + 1);
      break;
    case "weekly":
      nextTime.setDate(nextTime.getDate() + 7);
      break;
    case "monthly":
      nextTime.setMonth(nextTime.getMonth() + 1);
      break;
  }

  return nextTime;
};

module.exports = mongoose.model("Reminder", reminderSchema);
