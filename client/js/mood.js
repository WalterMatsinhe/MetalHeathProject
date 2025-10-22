// ============================================
// MOOD TRACKING FUNCTIONALITY
// ============================================

let moodChart = null;
let moodTrendChart = null;

// Initialize mood tracking functionality
function initializeMoodTracking() {
  console.log("Initializing mood tracking...");

  // Load mood history
  loadMoodHistory();

  // Load mood statistics
  loadMoodStats();

  // Load mood insights
  loadMoodInsights();

  // Initialize mood charts
  initializeMoodCharts();

  // Check if today's check-in is complete
  checkTodayMoodEntry();

  // Initialize event listeners
  initializeMoodEventListeners();
}

// Initialize event listeners for mood tracking
function initializeMoodEventListeners() {
  // Quick mood entry buttons
  const quickMoodButtons = document.querySelectorAll(".quick-mood-btn");
  quickMoodButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      quickMoodButtons.forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
    });
  });

  // Mood form submission
  const moodForm = document.getElementById("moodEntryForm");
  if (moodForm) {
    moodForm.addEventListener("submit", handleMoodEntrySubmit);
  }

  // Time period selector for mood history
  const periodSelector = document.getElementById("moodPeriodSelector");
  if (periodSelector) {
    periodSelector.addEventListener("change", function () {
      loadMoodHistory(this.value);
      loadMoodStats(this.value);
      loadMoodInsights(this.value);
    });
  }
}

// Handle mood entry form submission
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
    const token = localStorage.getItem("authToken");
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
      showNotification(data.message || "Mood entry saved!", "success");

      // Reset form
      document.getElementById("moodEntryForm").reset();
      document
        .querySelectorAll(".quick-mood-btn")
        .forEach((b) => b.classList.remove("active"));

      // Reload mood data
      loadMoodHistory();
      loadMoodStats();
      checkTodayMoodEntry();

      // Update dashboard stats if we're tracking mood entries
      loadDashboardStats();
    } else {
      showNotification(data.message || "Failed to save mood entry", "error");
    }
  } catch (error) {
    console.error("Error saving mood entry:", error);
    showNotification("Error saving mood entry", "error");
  }
}

// Load mood history
async function loadMoodHistory(days = 30) {
  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(
      `http://localhost:5000/api/mood?days=${days}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (response.ok) {
      displayMoodHistory(data.moods);
    } else {
      console.error("Failed to load mood history:", data.message);
    }
  } catch (error) {
    console.error("Error loading mood history:", error);
  }
}

// Display mood history in the UI
function displayMoodHistory(moods) {
  const historyContainer = document.getElementById("moodHistoryList");
  if (!historyContainer) return;

  if (!moods || moods.length === 0) {
    historyContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">😊</div>
        <p>No mood entries yet</p>
        <p class="empty-desc">Start tracking your mood to see your history here</p>
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
        year: "numeric",
      });
      const formattedTime = date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

      return `
      <div class="mood-history-item" style="border-left: 4px solid ${
        moodColors[mood.moodType]
      }">
        <div class="mood-history-header">
          <div class="mood-emoji">${moodEmojis[mood.moodType]}</div>
          <div class="mood-history-info">
            <h4>${mood.moodType.replace("-", " ")}</h4>
            <span class="mood-date">${formattedDate} at ${formattedTime}</span>
            ${
              mood.isDailyCheckIn
                ? '<span class="badge">Daily Check-in</span>'
                : ""
            }
          </div>
        </div>
        ${mood.notes ? `<p class="mood-notes">${mood.notes}</p>` : ""}
        <div class="mood-levels">
          <span class="level-badge">Energy: ${"⚡".repeat(
            mood.energyLevel
          )}</span>
          <span class="level-badge">Stress: ${"😰".repeat(
            mood.stressLevel
          )}</span>
        </div>
        ${
          mood.activities && mood.activities.length > 0
            ? `
          <div class="mood-tags">
            <span class="tag-label">Activities:</span>
            ${mood.activities
              .map((a) => `<span class="tag">${a}</span>`)
              .join("")}
          </div>
        `
            : ""
        }
        ${
          mood.factors && mood.factors.length > 0
            ? `
          <div class="mood-tags">
            <span class="tag-label">Factors:</span>
            ${mood.factors
              .map((f) => `<span class="tag factor">${f}</span>`)
              .join("")}
          </div>
        `
            : ""
        }
      </div>
    `;
    })
    .join("");
}

// Load mood statistics
async function loadMoodStats(days = 30) {
  console.log(`Loading mood stats for ${days} days...`);
  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(
      `http://localhost:5000/api/mood/stats?days=${days}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    console.log("Mood stats response:", data);

    if (response.ok) {
      if (data.stats) {
        console.log("Displaying stats:", data.stats);
        displayMoodStats(data.stats);
        updateMoodCharts(days);
      } else {
        console.warn("No stats in response");
      }
    } else {
      console.error("Failed to load mood stats:", data.message);
    }
  } catch (error) {
    console.error("Error loading mood stats:", error);
  }
}

