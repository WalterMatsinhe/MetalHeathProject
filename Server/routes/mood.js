const express = require("express");
const router = express.Router();
const Mood = require("../models/Mood");
const User = require("../models/User");
const { auth } = require("../middleware/auth");

// @route   POST /api/mood
// @desc    Create a new mood entry
// @access  Private
router.post("/", auth, async (req, res) => {
  try {
    const {
      moodLevel,
      moodType,
      notes,
      activities,
      factors,
      energyLevel,
      stressLevel,
      isDailyCheckIn,
    } = req.body;

    // Validate required fields
    if (!moodLevel || !moodType) {
      return res.status(400).json({
        message: "Mood level and mood type are required",
      });
    }

    // Check if there's already a daily check-in for today
    if (isDailyCheckIn) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existingCheckIn = await Mood.findOne({
        user: req.user.id,
        isDailyCheckIn: true,
        entryDate: { $gte: today, $lt: tomorrow },
      });

      if (existingCheckIn) {
        // Update existing check-in instead of creating new one
        existingCheckIn.moodLevel = moodLevel;
        existingCheckIn.moodType = moodType;
        existingCheckIn.notes = notes || "";
        existingCheckIn.activities = activities || [];
        existingCheckIn.factors = factors || [];
        existingCheckIn.energyLevel = energyLevel || 3;
        existingCheckIn.stressLevel = stressLevel || 3;
        existingCheckIn.entryDate = new Date();

        await existingCheckIn.save();

        return res.json({
          message: "Daily check-in updated successfully",
          mood: existingCheckIn,
        });
      }
    }

    // Create new mood entry
    const mood = new Mood({
      user: req.user.id,
      moodLevel,
      moodType,
      notes: notes || "",
      activities: activities || [],
      factors: factors || [],
      energyLevel: energyLevel || 3,
      stressLevel: stressLevel || 3,
      isDailyCheckIn: isDailyCheckIn || false,
    });

    await mood.save();

    // Update user stats - increment mood entries
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { "stats.moodEntries": 1 },
    });

    res.status(201).json({
      message: "Mood entry created successfully",
      mood,
    });
  } catch (error) {
    console.error("Error creating mood entry:", error);
    res.status(500).json({
      message: "Error creating mood entry",
      error: error.message,
    });
  }
});

// @route   GET /api/mood
// @desc    Get all mood entries for the authenticated user
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const { limit = 50, skip = 0, days } = req.query;

    let query = { user: req.user.id };

    // Filter by date range if days parameter is provided
    if (days) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
      query.entryDate = { $gte: startDate };
    }

    const moods = await Mood.find(query)
      .sort({ entryDate: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Mood.countDocuments(query);

    res.json({
      moods,
      total,
      hasMore: total > parseInt(skip) + parseInt(limit),
    });
  } catch (error) {
    console.error("Error fetching mood entries:", error);
    res.status(500).json({
      message: "Error fetching mood entries",
      error: error.message,
    });
  }
});

// @route   GET /api/mood/stats
// @desc    Get comprehensive mood statistics for the authenticated user
// @access  Private
router.get("/stats", auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysInt = parseInt(days);

    console.log(
      `Fetching mood stats for user ${req.user.id} for ${daysInt} days`
    );

    const stats = await Mood.getUserMoodStats(req.user.id, daysInt);

    console.log("Raw stats from database:", stats);

    if (!stats) {
      console.log("No mood data found for user");
      return res.json({
        message: "No mood data available",
        stats: {
          averageMood: 0,
          averageEnergy: 0,
          averageStress: 0,
          totalEntries: 0,
          moodDistribution: {},
          checkInStreak: 0,
          bestDay: null,
          worstDay: null,
        },
      });
    }

    // Calculate mood distribution
    const moodDistribution = {
      "very-happy": 0,
      happy: 0,
      neutral: 0,
      sad: 0,
      "very-sad": 0,
    };

    if (stats.moodDistribution) {
      stats.moodDistribution.forEach((entry) => {
        if (moodDistribution[entry.mood] !== undefined) {
          moodDistribution[entry.mood]++;
        }
      });
    }

    // Calculate check-in streak
    const checkInStreak = await calculateCheckInStreak(req.user.id);

    // Find best and worst days
    const sortedByMood = stats.moodDistribution
      ? [...stats.moodDistribution].sort((a, b) => b.level - a.level)
      : [];

    const enhancedStats = {
      ...stats,
      moodDistribution,
      checkInStreak,
      bestDay: sortedByMood[0] || null,
      worstDay: sortedByMood[sortedByMood.length - 1] || null,
    };

    console.log("Enhanced stats being sent:", enhancedStats);

    res.json({ stats: enhancedStats });
  } catch (error) {
    console.error("Error fetching mood stats:", error);
    res.status(500).json({
      message: "Error fetching mood stats",
      error: error.message,
    });
  }
});

