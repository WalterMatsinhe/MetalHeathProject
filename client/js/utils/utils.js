// ============================================
// CONSOLIDATED UTILITY FUNCTIONS
// ============================================

// ===== NOTIFICATION SYSTEM =====
const NotificationManager = {
  show(message, type = "success", duration = 2500) {
    const container = document.createElement("div");
    container.className = `notification notification-${type}`;
    container.textContent = message;

    // Determine color based on type
    const colors = {
      success: "#05c19b",
      error: "#e74c3c",
      warning: "#f39c12",
      info: "#3498db",
    };

    Object.assign(container.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      padding: "0.75rem 1.25rem",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "500",
      color: "#fff",
      backgroundColor: colors[type] || colors.info,
      zIndex: "99999",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      maxWidth: "300px",
      wordWrap: "break-word",
      animation: "slideIn 0.3s ease-out",
    });

    // Add slide-in animation
    if (!document.getElementById("notification-styles")) {
      const style = document.createElement("style");
      style.id = "notification-styles";
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(container);

    setTimeout(() => {
      container.style.animation = "slideOut 0.3s ease-out";
      setTimeout(() => container.remove(), 300);
    }, duration);
  },
};

// Backward compatibility - expose functions globally
function showToast(message, type = "success") {
  NotificationManager.show(message, type, 2500);
}

function showNotification(message, type = "info") {
  NotificationManager.show(message, type, 5000);
}

// ===== AUTHENTICATION & SESSION STORAGE (Tab-Isolated) =====
const StorageManager = {
  get(key, defaultValue = null) {
    try {
      // Use ONLY sessionStorage for tab isolation
      const value = sessionStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set(key, value) {
    // Store ONLY in sessionStorage (not localStorage)
    sessionStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    // Remove from sessionStorage
    sessionStorage.removeItem(key);
  },
  getToken() {
    // Get token ONLY from sessionStorage
    return sessionStorage.getItem("authToken");
  },
};

// ===== API UTILITIES =====
function getAuthHeaders() {
  const token = StorageManager.getToken();
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

function checkAuthentication() {
  const token = StorageManager.getToken();
  if (!token && window.location.pathname.match(/(Dashboard|profile)\.html/)) {
    window.location.href = "login.html";
    return false;
  }
  return !!token;
}

function logout() {
  StorageManager.remove("authToken");
  StorageManager.remove("showLoginToast");
  StorageManager.remove("userData");
  window.location.href = "index.html";
}

// ===== USER STATS MANAGEMENT =====
const StatsManager = {
  DEFAULT: {
    daysActive: 0,
    sessionsCompleted: 0,
    moodEntries: 0,
    goalsAchieved: 0,
  },

  get() {
    return StorageManager.get("userStats", this.DEFAULT);
  },

  update(stats) {
    StorageManager.set("userStats", stats);
  },

  increment(key, amount = 1) {
    const stats = this.get();
    if (key in stats) {
      stats[key] += amount;
      this.update(stats);
    }
    return stats;
  },
};

// Backward compatibility
function getUserStats() {
  return StatsManager.get();
}

function updateUserStats(stats) {
  StatsManager.update(stats);
}

function updateProfileStats(stats) {
  console.log("Profile stats updated:", stats);
}

// ===== TIME & DATE UTILITIES =====
const TimeUtil = {
  getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = [
      { label: "year", seconds: 31536000 },
      { label: "month", seconds: 2592000 },
      { label: "day", seconds: 86400 },
      { label: "hour", seconds: 3600 },
      { label: "minute", seconds: 60 },
    ];

    for (const interval of intervals) {
      const value = Math.floor(seconds / interval.seconds);
      if (value >= 1) {
        return `${value} ${interval.label}${value !== 1 ? "s" : ""} ago`;
      }
    }
    return "Just now";
  },

  getMoodEmoji(level) {
    return { 1: "😭", 2: "😢", 3: "😐", 4: "😊", 5: "😄" }[level] || "😊";
  },
};

// Backward compatibility
function getTimeAgo(date) {
  return TimeUtil.getTimeAgo(date);
}

// ===== API ERROR HANDLING =====
const APIHandler = {
  async fetchWithErrorHandling(url, options = {}) {
    try {
      const response = await fetch(url, {
        timeout: 10000,
        ...options,
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          throw new Error("Session expired. Please login again.");
        }
        if (response.status === 403) {
          throw new Error("You don't have permission to access this resource.");
        }
        if (response.status === 404) {
          throw new Error("Resource not found.");
        }
        if (response.status >= 500) {
          throw new Error("Server error. Please try again later.");
        }
        throw new Error(`Request failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const message =
        error.name === "TypeError"
          ? "Network error. Please check your connection."
          : error.message;
      console.error("API Error:", message);
      throw error;
    }
  },
};

// ===== FORM VALIDATION =====
const FormValidator = {
  email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  password: (pwd) => pwd.length >= 6,
  phone: (phone) => /^[0-9\-\+\(\)\s]{7,}$/.test(phone),
  url: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  validateField(type, value) {
    if (!this[type]) return true;
    return this[type](value);
  },

  getErrorMessage(type) {
    const messages = {
      email: "Please enter a valid email address",
      password: "Password must be at least 6 characters",
      phone: "Please enter a valid phone number",
      url: "Please enter a valid URL",
    };
    return messages[type] || "Invalid input";
  },
};

function getMoodEmoji(level) {
  return TimeUtil.getMoodEmoji(level);
}