// Display mood statistics
function displayMoodStats(stats) {
  console.log("displayMoodStats called with:", stats);

  if (!stats) {
    console.warn("No stats to display");
    return;
  }

  // Update average mood
  const avgMoodElement = document.getElementById("avgMood");
  if (avgMoodElement) {
    const avgMoodValue = stats.averageMood
      ? stats.averageMood.toFixed(1)
      : "N/A";
    avgMoodElement.textContent = avgMoodValue;
    console.log("Updated avgMood to:", avgMoodValue);
  } else {
    console.error("avgMood element not found");
  }

  // Update average energy
  const avgEnergyElement = document.getElementById("avgEnergy");
  if (avgEnergyElement) {
    const avgEnergyValue = stats.averageEnergy
      ? stats.averageEnergy.toFixed(1)
      : "N/A";
    avgEnergyElement.textContent = avgEnergyValue;
    console.log("Updated avgEnergy to:", avgEnergyValue);
  } else {
    console.error("avgEnergy element not found");
  }

  // Update average stress
  const avgStressElement = document.getElementById("avgStress");
  if (avgStressElement) {
    const avgStressValue = stats.averageStress
      ? stats.averageStress.toFixed(1)
      : "N/A";
    avgStressElement.textContent = avgStressValue;
    console.log("Updated avgStress to:", avgStressValue);
  } else {
    console.error("avgStress element not found");
  }

  // Update total entries
  const totalEntriesElement = document.getElementById("totalMoodEntries");
  if (totalEntriesElement) {
    totalEntriesElement.textContent = stats.totalEntries || 0;
    console.log("Updated totalMoodEntries to:", stats.totalEntries || 0);
  } else {
    console.error("totalMoodEntries element not found");
  }

  // Update check-in streak
  const streakElement = document.getElementById("checkInStreak");
  if (streakElement) {
    streakElement.textContent = stats.checkInStreak || 0;
    console.log("Updated checkInStreak to:", stats.checkInStreak || 0);
  } else {
    console.error("checkInStreak element not found");
  }

  // Update mood distribution if available
  if (stats.moodDistribution && moodChart) {
    const distribution = stats.moodDistribution;
    moodChart.data.datasets[0].data = [
      distribution["very-happy"] || 0,
      distribution["happy"] || 0,
      distribution["neutral"] || 0,
      distribution["sad"] || 0,
      distribution["very-sad"] || 0,
    ];
    moodChart.update();
  }

  // Display best and worst days
  if (stats.bestDay) {
    const bestDayElement = document.getElementById("bestDay");
    if (bestDayElement) {
      const date = new Date(stats.bestDay.date);
      bestDayElement.innerHTML = `
        <strong>${date.toLocaleDateString()}</strong>
        <span class="mood-emoji">${getMoodEmoji(stats.bestDay.level)}</span>
      `;
    }
  }

  if (stats.worstDay) {
    const worstDayElement = document.getElementById("worstDay");
    if (worstDayElement) {
      const date = new Date(stats.worstDay.date);
      worstDayElement.innerHTML = `
        <strong>${date.toLocaleDateString()}</strong>
        <span class="mood-emoji">${getMoodEmoji(stats.worstDay.level)}</span>
      `;
    }
  }
}

