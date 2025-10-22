const express = require("express");
const router = express.Router();
const Goal = require("../models/Goal");
const { auth } = require("../middleware/auth");

// Get all goals for the authenticated user
router.get("/", auth, async (req, res) => {
  try {
    const { status, category } = req.query;
    const query = { user: req.user.id };

    if (status) query.status = status;
    if (category) query.category = category;

    const goals = await Goal.find(query).sort({ createdAt: -1 });

    res.json({ goals, count: goals.length });
  } catch (error) {
    console.error("Error fetching goals:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get goal statistics
router.get("/stats", auth, async (req, res) => {
  try {
    const { goals, stats } = await Goal.getUserGoalsWithStats(req.user.id);

    res.json({ stats, totalGoals: goals.length });
  } catch (error) {
    console.error("Error fetching goal stats:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get a single goal by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    res.json({ goal });
  } catch (error) {
    console.error("Error fetching goal:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new goal
router.post("/", auth, async (req, res) => {
  try {
    const { title, description, category, priority, dueDate, recurringType } =
      req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Goal title is required" });
    }

    const goal = new Goal({
      user: req.user.id,
      title: title.trim(),
      description: description?.trim(),
      category,
      priority,
      dueDate,
      recurringType,
    });

    await goal.save();

    res.status(201).json({
      message: "Goal created successfully",
      goal,
    });
  } catch (error) {
    console.error("Error creating goal:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update a goal
router.put("/:id", auth, async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    const {
      title,
      description,
      category,
      status,
      priority,
      dueDate,
      recurringType,
    } = req.body;

    if (title !== undefined) goal.title = title.trim();
    if (description !== undefined) goal.description = description?.trim();
    if (category !== undefined) goal.category = category;
    if (status !== undefined) goal.status = status;
    if (priority !== undefined) goal.priority = priority;
    if (dueDate !== undefined) goal.dueDate = dueDate;
    if (recurringType !== undefined) goal.recurringType = recurringType;

    await goal.save();

    res.json({
      message: "Goal updated successfully",
      goal,
    });
  } catch (error) {
    console.error("Error updating goal:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark goal as completed
router.post("/:id/complete", auth, async (req, res) => {
  try {
    const goal = await Goal.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    await goal.markCompleted();

    res.json({
      message: "Goal marked as completed!",
      goal,
    });
  } catch (error) {
    console.error("Error completing goal:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete a goal
router.delete("/:id", auth, async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    res.json({ message: "Goal deleted successfully" });
  } catch (error) {
    console.error("Error deleting goal:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
