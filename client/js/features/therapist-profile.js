// ============================================
// THERAPIST PROFILE MANAGEMENT
// ============================================

// Function to load therapist's own profile data
async function loadTherapistProfile() {
  try {
    console.log("Loading therapist profile...");

    // Clear any cached data first
    sessionStorage.removeItem("userData");
    sessionStorage.removeItem("userData");

    const response = await fetch("/api/user/profile", {
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = "login.html";
        return;
      }
      throw new Error(`Failed to load profile: ${response.status}`);
    }

    const profileData = await response.json();
    console.log("Therapist profile data:", profileData);

    // Populate the form with real data
    populateTherapistForm(profileData);

    // Update sidebar with real name
    updateTherapistSidebar(profileData);
  } catch (error) {
    console.error("Error loading therapist profile:", error);
    showToast("Failed to load profile data", "error");
  }
}

// Function to populate the therapist form with real data
function populateTherapistForm(data) {
  console.log("Populating therapist form with:", data);

  // Basic information
  const firstName = document.getElementById("therapistFirstName");
  const lastName = document.getElementById("therapistLastName");
  const email = document.getElementById("therapistEmail");
  const phone = document.getElementById("therapistPhone");
  const bio = document.getElementById("therapistBio");

  if (firstName) firstName.value = data.firstName || "";
  if (lastName) lastName.value = data.lastName || "";
  if (email) email.value = data.email || "";
  if (phone) phone.value = data.phone || "";
  if (bio) bio.value = data.bio || "";

  // Professional information
  const licenseNumber = document.getElementById("licenseNumber");
  const specialization = document.getElementById("specialization");
  const yearsExperience = document.getElementById("yearsExperience");
  const institution = document.getElementById("institution");
  const education = document.getElementById("education");
  const certifications = document.getElementById("certifications");

  if (licenseNumber) licenseNumber.value = data.licenseNumber || "";
  if (specialization) specialization.value = data.specialization || "";
  if (yearsExperience) yearsExperience.value = data.yearsExperience || 0;
  if (institution) institution.value = data.institution || "";
  if (education) education.value = data.education || "";
  if (certifications) certifications.value = data.certifications || "";

  // Working hours
  const workingHoursStart = document.getElementById("workingHoursStart");
  const workingHoursEnd = document.getElementById("workingHoursEnd");

  if (workingHoursStart)
    workingHoursStart.value = data.workingHoursStart || "08:00";
  if (workingHoursEnd) workingHoursEnd.value = data.workingHoursEnd || "17:00";

  // Languages spoken
  if (data.languagesSpoken && Array.isArray(data.languagesSpoken)) {
    const languageCheckboxes = document.querySelectorAll(
      'input[name="languages"]'
    );
    languageCheckboxes.forEach((checkbox) => {
      checkbox.checked = data.languagesSpoken.includes(checkbox.value);
    });
  }

  // Areas of expertise
  if (data.areasOfExpertise && Array.isArray(data.areasOfExpertise)) {
    const specialtyCheckboxes = document.querySelectorAll(
      'input[name="specialties"]'
    );
    specialtyCheckboxes.forEach((checkbox) => {
      checkbox.checked = data.areasOfExpertise.includes(checkbox.value);
    });
  }

  // Working days
  if (data.workingDays && Array.isArray(data.workingDays)) {
    const dayCheckboxes = document.querySelectorAll(
      'input[name="workingDays"]'
    );
    dayCheckboxes.forEach((checkbox) => {
      checkbox.checked = data.workingDays.includes(checkbox.value);
    });
  }

  // Profile image
  const profileImage = document.getElementById("therapistProfileImage");
  if (profileImage && data.profilePicture) {
    profileImage.src = data.profilePicture;
  }

  // Professional stats
  if (data.stats) {
    const patientsHelped = document.getElementById("patientsHelped");
    const hoursThisMonth = document.getElementById("hoursThisMonth");
    const averageRating = document.getElementById("averageRating");
    const yearsOnPlatform = document.getElementById("yearsOnPlatform");

    if (patientsHelped) patientsHelped.value = data.stats.patientsHelped || 0;
    if (hoursThisMonth) hoursThisMonth.value = data.stats.hoursThisMonth || 0;
    if (averageRating) averageRating.value = data.stats.averageRating || 0;
    if (yearsOnPlatform)
      yearsOnPlatform.value = data.stats.yearsOnPlatform || 0;

    // Update stats display
    updateStatsDisplay(data.stats);
  }
}

