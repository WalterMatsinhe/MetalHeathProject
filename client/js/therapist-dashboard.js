// ============================================
// THERAPIST DASHBOARD FUNCTIONALITY
// ============================================

// Initialize therapist dashboard
function initializeTherapistDashboard() {
  if (!window.location.pathname.includes("therapistDashboard")) {
    return;
  }

  console.log("Initializing therapist dashboard...");

  // Set dashboard as default section
  showSection("dashboard");

  // Load therapist dashboard data
  loadTherapistDashboardStats();

  // Load recent client activity
  loadTherapistRecentActivity();

  // Initialize therapist charts
  initializeTherapistCharts();

  // Load client insights
  loadClientInsights();

  // Refresh data periodically
  setInterval(() => {
    loadTherapistDashboardStats();
    loadClientInsights();
  }, 60000); // Refresh every minute
}

// Load therapist dashboard statistics
async function loadTherapistDashboardStats() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.error("No auth token found");
      return;
    }

    // Get conversations to count active clients
    const conversationsResponse = await fetch(
      "http://localhost:5000/api/chat/conversations",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (conversationsResponse.ok) {
      const conversations = await conversationsResponse.json();

      // Calculate statistics
      const totalClients = conversations.length;
      const unreadMessages = conversations.reduce(
        (sum, conv) => sum + (conv.unreadCount || 0),
        0
      );

      // Count active conversations (with messages in last 24 hours)
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const activeConversations = conversations.filter((conv) => {
        const lastMessageTime = new Date(conv.lastMessageTime);
        return lastMessageTime > oneDayAgo;
      }).length;

      // Update stats display
      updateTherapistStatElement("therapistTotalClients", totalClients);
      updateTherapistStatElement("therapistUnreadMessages", unreadMessages);
      updateTherapistStatElement("activeConversations", activeConversations);

      // Calculate sessions today (estimate based on message activity)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sessionsToday = conversations.filter((conv) => {
        const lastMessageTime = new Date(conv.lastMessageTime);
        return lastMessageTime >= today;
      }).length;

      updateTherapistStatElement("therapistSessionsToday", sessionsToday);

      // Get therapist profile for hours worked
      const profileResponse = await fetch(
        "http://localhost:5000/api/user/profile",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        if (profile.stats) {
          // Calculate hours this week (estimate)
          const hoursThisWeek = Math.min(
            (profile.stats.hoursThisMonth || 0) / 4,
            40
          );
          updateTherapistStatElement(
            "therapistHoursThisWeek",
            Math.round(hoursThisWeek)
          );
        }
      }

      // Update charts with real data
      updateTherapistCharts(conversations);
    }
  } catch (error) {
    console.error("Error loading therapist dashboard stats:", error);
  }
}

// Helper function to update stat element
function updateTherapistStatElement(elementId, value) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = value;
  }
}

// Load recent client activity
async function loadTherapistRecentActivity() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const response = await fetch(
      "http://localhost:5000/api/chat/conversations",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.ok) {
      const conversations = await response.json();
      const activityList = document.getElementById("therapistActivityList");

      if (!activityList) return;

      // Clear existing activities
      activityList.innerHTML = "";

      // Add recent activities from conversations
      const recentActivities = conversations
        .filter((conv) => conv.lastMessage)
        .sort(
          (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
        )
        .slice(0, 5);

      if (recentActivities.length === 0) {
        activityList.innerHTML = `
          <div class="activity-item">
            <div class="activity-icon"><i class="fas fa-info-circle"></i></div>
            <div class="activity-content">
              <h4>No recent activity</h4>
              <p>Start chatting with clients to see activity here.</p>
              <span class="activity-time">Just now</span>
            </div>
          </div>
        `;
        return;
      }

      recentActivities.forEach((conv) => {
        const timeAgo = getTimeAgo(new Date(conv.lastMessageTime));
        const activityItem = createActivityItem(
          "message",
          `Message from ${conv.name}`,
          conv.lastMessage.substring(0, 60) + "...",
          timeAgo
        );
        activityList.appendChild(activityItem);
      });
    }
  } catch (error) {
    console.error("Error loading therapist recent activity:", error);
  }
}

// Create activity item element
function createActivityItem(type, title, description, time) {
  const icons = {
    message: "fa-comments",
    session: "fa-video",
    appointment: "fa-calendar-check",
    alert: "fa-exclamation-circle",
  };

  const activityItem = document.createElement("div");
  activityItem.className = "activity-item";
  activityItem.innerHTML = `
    <div class="activity-icon">
      <i class="fas ${icons[type] || "fa-info-circle"}"></i>
    </div>
    <div class="activity-content">
      <h4>${title}</h4>
      <p>${description}</p>
      <span class="activity-time">${time}</span>
    </div>
  `;

  return activityItem;
}