// Initialize mood charts
function initializeMoodCharts() {
  console.log("Initializing mood charts...");
  console.log("Chart.js available:", typeof Chart !== "undefined");

  // Mood distribution chart
  const moodChartCanvas = document.getElementById("moodDistributionChart");
  console.log("Mood distribution canvas found:", !!moodChartCanvas);

  if (moodChartCanvas && typeof Chart !== "undefined") {
    const ctx = moodChartCanvas.getContext("2d");

    // Destroy existing chart if it exists
    if (moodChart) {
      moodChart.destroy();
    }

    moodChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: [
          "Very Happy 😄",
          "Happy 😊",
          "Neutral 😐",
          "Sad 😢",
          "Very Sad 😭",
        ],
        datasets: [
          {
            data: [0, 0, 0, 0, 0],
            backgroundColor: [
              "#27ae60",
              "#2ecc71",
              "#f39c12",
              "#e67e22",
              "#e74c3c",
            ],
            borderWidth: 2,
            borderColor: "#fff",
            hoverOffset: 15,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 15,
              font: {
                size: 12,
                family: "'Inter', sans-serif",
              },
              usePointStyle: true,
              pointStyle: "circle",
            },
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            cornerRadius: 8,
            titleFont: {
              size: 14,
              weight: "bold",
            },
            bodyFont: {
              size: 13,
            },
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage =
                  total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${label}: ${value} entries (${percentage}%)`;
              },
            },
          },
        },
        animation: {
          animateRotate: true,
          animateScale: true,
        },
      },
    });
    console.log("Mood distribution chart created successfully");
  } else {
    console.error("Failed to create mood distribution chart:", {
      canvasFound: !!moodChartCanvas,
      chartJsLoaded: typeof Chart !== "undefined",
    });
  }

  // Mood trend chart
  const trendChartCanvas = document.getElementById("moodTrendChart");
  console.log("Mood trend canvas found:", !!trendChartCanvas);

  if (trendChartCanvas && typeof Chart !== "undefined") {
    const ctx = trendChartCanvas.getContext("2d");

    // Destroy existing chart if it exists
    if (moodTrendChart) {
      moodTrendChart.destroy();
    }

    moodTrendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Mood Level",
            data: [],
            borderColor: "#3498db",
            backgroundColor: "rgba(52, 152, 219, 0.1)",
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "#3498db",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            borderWidth: 3,
          },
          {
            label: "Energy Level",
            data: [],
            borderColor: "#f39c12",
            backgroundColor: "rgba(243, 156, 18, 0.1)",
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "#f39c12",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            borderWidth: 3,
          },
          {
            label: "Stress Level",
            data: [],
            borderColor: "#e74c3c",
            backgroundColor: "rgba(231, 76, 60, 0.1)",
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "#e74c3c",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            borderWidth: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false,
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 5,
            ticks: {
              stepSize: 1,
              callback: function (value) {
                const labels = [
                  "",
                  "Very Low",
                  "Low",
                  "Medium",
                  "High",
                  "Very High",
                ];
                return labels[value] || value;
              },
              font: {
                size: 11,
              },
            },
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
          },
          x: {
            grid: {
              color: "rgba(0, 0, 0, 0.05)",
            },
            ticks: {
              font: {
                size: 11,
              },
              maxRotation: 45,
              minRotation: 0,
            },
          },
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              padding: 15,
              font: {
                size: 12,
                family: "'Inter', sans-serif",
              },
              usePointStyle: true,
              pointStyle: "circle",
            },
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            padding: 12,
            cornerRadius: 8,
            titleFont: {
              size: 14,
              weight: "bold",
            },
            bodyFont: {
              size: 13,
            },
            callbacks: {
              title: function (tooltipItems) {
                return tooltipItems[0].label;
              },
              label: function (context) {
                const label = context.dataset.label || "";
                const value = context.parsed.y;
                const levels = [
                  "Very Low",
                  "Low",
                  "Medium",
                  "High",
                  "Very High",
                ];
                const levelText = levels[value - 1] || value;
                return `${label}: ${levelText} (${value}/5)`;
              },
            },
          },
        },
        animation: {
          duration: 1000,
          easing: "easeInOutQuart",
        },
      },
    });
    console.log("Mood trend chart created successfully");
  } else {
    console.error("Failed to create mood trend chart:", {
      canvasFound: !!trendChartCanvas,
      chartJsLoaded: typeof Chart !== "undefined",
    });
  }

  // Update charts with data after initialization
  setTimeout(() => {
    updateMoodCharts();
  }, 500);
}

// Update mood charts with data
async function updateMoodCharts(days = 30) {
  console.log("Updating mood charts with data for", days, "days...");
  try {
    const token = localStorage.getItem("authToken");

    if (!token) {
      console.error("No auth token found");
      return;
    }

    // Get mood trend data
    const trendResponse = await fetch(
      `http://localhost:5000/api/mood/trend?days=${days}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const trendData = await trendResponse.json();
    console.log("Trend data received:", trendData);

    if (trendResponse.ok && trendData.trend && moodTrendChart) {
      // Sort trend data by date
      const sortedTrend = trendData.trend.sort(
        (a, b) => new Date(a._id) - new Date(b._id)
      );

      const labels = sortedTrend.map((t) => {
        const date = new Date(t._id);
        // Format date based on time period
        if (days <= 7) {
          return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
        } else if (days <= 30) {
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          });
        } else {
          return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "2-digit",
          });
        }
      });

      const moodValues = sortedTrend.map((t) => t.averageMood || 0);
      const energyValues = sortedTrend.map((t) => t.averageEnergy || 0);
      const stressValues = sortedTrend.map((t) => t.averageStress || 0);

      moodTrendChart.data.labels = labels;
      moodTrendChart.data.datasets[0].data = moodValues;
      moodTrendChart.data.datasets[1].data = energyValues;
      moodTrendChart.data.datasets[2].data = stressValues;
      moodTrendChart.update("active");

      console.log(
        "Mood trend chart updated with",
        moodValues.length,
        "data points"
      );

      // Display trend summary
      displayTrendSummary(moodValues, energyValues, stressValues);
    } else {
      console.warn("Cannot update trend chart:", {
        responseOk: trendResponse.ok,
        hasTrendData: !!trendData.trend,
        chartExists: !!moodTrendChart,
      });
    }

    // Get mood distribution
    const moodResponse = await fetch(
      `http://localhost:5000/api/mood?days=${days}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const moodData = await moodResponse.json();
    console.log("Mood distribution data received:", moodData);

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

      const distributionArray = [
        distribution["very-happy"],
        distribution.happy,
        distribution.neutral,
        distribution.sad,
        distribution["very-sad"],
      ];

      moodChart.data.datasets[0].data = distributionArray;
      moodChart.update("active");

      console.log("Mood distribution chart updated:", distributionArray);

      // Display distribution summary
      displayDistributionSummary(distribution, moodData.moods.length);
    } else {
      console.warn("Cannot update distribution chart:", {
        responseOk: moodResponse.ok,
        hasMoodData: !!moodData.moods,
        chartExists: !!moodChart,
      });
    }
  } catch (error) {
    console.error("Error updating mood charts:", error);
  }
}

// Check if today's mood entry exists
async function checkTodayMoodEntry() {
  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch("http://localhost:5000/api/mood/today/check", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      const checkInStatus = document.getElementById("todayCheckInStatus");
      if (checkInStatus) {
        if (data.hasCheckedIn) {
          checkInStatus.innerHTML = `
            <div class="check-in-complete">
              <span class="check-icon">✓</span>
              <span>Today's check-in complete!</span>
            </div>
          `;
        } else {
          checkInStatus.innerHTML = `
            <div class="check-in-pending">
              <span class="pending-icon">⏰</span>
              <span>Don't forget your daily check-in</span>
            </div>
          `;
        }
      }
    }
  } catch (error) {
    console.error("Error checking today's mood entry:", error);
  }
}

// Display trend summary with insights
function displayTrendSummary(moodValues, energyValues, stressValues) {
  const trendSummaryContainer = document.getElementById("trendSummary");
  if (!trendSummaryContainer) return;

  if (moodValues.length === 0) {
    trendSummaryContainer.innerHTML =
      '<p class="text-muted">No trend data available yet</p>';
    return;
  }

  // Calculate trends
  const moodTrend = calculateTrend(moodValues);
  const energyTrend = calculateTrend(energyValues);
  const stressTrend = calculateTrend(stressValues);

  // Calculate averages
  const avgMood = (
    moodValues.reduce((a, b) => a + b, 0) / moodValues.length
  ).toFixed(1);
  const avgEnergy = (
    energyValues.reduce((a, b) => a + b, 0) / energyValues.length
  ).toFixed(1);
  const avgStress = (
    stressValues.reduce((a, b) => a + b, 0) / stressValues.length
  ).toFixed(1);

  // Calculate volatility (standard deviation)
  const moodVolatility = calculateVolatility(moodValues);

  trendSummaryContainer.innerHTML = `
    <div class="trend-summary-grid">
      <div class="trend-item ${
        moodTrend > 0
          ? "trend-up"
          : moodTrend < 0
          ? "trend-down"
          : "trend-stable"
      }">
        <div class="trend-icon">${
          moodTrend > 0 ? "📈" : moodTrend < 0 ? "📉" : "➡️"
        }</div>
        <div class="trend-info">
          <span class="trend-label">Mood Trend</span>
          <span class="trend-value">${
            moodTrend > 0 ? "Improving" : moodTrend < 0 ? "Declining" : "Stable"
          }</span>
          <span class="trend-avg">Avg: ${avgMood}/5</span>
        </div>
      </div>
      
      <div class="trend-item ${
        energyTrend > 0
          ? "trend-up"
          : energyTrend < 0
          ? "trend-down"
          : "trend-stable"
      }">
        <div class="trend-icon">${
          energyTrend > 0 ? "⚡" : energyTrend < 0 ? "🔋" : "➡️"
        }</div>
        <div class="trend-info">
          <span class="trend-label">Energy Trend</span>
          <span class="trend-value">${
            energyTrend > 0
              ? "Increasing"
              : energyTrend < 0
              ? "Decreasing"
              : "Stable"
          }</span>
          <span class="trend-avg">Avg: ${avgEnergy}/5</span>
        </div>
      </div>
      
      <div class="trend-item ${
        stressTrend < 0
          ? "trend-up"
          : stressTrend > 0
          ? "trend-down"
          : "trend-stable"
      }">
        <div class="trend-icon">${
          stressTrend < 0 ? "✨" : stressTrend > 0 ? "😰" : "➡️"
        }</div>
        <div class="trend-info">
          <span class="trend-label">Stress Trend</span>
          <span class="trend-value">${
            stressTrend < 0
              ? "Decreasing"
              : stressTrend > 0
              ? "Increasing"
              : "Stable"
          }</span>
          <span class="trend-avg">Avg: ${avgStress}/5</span>
        </div>
      </div>
      
      <div class="trend-item">
        <div class="trend-icon">${
          moodVolatility < 0.5 ? "🎯" : moodVolatility < 1 ? "📊" : "🎢"
        }</div>
        <div class="trend-info">
          <span class="trend-label">Mood Stability</span>
          <span class="trend-value">${
            moodVolatility < 0.5
              ? "Very Stable"
              : moodVolatility < 1
              ? "Stable"
              : "Variable"
          }</span>
          <span class="trend-avg">Volatility: ${moodVolatility.toFixed(
            2
          )}</span>
        </div>
      </div>
    </div>
  `;
}

// Display distribution summary
function displayDistributionSummary(distribution, total) {
  const distributionSummaryContainer = document.getElementById(
    "distributionSummary"
  );
  if (!distributionSummaryContainer) return;

  if (total === 0) {
    distributionSummaryContainer.innerHTML =
      '<p class="text-muted">No distribution data available yet</p>';
    return;
  }

  const positiveCount = distribution["very-happy"] + distribution.happy;
  const negativeCount = distribution.sad + distribution["very-sad"];
  const neutralCount = distribution.neutral;

  const positivePercent = ((positiveCount / total) * 100).toFixed(1);
  const negativePercent = ((negativeCount / total) * 100).toFixed(1);
  const neutralPercent = ((neutralCount / total) * 100).toFixed(1);

  const dominantMood = Object.keys(distribution).reduce((a, b) =>
    distribution[a] > distribution[b] ? a : b
  );

  const moodLabels = {
    "very-happy": "Very Happy 😄",
    happy: "Happy 😊",
    neutral: "Neutral 😐",
    sad: "Sad 😢",
    "very-sad": "Very Sad 😭",
  };

  distributionSummaryContainer.innerHTML = `
    <div class="distribution-summary-grid">
      <div class="distribution-item positive">
        <div class="distribution-icon">😊</div>
        <div class="distribution-info">
          <span class="distribution-label">Positive Moods</span>
          <span class="distribution-value">${positivePercent}%</span>
          <span class="distribution-count">${positiveCount} entries</span>
        </div>
      </div>
      
      <div class="distribution-item neutral">
        <div class="distribution-icon">😐</div>
        <div class="distribution-info">
          <span class="distribution-label">Neutral Moods</span>
          <span class="distribution-value">${neutralPercent}%</span>
          <span class="distribution-count">${neutralCount} entries</span>
        </div>
      </div>
      
      <div class="distribution-item negative">
        <div class="distribution-icon">😢</div>
        <div class="distribution-info">
          <span class="distribution-label">Negative Moods</span>
          <span class="distribution-value">${negativePercent}%</span>
          <span class="distribution-count">${negativeCount} entries</span>
        </div>
      </div>
      
      <div class="distribution-item dominant">
        <div class="distribution-icon">🎯</div>
        <div class="distribution-info">
          <span class="distribution-label">Most Common</span>
          <span class="distribution-value">${moodLabels[dominantMood]}</span>
          <span class="distribution-count">${distribution[dominantMood]} times</span>
        </div>
      </div>
    </div>
  `;
}

// Calculate trend direction (simple linear regression)
function calculateTrend(values) {
  if (values.length < 2) return 0;

  const n = values.length;
  const sumX = (n * (n - 1)) / 2; // Sum of indices 0, 1, 2, ...
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares of indices

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // Return trend direction
  if (slope > 0.05) return 1; // Upward trend
  if (slope < -0.05) return -1; // Downward trend
  return 0; // Stable
}

// Calculate volatility (standard deviation)
function calculateVolatility(values) {
  if (values.length === 0) return 0;

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map((value) => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;

  return Math.sqrt(avgSquareDiff);
}

// Load and display mood insights
async function loadMoodInsights(days = 30) {
  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(
      `http://localhost:5000/api/mood/insights?days=${days}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (response.ok && data.insights) {
      displayMoodInsights(data.insights);
    }
  } catch (error) {
    console.error("Error loading mood insights:", error);
  }
}

