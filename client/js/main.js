// ============================================
// MAIN SCRIPT FILE - INCLUDES ALL MODULES
// ============================================

// This file serves as the main entry point and includes all the organized modules
// Make sure to include this file last in your HTML after all other modules

// Initialize VideoCallManager for video communication
let videoCallManager = null;

document.addEventListener("DOMContentLoaded", function () {
  console.log("Mental Health Project - Modules initialized");

  // Check authentication before accessing dashboard
  if (window.location.pathname.match(/(Dashboard|profile)\.html/)) {
    checkAuthentication();
  }

  // Initialize VideoCallManager after DOM is ready
  if (!videoCallManager && typeof VideoCallManager !== "undefined") {
    console.log("Initializing VideoCallManager...");
    videoCallManager = new VideoCallManager();
    console.log("VideoCallManager initialized successfully");
  }
});

// Global error handler for better debugging
window.addEventListener("error", function (e) {
  console.error("Uncaught Error:", e.error?.message || e.message);
});

// Global exports are auto-declared in utils.js