// Load client insights
async function loadClientInsights() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const response = await fetch(
      "http://localhost:5000/api/chat/conversations",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.ok) {
      const conversations = await response.json();

      // Calculate insights
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Active conversations (last 24 hours)
      const activeConversations = conversations.filter((conv) => {
        const lastMessageTime = new Date(conv.lastMessageTime);
        return lastMessageTime > oneDayAgo;
      }).length;

      // Needs attention (unread messages)
      const needsAttention = conversations.filter(
        (conv) => conv.unreadCount > 0
      ).length;

      // Progress updates (recent activity)
      const progressUpdates = conversations.filter((conv) => {
        const lastMessageTime = new Date(conv.lastMessageTime);
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        return lastMessageTime > threeDaysAgo;
      }).length;

      // Update insight cards
      updateTherapistStatElement("activeConversations", activeConversations);
      updateTherapistStatElement("needsAttention", needsAttention);
      updateTherapistStatElement("progressUpdates", progressUpdates);
    }
  } catch (error) {
    console.error("Error loading client insights:", error);
  }
}

// Initialize therapist charts
function initializeTherapistCharts() {
  // Check if Chart.js is loaded
  if (typeof Chart === "undefined") {
    console.warn("Chart.js not loaded, skipping chart initialization");
    return;
  }

  // Initialize Sessions Chart
  const sessionsCtx = document.getElementById("therapistSessionsChart");
  if (sessionsCtx) {
    window.therapistSessionsChart = new Chart(sessionsCtx, {
      type: "bar",
      data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
          {
            label: "Sessions",
            data: [5, 8, 6, 9, 7, 3, 2],
            backgroundColor: "rgba(59, 130, 246, 0.6)",
            borderColor: "rgba(59, 130, 246, 1)",
            borderWidth: 2,
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 2,
            },
          },
        },
      },
    });
  }

  // Initialize Engagement Chart
  const engagementCtx = document.getElementById("therapistEngagementChart");
  if (engagementCtx) {
    window.therapistEngagementChart = new Chart(engagementCtx, {
      type: "line",
      data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
          {
            label: "Active Clients",
            data: [12, 15, 13, 18, 16, 10, 8],
            borderColor: "rgba(16, 185, 129, 1)",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            borderWidth: 3,
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }

  // Initialize Response Time Gauge
  const responseTimeCtx = document.getElementById("therapistResponseTimeGauge");
  if (responseTimeCtx) {
    window.therapistResponseTimeChart = new Chart(responseTimeCtx, {
      type: "doughnut",
      data: {
        labels: ["Response Time", "Target"],
        datasets: [
          {
            data: [15, 45],
            backgroundColor: [
              "rgba(139, 92, 246, 0.8)",
              "rgba(229, 231, 235, 0.3)",
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "75%",
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                if (context.dataIndex === 0) {
                  return "Avg Response: " + context.parsed + " min";
                }
                return "";
              },
            },
          },
        },
      },
    });
  }
}

// Update therapist charts with real data
function updateTherapistCharts(conversations) {
  if (!conversations || conversations.length === 0) return;

  // Calculate weekly session data
  const now = new Date();
  const weeklyData = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun

  conversations.forEach((conv) => {
    const lastMessageDate = new Date(conv.lastMessageTime);
    const daysDiff = Math.floor(
      (now - lastMessageDate) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff < 7) {
      const dayOfWeek = (now.getDay() - daysDiff + 7) % 7;
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Mon=0, Sun=6
      weeklyData[adjustedDay]++;
    }
  });

  // Update sessions chart
  if (window.therapistSessionsChart) {
    window.therapistSessionsChart.data.datasets[0].data = weeklyData;
    window.therapistSessionsChart.update();
  }

  // Update engagement chart
  if (window.therapistEngagementChart) {
    window.therapistEngagementChart.data.datasets[0].data = weeklyData.map(
      (val) => val * 1.5
    );
    window.therapistEngagementChart.update();
  }
}

// Refresh therapist dashboard
function refreshTherapistDashboard() {
  console.log("Refreshing therapist dashboard...");
  loadTherapistDashboardStats();
  loadTherapistRecentActivity();
  loadClientInsights();
  showToast("Dashboard refreshed successfully", "success");
}

// Helper function to get time ago
function getTimeAgo(date) {
  // Handle both Date objects and ISO string timestamps
  if (!date) return "Just now";

  const dateObj = typeof date === "string" ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return "Just now";

  const seconds = Math.floor((new Date() - dateObj) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return dateObj.toLocaleDateString();
}

// Helper function to show toast notification
function showToast(message, type = "info") {
  // Check if showNotification function exists (from notifications.js)
  if (typeof showNotification === "function") {
    showNotification(message, type);
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", function () {
  if (window.location.pathname.includes("therapistDashboard")) {
    // Wait for other scripts to load
    setTimeout(() => {
      initializeTherapistDashboard();
    }, 500);
  }
});

// Export functions for global access
window.initializeTherapistDashboard = initializeTherapistDashboard;
window.refreshTherapistDashboard = refreshTherapistDashboard;
window.loadTherapistDashboardStats = loadTherapistDashboardStats;