// Helper function to calculate check-in streak
async function calculateCheckInStreak(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let currentDate = new Date(today);

  for (let i = 0; i < 365; i++) {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const checkIn = await Mood.findOne({
      user: userId,
      isDailyCheckIn: true,
      entryDate: { $gte: currentDate, $lt: nextDay },
    });

    if (checkIn) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// @route   GET /api/mood/trend
// @desc    Get mood trend over time
// @access  Private
router.get("/trend", auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const trend = await Mood.getMoodTrend(req.user.id, parseInt(days));

    res.json({ trend });
  } catch (error) {
    console.error("Error fetching mood trend:", error);
    res.status(500).json({
      message: "Error fetching mood trend",
      error: error.message,
    });
  }
});

// @route   GET /api/mood/factors
// @desc    Get top mood factors
// @access  Private
router.get("/factors", auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const factors = await Mood.getTopFactors(req.user.id, parseInt(days));

    res.json({ factors });
  } catch (error) {
    console.error("Error fetching mood factors:", error);
    res.status(500).json({
      message: "Error fetching mood factors",
      error: error.message,
    });
  }
});

// @route   GET /api/mood/insights
// @desc    Get mood insights and patterns
// @access  Private
router.get("/insights", auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const daysInt = parseInt(days);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysInt);

    // Get all moods for the period
    const moods = await Mood.find({
      user: req.user.id,
      entryDate: { $gte: startDate },
    }).sort({ entryDate: 1 });

    if (moods.length === 0) {
      return res.json({
        insights: {
          patterns: [],
          recommendations: [],
          topActivities: [],
          moodByDayOfWeek: {},
        },
      });
    }

    // Analyze patterns
    const patterns = [];
    const recommendations = [];

    // Calculate average mood
    const avgMood =
      moods.reduce((sum, m) => sum + m.moodLevel, 0) / moods.length;

    // Mood trend
    const recentMoods = moods.slice(-7);
    const recentAvg =
      recentMoods.reduce((sum, m) => sum + m.moodLevel, 0) / recentMoods.length;

    if (recentAvg > avgMood + 0.5) {
      patterns.push({
        type: "positive",
        icon: "📈",
        message: "Your mood has been improving recently!",
      });
    } else if (recentAvg < avgMood - 0.5) {
      patterns.push({
        type: "negative",
        icon: "📉",
        message:
          "Your mood has been declining recently. Consider talking to someone.",
      });
      recommendations.push("Consider scheduling a session with a therapist");
    }

    // Activity analysis
    const activityMoodMap = {};
    moods.forEach((mood) => {
      mood.activities.forEach((activity) => {
        if (!activityMoodMap[activity]) {
          activityMoodMap[activity] = { total: 0, count: 0 };
        }
        activityMoodMap[activity].total += mood.moodLevel;
        activityMoodMap[activity].count++;
      });
    });

    const topActivities = Object.entries(activityMoodMap)
      .map(([activity, data]) => ({
        activity,
        avgMood: data.total / data.count,
        count: data.count,
      }))
      .sort((a, b) => b.avgMood - a.avgMood)
      .slice(0, 5);

    if (topActivities.length > 0) {
      patterns.push({
        type: "info",
        icon: "⭐",
        message: `${topActivities[0].activity} seems to boost your mood the most!`,
      });
      recommendations.push(
        `Try to include more ${topActivities[0].activity} in your routine`
      );
    }

    // Day of week analysis
    const dayOfWeekMoods = {};
    moods.forEach((mood) => {
      const dayOfWeek = new Date(mood.entryDate).getDay();
      if (!dayOfWeekMoods[dayOfWeek]) {
        dayOfWeekMoods[dayOfWeek] = { total: 0, count: 0 };
      }
      dayOfWeekMoods[dayOfWeek].total += mood.moodLevel;
      dayOfWeekMoods[dayOfWeek].count++;
    });

    const daysOfWeek = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const moodByDayOfWeek = {};
    Object.entries(dayOfWeekMoods).forEach(([day, data]) => {
      moodByDayOfWeek[daysOfWeek[day]] = data.total / data.count;
    });

    // Find best and worst days
    const bestDay = Object.entries(moodByDayOfWeek).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const worstDay = Object.entries(moodByDayOfWeek).sort(
      (a, b) => a[1] - b[1]
    )[0];

    if (bestDay && worstDay) {
      patterns.push({
        type: "info",
        icon: "📅",
        message: `You tend to feel best on ${bestDay[0]}s and struggle more on ${worstDay[0]}s`,
      });
    }

    // Energy vs Mood correlation
    const energyMoodCorrelation =
      moods.reduce((sum, m) => {
        return sum + (m.energyLevel - 3) * (m.moodLevel - 3);
      }, 0) / moods.length;

    if (energyMoodCorrelation > 0.5) {
      patterns.push({
        type: "info",
        icon: "⚡",
        message: "Your energy levels strongly affect your mood",
      });
      recommendations.push("Focus on activities that boost your energy");
    }

    // Stress analysis
    const avgStress =
      moods.reduce((sum, m) => sum + m.stressLevel, 0) / moods.length;
    if (avgStress > 3.5) {
      patterns.push({
        type: "warning",
        icon: "⚠️",
        message: "Your stress levels have been consistently high",
      });
      recommendations.push(
        "Consider stress management techniques like meditation or exercise"
      );
    }

    res.json({
      insights: {
        patterns,
        recommendations,
        topActivities,
        moodByDayOfWeek,
        avgMood: avgMood.toFixed(2),
        avgStress: avgStress.toFixed(2),
      },
    });
  } catch (error) {
    console.error("Error generating insights:", error);
    res.status(500).json({
      message: "Error generating insights",
      error: error.message,
    });
  }
});

