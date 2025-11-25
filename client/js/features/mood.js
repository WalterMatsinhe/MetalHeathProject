// ============================================
// SIMPLIFIED MOOD TRACKING
// ============================================

let moodChart = null;
let moodTrendChart = null;

// Main initialization
function initializeMoodTracking() {
  console.log("Initializing mood tracking...");
  loadMoodHistory();
  loadMoodStats();
  initializeMoodCharts();
  initializeMoodEventListeners();
}

// Event listeners
function initializeMoodEventListeners() {
  // Quick mood selection
  const quickMoodButtons = document.querySelectorAll(".quick-mood-btn");
  quickMoodButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      quickMoodButtons.forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
    });
  });

  // Form submission
  const moodForm = document.getElementById("moodEntryForm");
  if (moodForm) {
    moodForm.addEventListener("submit", handleMoodEntrySubmit);
  }

  // Period selector
  const periodSelector = document.getElementById("moodPeriodSelector");
  if (periodSelector) {
    periodSelector.addEventListener("change", function () {
      loadMoodHistory(this.value);
      loadMoodStats(this.value);
      updateMoodCharts(this.value);
    });
  }
}

// Save mood entry
async function handleMoodEntrySubmit(e) {
  e.preventDefault();

  const activeMoodBtn = document.querySelector(".quick-mood-btn.active");
  if (!activeMoodBtn) {
    showNotification("Please select your mood", "warning");
    return;
  }

  const moodType = activeMoodBtn.dataset.mood;
  const moodLevel = parseInt(activeMoodBtn.dataset.level);

  const formData = {
    moodType,
    moodLevel,
    notes: document.getElementById("moodNotes")?.value || "",
    energyLevel: parseInt(document.getElementById("energyLevel")?.value) || 3,
    stressLevel: parseInt(document.getElementById("stressLevel")?.value) || 3,
    activities: getSelectedCheckboxValues("moodActivities"),
    factors: getSelectedCheckboxValues("moodFactors"),
    isDailyCheckIn: document.getElementById("isDailyCheckIn")?.checked || false,
  };

  try {
    const token = sessionStorage.getItem("authToken");
    const response = await fetch("http://localhost:5000/api/mood", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (response.ok) {
      showNotification("Mood entry saved! 🎉", "success");

      // Reset form
      document.getElementById("moodEntryForm").reset();
      document.querySelectorAll(".quick-mood-btn").forEach((b) => b.classList.remove("active"));

      // Update mood stat in user profile
      await updateMoodStatInDatabase(token);

      // Reload all mood data
      loadMoodHistory();
      loadMoodStats();
      updateMoodCharts();

      // Refresh profile if available
      if (typeof loadUserProfileData === "function") {
        await loadUserProfileData();
      }
    } else {
      showNotification(data.message || "Failed to save mood entry", "error");
    }
  } catch (error) {
    console.error("Error saving mood entry:", error);
    showNotification("Error saving mood entry", "error");
  }
}

// Update mood count in user stats
async function updateMoodStatInDatabase(token) {
  try {
    const response = await fetch("http://localhost:5000/api/mood/count", {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    const data = await response.json();
    const moodEntriesCount = data.count || 0;

    await fetch("http://localhost:5000/api/profile/stats", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ moodEntries: moodEntriesCount }),
    }).catch(() => {
      console.log("Stats update skipped - endpoint not available");
    });
  } catch (error) {
    console.error("Error updating mood stats:", error);
  }
}

// Load mood history
async function loadMoodHistory(days = 30) {
  try {
    const token = sessionStorage.getItem("authToken");
    const response = await fetch(`http://localhost:5000/api/mood?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (response.ok) {
      displayMoodHistory(data.moods);
    }
  } catch (error) {
    console.error("Error loading mood history:", error);
  }
}

// Display mood history
function displayMoodHistory(moods) {
  const historyContainer = document.getElementById("moodHistoryList");
  if (!historyContainer) return;

  if (!moods || moods.length === 0) {
    historyContainer.innerHTML = `
      <div class="empty-state">
        <p>No mood entries yet. Start tracking your mood! 😊</p>
      </div>
    `;
    return;
  }

  const moodEmojis = {
    "very-sad": "😭",
    sad: "😢",
    neutral: "😐",
    happy: "😊",
    "very-happy": "😄",
  };

  const moodColors = {
    "very-sad": "#e74c3c",
    sad: "#e67e22",
    neutral: "#f39c12",
    happy: "#2ecc71",
    "very-happy": "#27ae60",
  };

  historyContainer.innerHTML = moods
    .map((mood) => {
      const date = new Date(mood.entryDate);
      const formattedDate = date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const formattedTime = date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      return `
      <div class="mood-history-item" style="border-left: 4px solid ${moodColors[mood.moodType]}">
        <div class="mood-history-header">
          <div class="mood-emoji">${moodEmojis[mood.moodType]}</div>
          <div class="mood-history-info">
            <h4>${mood.moodType.replace("-", " ")}</h4>
            <span class="mood-date">${formattedDate} at ${formattedTime}</span>
          </div>
        </div>
        ${mood.notes ? `<p class="mood-notes">${mood.notes}</p>` : ""}
        <div class="mood-levels">
          <span class="level-badge">⚡ Energy: ${mood.energyLevel}/5</span>
          <span class="level-badge">😰 Stress: ${mood.stressLevel}/5</span>
        </div>
      </div>
    `;
    })
    .join("");
}

// Load mood statistics
async function loadMoodStats(days = 30) {
  try {
    const token = sessionStorage.getItem("authToken");
    const response = await fetch(`http://localhost:5000/api/mood/stats?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (response.ok && data.stats) {
      displayMoodStats(data.stats);
    }
  } catch (error) {
    console.error("Error loading mood stats:", error);
  }
}

