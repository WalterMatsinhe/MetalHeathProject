// ============================================
// NAVIGATION AND UI INTERACTIONS
// ============================================

// Make functions globally available immediately
window.showSection = window.showSection || null;
window.addEventListener("scroll", function () {
  const navbar = document.querySelector(".navbar");
  if (navbar) {
    if (window.scrollY > 10) {
      navbar.classList.add("navbar-blur");
    } else {
      navbar.classList.remove("navbar-blur");
    }
  }
});

// Dashboard section navigation function for userDashboard.html
window.showSection = function (sectionId) {
  // Hide all sections
  const sections = document.querySelectorAll(".content-section");
  sections.forEach((sec) => {
    sec.classList.add("content-section-hidden");
  });

  // Show target section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.remove("content-section-hidden");
  }

  // Remove active class from all sidebar items
  const sidebarItems = document.querySelectorAll(".sidebar li");
  sidebarItems.forEach((item) => {
    item.classList.remove("active");
  });

  // Add active class to clicked sidebar item
  const activeLink = document.querySelector(`a[href="#${sectionId}"]`);
  if (activeLink) {
    activeLink.parentElement.classList.add("active");
  }

  // Special handling for chat section
  if (sectionId === "chat") {
    // Ensure therapists are loaded when chat section is opened
    if (window.location.pathname.includes("userDashboard")) {
      if (typeof loadTherapists === "function") {
        loadTherapists();
      }
    } else if (window.location.pathname.includes("therapistDashboard")) {
      if (typeof loadActiveConversations === "function") {
        loadActiveConversations();
      }
    }
  }

  // Special handling for mood section
  if (sectionId === "mood") {
    if (typeof initializeMoodTracking === "function") {
      initializeMoodTracking();
    }
  }

  // Special handling for profile section - reload stats
  if (sectionId === "profile") {
    if (typeof loadUserProfileData === "function") {
      loadUserProfileData();
    }
  }

  // Special handling for reports section (admin dashboard)
  if (sectionId === "reports") {
    if (typeof loadReports === "function") {
      loadReports("all");
    }
  }

  // Special handling for users section (admin dashboard)
  if (sectionId === "users") {
    if (typeof loadAllUsers === "function") {
      loadAllUsers(1, 20);
    }
  }
};

// Initialize sidebar active state on page load
document.addEventListener("DOMContentLoaded", function () {
  const defaultSection = window.location.pathname.includes("userDashboard")
    ? "dashboard"
    : "awareness";
  const defaultLink = document.querySelector(`a[href="#${defaultSection}"]`);
  if (defaultLink) {
    defaultLink.parentElement.classList.add("active");
  }
});

