// ============================================
// UTILITY FUNCTIONS
// ============================================

// Shows a toast notification at the bottom of the page
function showToast(message, type = "success") {
  let toast = document.createElement("div");
  toast.textContent = message;
  toast.style.position = "fixed";
  toast.style.bottom = "30px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.background = type === "success" ? "#05c19b" : "#e74c3c";
  toast.style.color = "#fff";
  toast.style.padding = "1rem 2rem";
  toast.style.borderRadius = "8px";
  toast.style.fontWeight = "bold";
  toast.style.zIndex = "9999";
  toast.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 2500);
}

// Enhanced Notification System
function showNotification(message, type = "info") {
  // Remove any existing notifications
  const existingNotification = document.querySelector(".notification");
  if (existingNotification) {
    existingNotification.remove();
  }

  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-message">${message}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;

  // Add to page
  document.body.appendChild(notification);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification && notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

// Helper function to get auth headers
function getAuthHeaders() {
  const token = localStorage.getItem("authToken");
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// Check if user is authenticated
function checkAuthentication() {
  const token = localStorage.getItem("authToken");
  if (!token) {
    // If on dashboard pages and no token, redirect to login
    const currentPage = window.location.pathname;
    if (
      currentPage.includes("Dashboard.html") ||
      currentPage.includes("profile.html")
    ) {
      window.location.href = "login.html";
      return false;
    }
  }
  return !!token;
}

// Logout function
function logout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("showLoginToast");
  window.location.href = "index.html";
}

// Helper function to get user stats
function getUserStats() {
  return (
    JSON.parse(localStorage.getItem("userStats")) || {
      daysActive: 0,
      sessionsCompleted: 0,
      moodEntries: 0,
      goalsAchieved: 0,
    }
  );
}

// Helper function to update user stats
function updateUserStats(stats) {
  localStorage.setItem("userStats", JSON.stringify(stats));

  // Also update the profile page stats if elements exist
  updateProfileStats(stats);
}

// Helper function for updating profile stats (to prevent undefined error)
function updateProfileStats(stats) {
  // This function can be expanded to update profile-specific stat displays
  // For now, it prevents the "updateProfileStats is not defined" error
  console.log("Profile stats updated:", stats);
}