// Display mood statistics
function displayMoodStats(stats) {
  if (!stats) return;

  const updates = {
    avgMood: stats.averageMood?.toFixed(1) || "N/A",
    avgEnergy: stats.averageEnergy?.toFixed(1) || "N/A",
    avgStress: stats.averageStress?.toFixed(1) || "N/A",
    totalMoodEntries: stats.totalEntries || 0,
  };

  Object.entries(updates).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });

  // Update insight cards
  updateInsightCards(stats);
}

// Update simple insight cards with trends
function updateInsightCards(stats) {
  if (!stats) return;

  // Determine mood trend
  const avgMood = stats.averageMood || 0;
  const moodElement = document.getElementById("moodTrendText");
  if (moodElement) {
    if (avgMood >= 4) moodElement.textContent = "Great! 😄";
    else if (avgMood >= 3) moodElement.textContent = "Good 😊";
    else if (avgMood >= 2) moodElement.textContent = "Fair 😐";
    else moodElement.textContent = "Needs Support 😟";
  }

  // Energy level
  const avgEnergy = stats.averageEnergy || 0;
  const energyElement = document.getElementById("energyTrendText");
  if (energyElement) {
    if (avgEnergy >= 4) energyElement.textContent = "High ⚡";
    else if (avgEnergy >= 3) energyElement.textContent = "Good 🔌";
    else energyElement.textContent = "Low 🪫";
  }

  // Stress level
  const avgStress = stats.averageStress || 0;
  const stressElement = document.getElementById("stressTrendText");
  if (stressElement) {
    if (avgStress <= 2) stressElement.textContent = "Relaxed ✨";
    else if (avgStress <= 3) stressElement.textContent = "Manageable 🙂";
    else stressElement.textContent = "Elevated 😰";
  }
}

// Initialize mood charts
function initializeMoodCharts() {
  if (typeof Chart === "undefined") return;

  // Mood distribution chart
  const moodChartCanvas = document.getElementById("moodDistributionChart");
  if (moodChartCanvas) {
    const ctx = moodChartCanvas.getContext("2d");
    if (moodChart) moodChart.destroy();

    moodChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Very Happy 😄", "Happy 😊", "Neutral 😐", "Sad 😢", "Very Sad 😭"],
        datasets: [
          {
            data: [0, 0, 0, 0, 0],
            backgroundColor: ["#27ae60", "#2ecc71", "#f39c12", "#e67e22", "#e74c3c"],
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { padding: 15 } },
        },
      },
    });
  }

  // Mood trend chart
  const trendChartCanvas = document.getElementById("moodTrendChart");
  if (trendChartCanvas) {
    const ctx = trendChartCanvas.getContext("2d");
    if (moodTrendChart) moodTrendChart.destroy();

    moodTrendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Mood",
            data: [],
            borderColor: "#3498db",
            backgroundColor: "rgba(52, 152, 219, 0.1)",
            tension: 0.4,
            fill: true,
          },
          {
            label: "Energy",
            data: [],
            borderColor: "#f39c12",
            backgroundColor: "rgba(243, 156, 18, 0.1)",
            tension: 0.4,
            fill: true,
          },
          {
            label: "Stress",
            data: [],
            borderColor: "#e74c3c",
            backgroundColor: "rgba(231, 76, 60, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, max: 5 },
        },
        plugins: {
          legend: { position: "top" },
        },
      },
    });
  }

  updateMoodCharts();
}

// Update mood charts with data
async function updateMoodCharts(days = 30) {
  try {
    const token = sessionStorage.getItem("authToken");

    // Get trend data
    const trendResponse = await fetch(`http://localhost:5000/api/mood/trend?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const trendData = await trendResponse.json();
    if (trendResponse.ok && trendData.trend && moodTrendChart) {
      const sortedTrend = trendData.trend.sort((a, b) => new Date(a._id) - new Date(b._id));

      const labels = sortedTrend.map((t) => {
        const date = new Date(t._id);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      });

      moodTrendChart.data.labels = labels;
      moodTrendChart.data.datasets[0].data = sortedTrend.map((t) => t.averageMood || 0);
      moodTrendChart.data.datasets[1].data = sortedTrend.map((t) => t.averageEnergy || 0);
      moodTrendChart.data.datasets[2].data = sortedTrend.map((t) => t.averageStress || 0);
      moodTrendChart.update("active");
    }

    // Get mood distribution
    const moodResponse = await fetch(`http://localhost:5000/api/mood?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const moodData = await moodResponse.json();
    if (moodResponse.ok && moodData.moods && moodChart) {
      const distribution = {
        "very-happy": 0,
        happy: 0,
        neutral: 0,
        sad: 0,
        "very-sad": 0,
      };

      moodData.moods.forEach((mood) => {
        distribution[mood.moodType]++;
      });

      moodChart.data.datasets[0].data = [
        distribution["very-happy"],
        distribution.happy,
        distribution.neutral,
        distribution.sad,
        distribution["very-sad"],
      ];
      moodChart.update("active");
    }
  } catch (error) {
    console.error("Error updating mood charts:", error);
  }
}

// Helper: Get selected checkbox values
function getSelectedCheckboxValues(name) {
  const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
  return Array.from(checkboxes).map((cb) => cb.value);
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", function () {
  if (window.location.pathname.includes("userDashboard")) {
    const moodSection = document.getElementById("mood");
    if (moodSection && !moodSection.classList.contains("content-section-hidden")) {
      initializeMoodTracking();
    }
  }
});