// @route   GET /api/mood/today/check
// @desc    Check if user has completed today's check-in
// @access  Private
router.get("/today/check", auth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayCheckIn = await Mood.findOne({
      user: req.user.id,
      isDailyCheckIn: true,
      entryDate: { $gte: today, $lt: tomorrow },
    });

    res.json({
      hasCheckedIn: !!todayCheckIn,
      checkIn: todayCheckIn,
    });
  } catch (error) {
    console.error("Error checking today's mood:", error);
    res.status(500).json({
      message: "Error checking today's mood",
      error: error.message,
    });
  }
});

// @route   GET /api/mood/:id
// @desc    Get a specific mood entry
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const mood = await Mood.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!mood) {
      return res.status(404).json({ message: "Mood entry not found" });
    }

    res.json({ mood });
  } catch (error) {
    console.error("Error fetching mood entry:", error);
    res.status(500).json({
      message: "Error fetching mood entry",
      error: error.message,
    });
  }
});

// @route   PUT /api/mood/:id
// @desc    Update a mood entry
// @access  Private
router.put("/:id", auth, async (req, res) => {
  try {
    const {
      moodLevel,
      moodType,
      notes,
      activities,
      factors,
      energyLevel,
      stressLevel,
    } = req.body;

    const mood = await Mood.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!mood) {
      return res.status(404).json({ message: "Mood entry not found" });
    }

    // Update fields if provided
    if (moodLevel) mood.moodLevel = moodLevel;
    if (moodType) mood.moodType = moodType;
    if (notes !== undefined) mood.notes = notes;
    if (activities) mood.activities = activities;
    if (factors) mood.factors = factors;
    if (energyLevel) mood.energyLevel = energyLevel;
    if (stressLevel) mood.stressLevel = stressLevel;

    await mood.save();

    res.json({
      message: "Mood entry updated successfully",
      mood,
    });
  } catch (error) {
    console.error("Error updating mood entry:", error);
    res.status(500).json({
      message: "Error updating mood entry",
      error: error.message,
    });
  }
});

// @route   DELETE /api/mood/:id
// @desc    Delete a mood entry
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const mood = await Mood.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!mood) {
      return res.status(404).json({ message: "Mood entry not found" });
    }

    await mood.deleteOne();

    // Decrement user's mood entries count
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { "stats.moodEntries": -1 },
    });

    res.json({ message: "Mood entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting mood entry:", error);
    res.status(500).json({
      message: "Error deleting mood entry",
      error: error.message,
    });
  }
});

module.exports = router;
