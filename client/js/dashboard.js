// ============================================
// DASHBOARD FUNCTIONALITY
// ============================================

function initializeDashboard() {
  // Only initialize dashboard features if we're on the user dashboard
  if (!window.location.pathname.includes("userDashboard")) {
    return;
  }

  // Set dashboard as default section
  showSection("dashboard");

  // Load user stats
  loadDashboardStats();

  // Initialize mood selector
  initializeMoodSelector();

  // Initialize daily tips rotation
  initializeDailyContent();

  // Load recent activity
  loadRecentActivity();

  // Initialize visual charts
  initializeVisualCharts();
}

// Load and display dashboard statistics from server
async function loadDashboardStats() {
  console.log("Loading dashboard stats from server...");

  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.error("No auth token found");
      return;
    }

    // Get mood statistics from server
    const moodStatsResponse = await fetch(
      "http://localhost:5000/api/mood/stats?days=30",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const moodStatsData = await moodStatsResponse.json();
    console.log("Mood stats received:", moodStatsData);

    if (moodStatsResponse.ok && moodStatsData.stats) {
      const stats = moodStatsData.stats;

      // Update dashboard stats display
      const dashboardDaysActive = document.getElementById(
        "dashboardDaysActive"
      );
      const dashboardSessionsCompleted = document.getElementById(
        "dashboardSessionsCompleted"
      );
      const dashboardMoodEntries = document.getElementById(
        "dashboardMoodEntries"
      );
      const dashboardGoalsAchieved = document.getElementById(
        "dashboardGoalsAchieved"
      );

      // Calculate days active from check-in streak
      if (dashboardDaysActive) {
        dashboardDaysActive.textContent = stats.checkInStreak || 0;
      }

      // Sessions completed (for now, use total entries / 5 as estimate)
      if (dashboardSessionsCompleted) {
        const estimatedSessions = Math.floor((stats.totalEntries || 0) / 5);
        dashboardSessionsCompleted.textContent = estimatedSessions;
      }

      // Mood entries
      if (dashboardMoodEntries) {
        dashboardMoodEntries.textContent = stats.totalEntries || 0;
      }

      // Goals achieved (use check-in streak as goal achievement)
      if (dashboardGoalsAchieved) {
        const goalsAchieved = Math.floor((stats.checkInStreak || 0) / 2);
        dashboardGoalsAchieved.textContent = goalsAchieved;
      }

      // Store stats for use in charts
      window.dashboardStats = stats;

      // Update visual charts with real data
      if (typeof initializeVisualCharts === "function") {
        initializeVisualCharts();
      }
    }
  } catch (error) {
    console.error("Error loading dashboard stats:", error);
    // Fallback to default values
    const defaultElements = {
      dashboardDaysActive: 0,
      dashboardSessionsCompleted: 0,
      dashboardMoodEntries: 0,
      dashboardGoalsAchieved: 0,
    };

    Object.keys(defaultElements).forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.textContent = defaultElements[id];
    });
  }
}

// Initialize mood selector functionality
function initializeMoodSelector() {
  const moodButtons = document.querySelectorAll(".mood-btn");
  let selectedMood = null;

  moodButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      // Remove active class from all buttons
      moodButtons.forEach((b) => b.classList.remove("active"));

      // Add active class to clicked button
      this.classList.add("active");
      selectedMood = this.dataset.mood;
    });
  });
}

// Save daily wellness check-in
async function saveDailyWellness() {
  const selectedMood = document.querySelector(".mood-btn.active");
  const dailyNotes = document.getElementById("dailyNotes");

  if (!selectedMood) {
    showNotification("Please select your mood first", "warning");
    return;
  }

  const moodType = selectedMood.dataset.mood;
  const moodLevel = parseInt(selectedMood.dataset.level);

  const wellnessData = {
    moodType,
    moodLevel,
    notes: dailyNotes ? dailyNotes.value : "",
    energyLevel: 3, // Default values
    stressLevel: 3,
    activities: [],
    factors: [],
    isDailyCheckIn: true,
  };

  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      showNotification("Please login to save wellness check", "error");
      return;
    }

    const response = await fetch("http://localhost:5000/api/mood", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(wellnessData),
    });

    const data = await response.json();

    if (response.ok) {
      showNotification(
        data.message || "Wellness check saved successfully!",
        "success"
      );

      // Reload dashboard stats to reflect new entry
      loadDashboardStats();

      // Add to recent activity
      addRecentActivity(
        "mood",
        "Completed daily wellness check-in",
        "Just now"
      );

      // Clear form
      document
        .querySelectorAll(".mood-btn")
        .forEach((btn) => btn.classList.remove("active"));
      if (dailyNotes) {
        dailyNotes.value = "";
      }
    } else {
      showNotification(
        data.message || "Failed to save wellness check",
        "error"
      );
    }
  } catch (error) {
    console.error("Error saving wellness check:", error);
    showNotification("Error saving wellness check", "error");
  }
}