// Display mood insights
function displayMoodInsights(insights) {
  const insightsContainer = document.getElementById("moodInsightsContainer");
  if (!insightsContainer) return;

  let html = "";

  // Display patterns
  if (insights.patterns && insights.patterns.length > 0) {
    html +=
      '<div class="insights-section"><h3>Patterns Detected</h3><div class="insights-list">';
    insights.patterns.forEach((pattern) => {
      html += `
        <div class="insight-item insight-${pattern.type}">
          <span class="insight-icon">${pattern.icon}</span>
          <span class="insight-message">${pattern.message}</span>
        </div>
      `;
    });
    html += "</div></div>";
  }

  // Display recommendations
  if (insights.recommendations && insights.recommendations.length > 0) {
    html +=
      '<div class="insights-section"><h3>Recommendations</h3><ul class="recommendations-list">';
    insights.recommendations.forEach((rec) => {
      html += `<li>${rec}</li>`;
    });
    html += "</ul></div>";
  }

  // Display top activities
  if (insights.topActivities && insights.topActivities.length > 0) {
    html +=
      '<div class="insights-section"><h3>Activities That Boost Your Mood</h3><div class="activities-list">';
    insights.topActivities.forEach((activity, index) => {
      const stars = "⭐".repeat(Math.min(5, Math.ceil(activity.avgMood)));
      html += `
        <div class="activity-item">
          <span class="activity-rank">${index + 1}</span>
          <span class="activity-name">${formatActivityName(
            activity.activity
          )}</span>
          <span class="activity-rating">${stars}</span>
          <span class="activity-count">${activity.count} times</span>
        </div>
      `;
    });
    html += "</div></div>";
  }

  // Display mood by day of week
  if (
    insights.moodByDayOfWeek &&
    Object.keys(insights.moodByDayOfWeek).length > 0
  ) {
    html +=
      '<div class="insights-section"><h3>Mood by Day of Week</h3><div class="day-of-week-chart">';
    Object.entries(insights.moodByDayOfWeek).forEach(([day, avgMood]) => {
      const percentage = (avgMood / 5) * 100;
      const moodColor = getMoodColor(avgMood);
      html += `
        <div class="day-item">
          <div class="day-name">${day.substring(0, 3)}</div>
          <div class="day-bar-container">
            <div class="day-bar" style="width: ${percentage}%; background-color: ${moodColor}"></div>
          </div>
          <div class="day-value">${avgMood.toFixed(1)}</div>
        </div>
      `;
    });
    html += "</div></div>";
  }

  insightsContainer.innerHTML =
    html ||
    '<p class="empty-insights">Not enough data to generate insights yet. Keep tracking your mood!</p>';
}

