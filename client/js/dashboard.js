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

// Load and display dashboard statistics
function loadDashboardStats() {
  const stats = getUserStats();

  // Update dashboard stats display
  const dashboardDaysActive = document.getElementById("dashboardDaysActive");
  const dashboardSessionsCompleted = document.getElementById(
    "dashboardSessionsCompleted"
  );
  const dashboardMoodEntries = document.getElementById("dashboardMoodEntries");
  const dashboardGoalsAchieved = document.getElementById(
    "dashboardGoalsAchieved"
  );

  if (dashboardDaysActive)
    dashboardDaysActive.textContent = stats.daysActive || 0;
  if (dashboardSessionsCompleted)
    dashboardSessionsCompleted.textContent = stats.sessionsCompleted || 0;
  if (dashboardMoodEntries)
    dashboardMoodEntries.textContent = stats.moodEntries || 0;
  if (dashboardGoalsAchieved)
    dashboardGoalsAchieved.textContent = stats.goalsAchieved || 0;
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
function saveDailyWellness() {
  const selectedMood = document.querySelector(".mood-btn.active");
  const dailyNotes = document.getElementById("dailyNotes");

  if (!selectedMood) {
    showNotification("Please select your mood first", "warning");
    return;
  }

  const wellnessData = {
    mood: selectedMood.dataset.mood,
    notes: dailyNotes ? dailyNotes.value : "",
    date: new Date().toISOString().split("T")[0],
  };

  // Save to localStorage (in real app, this would be sent to server)
  let wellnessHistory =
    JSON.parse(localStorage.getItem("wellnessHistory")) || [];

  // Check if entry for today already exists
  const today = wellnessData.date;
  const existingEntry = wellnessHistory.findIndex(
    (entry) => entry.date === today
  );

  if (existingEntry !== -1) {
    wellnessHistory[existingEntry] = wellnessData;
    showNotification("Today's wellness check updated successfully!", "success");
  } else {
    wellnessHistory.push(wellnessData);
    showNotification("Wellness check saved successfully!", "success");

    // Update mood entries count
    const stats = getUserStats();
    stats.moodEntries = (stats.moodEntries || 0) + 1;
    updateUserStats(stats);
    loadDashboardStats();
  }

  localStorage.setItem("wellnessHistory", JSON.stringify(wellnessHistory));

  // Add to recent activity
  addRecentActivity("mood", "Completed daily wellness check-in", "Just now");

  // Clear form
  document
    .querySelectorAll(".mood-btn")
    .forEach((btn) => btn.classList.remove("active"));
  if (dailyNotes) {
    dailyNotes.value = "";
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

// Load recent activity from localStorage
function loadRecentActivity() {
  const recentActivity =
    JSON.parse(localStorage.getItem("recentActivity")) || [];
  const activityList = document.getElementById("activityList");

  if (!activityList || recentActivity.length === 0) return;

  // Clear existing activity (except welcome message)
  const existingActivities = activityList.querySelectorAll(".activity-item");
  existingActivities.forEach((item, index) => {
    if (index > 0) item.remove(); // Keep first welcome message
  });

  // Add recent activities
  recentActivity.slice(0, 4).forEach((activity) => {
    addRecentActivity(activity.type, activity.description, activity.time);
  });
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
