const express = require("express");
const router = express.Router();
const Reminder = require("../models/Reminder");
const { auth } = require("../middleware/auth");

// Get all reminders for the authenticated user
router.get("/", auth, async (req, res) => {
  try {
    const { status, type } = req.query;
    const query = { user: req.user.id };

    if (status) query.status = status;
    if (type) query.reminderType = type;

    const reminders = await Reminder.find(query).sort({ reminderTime: 1 });

    res.json({ reminders, count: reminders.length });
  } catch (error) {
    console.error("Error fetching reminders:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get upcoming reminders
router.get("/upcoming", auth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const reminders = await Reminder.getUpcomingReminders(
      req.user.id,
      parseInt(days)
    );

    res.json({ reminders, count: reminders.length });
  } catch (error) {
    console.error("Error fetching upcoming reminders:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get overdue reminders
router.get("/overdue", auth, async (req, res) => {
  try {
    const reminders = await Reminder.getOverdueReminders(req.user.id);

    res.json({ reminders, count: reminders.length });
  } catch (error) {
    console.error("Error fetching overdue reminders:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get a single reminder by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    res.json({ reminder });
  } catch (error) {
    console.error("Error fetching reminder:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new reminder
router.post("/", auth, async (req, res) => {
  try {
    const { title, description, reminderTime, reminderType, recurring } =
      req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Reminder title is required" });
    }

    if (!reminderTime) {
      return res.status(400).json({ message: "Reminder time is required" });
    }

    const reminder = new Reminder({
      user: req.user.id,
      title: title.trim(),
      description: description?.trim(),
      reminderTime: new Date(reminderTime),
      reminderType,
      recurring,
    });

    await reminder.save();

    res.status(201).json({
      message: "Reminder created successfully",
      reminder,
    });
  } catch (error) {
    console.error("Error creating reminder:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update a reminder
router.put("/:id", auth, async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    const {
      title,
      description,
      reminderTime,
      reminderType,
      status,
      recurring,
    } = req.body;

    if (title !== undefined) reminder.title = title.trim();
    if (description !== undefined) reminder.description = description?.trim();
    if (reminderTime !== undefined)
      reminder.reminderTime = new Date(reminderTime);
    if (reminderType !== undefined) reminder.reminderType = reminderType;
    if (status !== undefined) reminder.status = status;
    if (recurring !== undefined) reminder.recurring = recurring;

    await reminder.save();

    res.json({
      message: "Reminder updated successfully",
      reminder,
    });
  } catch (error) {
    console.error("Error updating reminder:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark reminder as completed
router.post("/:id/complete", auth, async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    await reminder.markCompleted();

    res.json({
      message: "Reminder completed!",
      reminder,
    });
  } catch (error) {
    console.error("Error completing reminder:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Dismiss a reminder
router.post("/:id/dismiss", auth, async (req, res) => {
  try {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    reminder.status = "dismissed";
    await reminder.save();

    res.json({
      message: "Reminder dismissed",
      reminder,
    });
  } catch (error) {
    console.error("Error dismissing reminder:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a reminder
router.delete("/:id", auth, async (req, res) => {
  try {
    const reminder = await Reminder.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    res.json({ message: "Reminder deleted successfully" });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