// Helper function to format activity names
function formatActivityName(activity) {
  const activityNames = {
    exercise: "Exercise",
    meditation: "Meditation",
    social: "Social Activities",
    work: "Work",
    sleep: "Sleep",
    therapy: "Therapy",
    hobbies: "Hobbies",
    "self-care": "Self-Care",
    other: "Other",
  };
  return activityNames[activity] || activity;
}

// Helper function to get mood color
function getMoodColor(moodLevel) {
  if (moodLevel >= 4.5) return "#27ae60";
  if (moodLevel >= 3.5) return "#2ecc71";
  if (moodLevel >= 2.5) return "#f39c12";
  if (moodLevel >= 1.5) return "#e67e22";
  return "#e74c3c";
}

// Helper function to get mood emoji
function getMoodEmoji(level) {
  if (level >= 4.5) return "😄";
  if (level >= 3.5) return "😊";
  if (level >= 2.5) return "😐";
  if (level >= 1.5) return "😔";
  return "😢";
}

// Helper function to get selected checkbox values
function getSelectedCheckboxValues(name) {
  const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
  return Array.from(checkboxes).map((cb) => cb.value);
}

// Initialize mood tracking when mood section is shown
document.addEventListener("DOMContentLoaded", function () {
  if (window.location.pathname.includes("userDashboard")) {
    // Initialize when page loads if mood section is active
    const moodSection = document.getElementById("mood");
    if (
      moodSection &&
      !moodSection.classList.contains("content-section-hidden")
    ) {
      initializeMoodTracking();
    }
  }
});