// Initialize daily tips and affirmations rotation
function initializeDailyContent() {
  const tips = [
    "Take time to breathe deeply and center yourself. Even 5 minutes of mindful breathing can reduce stress and improve your mood.",
    "Practice gratitude by writing down three things you're thankful for today.",
    "Take a short walk outside. Fresh air and movement can boost your mental energy.",
    "Connect with a friend or family member. Social connections are vital for mental health.",
    "Set small, achievable goals for today. Celebrating small wins builds confidence.",
    "Practice self-compassion. Treat yourself with the same kindness you'd show a good friend.",
    "Limit social media time today. Too much can increase anxiety and comparison.",
    "Try a new hobby or activity that brings you joy and helps you relax.",
  ];

  const affirmations = [
    "I am worthy of love, care, and happiness. I choose to be kind to myself today.",
    "I have the strength to overcome challenges and grow from them.",
    "My feelings are valid, and it's okay to take time to process them.",
    "I am capable of creating positive change in my life.",
    "I deserve peace and tranquility in my mind and heart.",
    "I am resilient and can handle whatever comes my way.",
    "I choose to focus on progress, not perfection.",
    "I am grateful for my journey and excited about my growth.",
  ];

  // Get today's tip and affirmation based on date
  const today = new Date().getDate();
  const dailyTip = tips[today % tips.length];
  const dailyAffirmation = affirmations[today % affirmations.length];

  // Update the content
  const tipElement = document.getElementById("dailyTip");
  const affirmationElement = document.getElementById("dailyAffirmation");

  if (tipElement) tipElement.textContent = dailyTip;
  if (affirmationElement) affirmationElement.textContent = dailyAffirmation;
}

// Add activity to recent activity list
function addRecentActivity(type, description, time) {
  const activityList = document.getElementById("activityList");
  if (!activityList) return;

  const icons = {
    mood: "😊",
    session: "✅",
    goal: "🎯",
    resource: "📚",
    support: "💬",
    profile: "👤",
  };

  const activityItem = document.createElement("div");
  activityItem.className = "activity-item";
  activityItem.innerHTML = `
    <div class="activity-icon">${icons[type] || "📊"}</div>
    <div class="activity-content">
      <h4>${description}</h4>
      <span class="activity-time">${time}</span>
    </div>
  `;

  // Add to the beginning of the list
  activityList.insertBefore(activityItem, activityList.firstChild);

  // Keep only last 5 activities visible
  const activities = activityList.querySelectorAll(".activity-item");
  if (activities.length > 5) {
    activities[activities.length - 1].remove();
  }
}

// Load recent activity from server
async function loadRecentActivity() {
  const activityList = document.getElementById("activityList");
  if (!activityList) return;

  try {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    // Get recent mood entries
    const response = await fetch("http://localhost:5000/api/mood?days=7", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok && data.moods && data.moods.length > 0) {
      // Clear existing activity items
      activityList.innerHTML = "";

      // Add welcome message
      const welcomeItem = document.createElement("div");
      welcomeItem.className = "activity-item";
      welcomeItem.innerHTML = `
        <div class="activity-icon">👋</div>
        <div class="activity-content">
          <h4>Welcome back!</h4>
          <span class="activity-time">Just now</span>
        </div>
      `;
      activityList.appendChild(welcomeItem);

      // Add recent mood entries as activities
      data.moods.slice(0, 4).forEach((mood) => {
        const date = new Date(mood.createdAt);
        const timeAgo = getTimeAgo(date);
        const moodEmoji = getMoodEmoji(mood.moodLevel);

        addRecentActivity(
          "mood",
          `${moodEmoji} Logged mood: ${mood.moodType}`,
          timeAgo
        );
      });
    }
  } catch (error) {
    console.error("Error loading recent activity:", error);
  }
}

// Helper function to get time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

// Helper function to get mood emoji
function getMoodEmoji(level) {
  const emojis = {
    1: "😭",
    2: "😢",
    3: "😐",
    4: "😊",
    5: "😄",
  };
  return emojis[level] || "😊";
}

// Update user stats display in multiple places
function updateUserStats(stats) {
  if (!stats) return;

  // Store stats in localStorage
  localStorage.setItem("userStats", JSON.stringify(stats));

  // Update user dashboard stats display
  if (window.location.pathname.includes("userDashboard")) {
    const statElements = {
      daysActive: document.querySelector(
        ".stat-card:nth-child(1) .stat-number"
      ),
      sessionsCompleted: document.querySelector(
        ".stat-card:nth-child(2) .stat-number"
      ),
      moodEntries: document.querySelector(
        ".stat-card:nth-child(3) .stat-number"
      ),
      goalsAchieved: document.querySelector(
        ".stat-card:nth-child(4) .stat-number"
      ),
    };

    Object.keys(statElements).forEach((key) => {
      if (statElements[key] && stats[key] !== undefined) {
        statElements[key].textContent = stats[key];
      }
    });

    // Also update dashboard specific elements
    loadDashboardStats();
  }
}

// Override the default section to show dashboard first
document.addEventListener("DOMContentLoaded", function () {
  // Set default active section to dashboard instead of awareness for user dashboard
  if (window.location.pathname.includes("userDashboard")) {
    const defaultSection = "dashboard";
    const defaultLink = document.querySelector(`a[href="#${defaultSection}"]`);
    if (defaultLink) {
      defaultLink.parentElement.classList.add("active");
      showSection(defaultSection);
    }
  } else {
    const defaultSection = "awareness";
    const defaultLink = document.querySelector(`a[href="#${defaultSection}"]`);
    if (defaultLink) {
      defaultLink.parentElement.classList.add("active");
    }
  }

  // Initialize video call functionality if on dashboard pages
  if (window.location.pathname.includes("Dashboard.html")) {
    if (typeof initializeVideoCall === "function") {
      initializeVideoCall();
    }
  }
});
