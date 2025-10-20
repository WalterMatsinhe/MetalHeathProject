// ============================================
// MAIN SCRIPT FILE - INCLUDES ALL MODULES
// ============================================

// This file serves as the main entry point and includes all the organized modules
// Make sure to include this file last in your HTML after all other modules

document.addEventListener("DOMContentLoaded", function () {
  console.log("Mental Health Project - JavaScript modules loaded");

  // Initialize core functionality based on current page
  const currentPath = window.location.pathname;

  if (currentPath.includes("userDashboard")) {
    console.log("Initializing user dashboard...");
    // Initialize video call manager for user dashboard only if not already initialized
    if (!window.videoCallManager) {
      window.videoCallManager = new VideoCallManager();
    }
  } else if (currentPath.includes("therapistDashboard")) {
    console.log("Initializing therapist dashboard...");
    // Initialize video call manager for therapist dashboard only if not already initialized
    if (!window.videoCallManager) {
      window.videoCallManager = new VideoCallManager();
    }
  } else if (currentPath.includes("profile")) {
    console.log("Initializing profile page...");
    // Profile page initialization is handled in profile.js
  } else {
    console.log("Initializing main pages...");
    // Main pages (index, login, register) initialization
  }
});

// Global error handler for better debugging
window.addEventListener("error", function (e) {
  console.error("JavaScript Error:", e.error);
});

// Export commonly used functions globally for backward compatibility
window.showToast = showToast;
window.showNotification = showNotification;
window.showSection = showSection;
window.logout = logout;