// Function to update therapist sidebar with real data
function updateTherapistSidebar(data) {
  const sidebarUserName = document.getElementById("sidebarUserName");
  const sidebarWelcomeMessage = document.getElementById(
    "sidebarWelcomeMessage"
  );
  const sidebarProfileImage = document.getElementById("sidebarProfileImage");

  // Determine display name
  let displayName = data.fullName;
  if (!displayName && (data.firstName || data.lastName)) {
    displayName = `${data.firstName || ""} ${data.lastName || ""}`.trim();
  }
  if (!displayName) {
    displayName = "Therapist";
  }

  if (sidebarUserName) {
    sidebarUserName.textContent = displayName;
  }

  if (sidebarWelcomeMessage) {
    sidebarWelcomeMessage.textContent = `Welcome back, ${
      data.firstName || displayName
    }!`;
  }

  if (sidebarProfileImage && data.profilePicture) {
    sidebarProfileImage.src = data.profilePicture;
  }

  console.log("Updated sidebar with therapist data:", {
    displayName,
    firstName: data.firstName,
  });
}

// Function to update stats display
function updateStatsDisplay(stats) {
  const statElements = {
    patientsHelped: document.querySelector(".stat-card .stat-number"),
    hoursThisMonth: document.querySelectorAll(".stat-card .stat-number")[1],
    averageRating: document.querySelectorAll(".stat-card .stat-number")[2],
    yearsOnPlatform: document.querySelectorAll(".stat-card .stat-number")[3],
  };

  if (statElements.patientsHelped) {
    statElements.patientsHelped.textContent = stats.patientsHelped || 0;
  }

  if (statElements.hoursThisMonth) {
    statElements.hoursThisMonth.textContent = `${stats.hoursThisMonth || 0}h`;
  }

  if (statElements.averageRating) {
    statElements.averageRating.textContent = (stats.averageRating || 0).toFixed(
      1
    );
  }

  if (statElements.yearsOnPlatform) {
    statElements.yearsOnPlatform.textContent = stats.yearsOnPlatform || 0;
  }
}

// Function to load dynamic notifications instead of hardcoded ones
async function loadDynamicNotifications() {
  try {
    // This would eventually connect to a real notifications API
    // For now, we'll create notifications based on actual user data
    const response = await fetch("/api/chat/conversations", {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      const conversations = await response.json();

      // Create notifications based on real conversations
      const notifications = conversations.slice(0, 3).map((conv, index) => {
        const timeAgo = getTimeAgo(conv.lastMessageTime);
        return {
          type: "message",
          title: "New Message",
          content: conv.lastMessage.substring(0, 50) + "...",
          sender: conv.name,
          time: timeAgo,
          unread: conv.unreadCount > 0,
        };
      });

      updateNotificationsDisplay(notifications);
    }
  } catch (error) {
    console.error("Error loading dynamic notifications:", error);
  }
}

// Helper function to calculate time ago
function getTimeAgo(timestamp) {
  if (!timestamp) return "Just now";

  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now - time;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} days ago`;
}

// Function to update notifications display with real data
function updateNotificationsDisplay(notifications) {
  // This would update the notifications panel with real data
  // instead of the hardcoded "John D." examples
  console.log("Dynamic notifications:", notifications);
}

// Initialize therapist profile on page load
document.addEventListener("DOMContentLoaded", function () {
  // Only load on therapist dashboard
  if (window.location.pathname.includes("therapistDashboard")) {
    console.log("Initializing therapist profile...");

    // Load profile data
    setTimeout(() => {
      loadTherapistProfile();
      loadDynamicNotifications();
    }, 1000);
  }
});

// Export functions for global access
window.loadTherapistProfile = loadTherapistProfile;
window.forceRefreshTherapists = () => {
  if (window.chatManagerInstance) {
    window.chatManagerInstance.forceRefreshTherapists();
  }
};

