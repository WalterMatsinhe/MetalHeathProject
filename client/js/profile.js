// ============================================
// PROFILE MANAGEMENT FUNCTIONALITY
// ============================================

// API utility functions
class ProfileAPI {
  static async getProfile() {
    try {
      const response = await fetch("/api/profile/", {
        method: "GET",
        credentials: "include",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      return await response.json();
    } catch (error) {
      console.error("Get profile error:", error);
      throw error;
    }
  }

  static async updateProfile(profileData) {
    try {
      const response = await fetch("/api/profile/", {
        method: "PUT",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update profile");
      }

      return await response.json();
    } catch (error) {
      console.error("Update profile error:", error);
      throw error;
    }
  }

  static async uploadProfileImage(file) {
    try {
      const token = localStorage.getItem("authToken");
      const formData = new FormData();
      formData.append("profilePicture", file);

      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/profile/picture", {
        method: "POST",
        credentials: "include",
        headers: headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload image");
      }

      return await response.json();
    } catch (error) {
      console.error("Upload image error:", error);
      throw error;
    }
  }

  static async updateStats(statsData) {
    try {
      const response = await fetch("/api/profile/stats", {
        method: "PUT",
        credentials: "include",
        headers: getAuthHeaders(),
        body: JSON.stringify(statsData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update stats");
      }

      return await response.json();
    } catch (error) {
      console.error("Update stats error:", error);
      throw error;
    }
  }
}

// Profile Image Upload Handler
function initializeProfileImageUpload() {
  // User profile image upload
  const userImageUpload = document.getElementById("imageUpload");
  const userProfileImage = document.getElementById("profileImage");

  if (userImageUpload && userProfileImage) {
    userImageUpload.addEventListener("change", function (event) {
      handleImageUpload(event, userProfileImage);
    });
  }

  // Therapist profile image upload
  const therapistImageUpload = document.getElementById("therapistImageUpload");
  const therapistProfileImage = document.getElementById(
    "therapistProfileImage"
  );

  if (therapistImageUpload && therapistProfileImage) {
    therapistImageUpload.addEventListener("change", function (event) {
      handleImageUpload(event, therapistProfileImage);
    });
  }
}

async function handleImageUpload(event, imageElement) {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith("image/")) {
    showNotification("Please select a valid image file.", "error");
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showNotification("Please select an image smaller than 5MB.", "error");
    return;
  }

  try {
    // Show loading state
    showNotification("Uploading profile image...", "info");

    // Create a local preview URL
    const reader = new FileReader();
    reader.onload = function (e) {
      const imageSrc = e.target.result;

      // Update main profile image
      imageElement.src = imageSrc;

      // Update sidebar profile image immediately
      updateSidebarProfile(imageSrc);

      // Store in localStorage for persistence
      const userData = JSON.parse(localStorage.getItem("userData") || "{}");
      userData.profileImage = imageSrc;
      localStorage.setItem("userData", JSON.stringify(userData));

      // Debug log to verify storage
      console.log(
        "Image uploaded and stored in localStorage:",
        userData.profileImage ? "YES" : "NO"
      );

      // Force update sidebar profile after storage
      setTimeout(() => {
        const sidebarImg = document.getElementById("sidebarProfileImage");
        if (sidebarImg) {
          sidebarImg.src = imageSrc;
          console.log("Sidebar image forcefully updated");
        }
      }, 100);
    };
    reader.readAsDataURL(file);

    // Upload to server (simulated - replace with actual API call)
    // const result = await ProfileAPI.uploadProfileImage(file);
    // imageElement.src = result.profilePictureUrl;
    // updateSidebarProfile(result.profilePictureUrl);

    showNotification("Profile image updated successfully!", "success");
  } catch (error) {
    showNotification(error.message || "Failed to upload image", "error");
  }
}

// Profile Form Handlers
function initializeProfileForms() {
  // User profile form
  const userProfileForm = document.getElementById("profileForm");
  if (userProfileForm) {
    userProfileForm.addEventListener("submit", handleUserProfileSubmit);
    loadUserProfileData();
  }

  // Therapist profile form
  const therapistProfileForm = document.getElementById("therapistProfileForm");
  if (therapistProfileForm) {
    therapistProfileForm.addEventListener(
      "submit",
      handleTherapistProfileSubmit
    );
    loadTherapistProfileData();
  }

  // Professional stats form for therapist
  const professionalStatsForm = document.getElementById(
    "professionalStatsForm"
  );
  if (professionalStatsForm) {
    professionalStatsForm.addEventListener(
      "submit",
      handleProfessionalStatsSubmit
    );
  }

  // User stats form for user dashboard
  const userStatsForm = document.getElementById("userStatsForm");
  if (userStatsForm) {
    userStatsForm.addEventListener("submit", handleUserStatsSubmit);
  }
}

async function handleUserProfileSubmit(event) {
  event.preventDefault();

  try {
    const formData = new FormData(event.target);
    const profileData = {};

    // Collect form data
    for (let [key, value] of formData.entries()) {
      if (key === "concerns") {
        // Handle checkbox arrays
        if (!profileData.mentalHealthConcerns) {
          profileData.mentalHealthConcerns = [];
        }
        profileData.mentalHealthConcerns.push(value);
      } else if (
        key === "shareProgress" ||
        key === "emailNotifications" ||
        key === "smsReminders"
      ) {
        // Handle checkboxes
        profileData[key] = true;
      } else {
        profileData[key] = value;
      }
    }

    // Handle unchecked checkboxes
    const checkboxes = ["shareProgress", "emailNotifications", "smsReminders"];
    checkboxes.forEach((checkbox) => {
      if (!profileData.hasOwnProperty(checkbox)) {
        profileData[checkbox] = false;
      }
    });

    // Show loading state
    showNotification("Updating profile...", "info");

    // Update profile via API
    const result = await ProfileAPI.updateProfile(profileData);

    showNotification("Profile updated successfully!", "success");

    // Update UI elements
    updateProfileDisplay(result.user);
  } catch (error) {
    showNotification(error.message || "Failed to update profile", "error");
  }
}

async function handleTherapistProfileSubmit(event) {
  event.preventDefault();

  try {
    const formData = new FormData(event.target);
    const profileData = {};

    // Collect form data
    for (let [key, value] of formData.entries()) {
      if (key === "languages") {
        if (!profileData.languagesSpoken) {
          profileData.languagesSpoken = [];
        }
        profileData.languagesSpoken.push(value);
      } else if (key === "specialties") {
        if (!profileData.areasOfExpertise) {
          profileData.areasOfExpertise = [];
        }
        profileData.areasOfExpertise.push(value);
      } else if (key === "workingDays") {
        if (!profileData.workingDays) {
          profileData.workingDays = [];
        }
        profileData.workingDays.push(value);
      } else {
        profileData[key] = value;
      }
    }

    // Show loading state
    showNotification("Updating therapist profile...", "info");

    // Update profile via API
    const result = await ProfileAPI.updateProfile(profileData);

    showNotification("Therapist profile updated successfully!", "success");

    // Update UI elements
    updateTherapistProfileDisplay(result.user);
  } catch (error) {
    showNotification(
      error.message || "Failed to update therapist profile",
      "error"
    );
  }
}

async function handleProfessionalStatsSubmit(event) {
  event.preventDefault();

  try {
    const formData = new FormData(event.target);
    const statsData = Object.fromEntries(formData.entries());

    // Convert string values to numbers where appropriate and filter out empty values
    const processedStatsData = {};
    if (statsData.patientsHelped && statsData.patientsHelped.trim() !== "") {
      processedStatsData.patientsHelped = parseInt(statsData.patientsHelped);
    }
    if (statsData.hoursThisMonth && statsData.hoursThisMonth.trim() !== "") {
      processedStatsData.hoursThisMonth = parseInt(statsData.hoursThisMonth);
    }
    if (statsData.averageRating && statsData.averageRating.trim() !== "") {
      processedStatsData.averageRating = parseFloat(statsData.averageRating);
    }

    // Don't send yearsOnPlatform as it's automatically calculated
    // Only send data if there's something to update
    if (Object.keys(processedStatsData).length === 0) {
      showNotification(
        "Please enter at least one statistic to update",
        "warning"
      );
      return;
    }

    showNotification("Updating professional stats...", "info");

    const response = await ProfileAPI.updateStats(processedStatsData);
    showNotification("Professional stats updated successfully!", "success");

    // Update the displayed stats and clear the form
    updateTherapistStats(response.stats);
    event.target.reset();
  } catch (error) {
    console.error("Error updating professional stats:", error);
    showNotification(error.message || "Failed to update stats", "error");
  }
}

async function handleUserStatsSubmit(event) {
  event.preventDefault();

  try {
    const formData = new FormData(event.target);
    const statsData = Object.fromEntries(formData.entries());

    // Convert string values to numbers where appropriate and filter out empty values
    const processedStatsData = {};
    if (statsData.daysActive && statsData.daysActive.trim() !== "") {
      processedStatsData.daysActive = parseInt(statsData.daysActive);
    }
    if (
      statsData.sessionsCompleted &&
      statsData.sessionsCompleted.trim() !== ""
    ) {
      processedStatsData.sessionsCompleted = parseInt(
        statsData.sessionsCompleted
      );
    }
    if (statsData.moodEntries && statsData.moodEntries.trim() !== "") {
      processedStatsData.moodEntries = parseInt(statsData.moodEntries);
    }
    if (statsData.goalsAchieved && statsData.goalsAchieved.trim() !== "") {
      processedStatsData.goalsAchieved = parseInt(statsData.goalsAchieved);
    }

    // Only send data if there's something to update
    if (Object.keys(processedStatsData).length === 0) {
      showNotification(
        "Please enter at least one statistic to update",
        "warning"
      );
      return;
    }

    showNotification("Updating your progress...", "info");

    const response = await ProfileAPI.updateStats(processedStatsData);
    showNotification("Progress updated successfully!", "success");

    // Update the displayed stats and clear the form
    updateUserStats(response.stats);
    event.target.reset();
  } catch (error) {
    console.error("Error updating user stats:", error);
    showNotification(error.message || "Failed to update progress", "error");
  }
}

async function loadUserProfileData() {
  try {
    if (!checkAuthentication()) {
      return;
    }

    const userData = await ProfileAPI.getProfile();

    // Update profile image
    const profileImage = document.getElementById("profileImage");
    if (profileImage && userData.profilePicture) {
      profileImage.src = userData.profilePicture;
    }

    // Update sidebar with real user data
    const fullName = `${userData.firstName || ""} ${
      userData.lastName || ""
    }`.trim();
    updateSidebarProfile(userData.profilePicture, fullName || "User");

    // Store user data in localStorage for persistence
    localStorage.setItem("userData", JSON.stringify(userData));

    // Populate form
    populateForm("profileForm", userData);

    // Populate user stats form
    populateUserStatsForm(userData.stats);

    // Update statistics
    updateUserStats(userData.stats);
  } catch (error) {
    console.error("Failed to load user profile:", error);
    showNotification("Failed to load profile data", "error");
  }
}

async function loadTherapistProfileData() {
  try {
    if (!checkAuthentication()) {
      return;
    }

    const userData = await ProfileAPI.getProfile();

    // Update profile image
    const profileImage = document.getElementById("therapistProfileImage");
    if (profileImage && userData.profilePicture) {
      profileImage.src = userData.profilePicture;
    }

    // Update sidebar with real user data
    const fullName = `${userData.firstName || ""} ${
      userData.lastName || ""
    }`.trim();
    updateSidebarProfile(userData.profilePicture, fullName || "Therapist");

    // Store user data in localStorage for persistence
    localStorage.setItem("userData", JSON.stringify(userData));

    // Populate form
    populateForm("therapistProfileForm", userData);

    // Populate professional stats form
    populateProfessionalStatsForm(userData.stats);

    // Update statistics
    updateTherapistStats(userData.stats);
  } catch (error) {
    console.error("Failed to load therapist profile:", error);
    showNotification("Failed to load profile data", "error");
  }
}

function populateForm(formId, data) {
  const form = document.getElementById(formId);
  if (!form) return;

  // Populate text inputs, selects, and textareas
  Object.keys(data).forEach((key) => {
    const element = form.querySelector(`[name="${key}"]`);
    if (element && data[key] !== null && data[key] !== undefined) {
      if (element.type === "checkbox") {
        element.checked = Boolean(data[key]);
      } else if (element.type === "date" && data[key]) {
        // Format date for input field
        const date = new Date(data[key]);
        element.value = date.toISOString().split("T")[0];
      } else {
        element.value = data[key];
      }
    }
  });

  // Handle checkbox arrays
  if (data.mentalHealthConcerns) {
    data.mentalHealthConcerns.forEach((concern) => {
      const checkbox = form.querySelector(
        `[name="concerns"][value="${concern}"]`
      );
      if (checkbox) checkbox.checked = true;
    });
  }

  if (data.languagesSpoken) {
    data.languagesSpoken.forEach((language) => {
      const checkbox = form.querySelector(
        `[name="languages"][value="${language}"]`
      );
      if (checkbox) checkbox.checked = true;
    });
  }

  if (data.areasOfExpertise) {
    data.areasOfExpertise.forEach((area) => {
      const checkbox = form.querySelector(
        `[name="specialties"][value="${area}"]`
      );
      if (checkbox) checkbox.checked = true;
    });
  }

  if (data.workingDays) {
    data.workingDays.forEach((day) => {
      const checkbox = form.querySelector(
        `[name="workingDays"][value="${day}"]`
      );
      if (checkbox) checkbox.checked = true;
    });
  }
}

function populateProfessionalStatsForm(stats) {
  const form = document.getElementById("professionalStatsForm");
  if (!form || !stats) return;

  // Populate each stats field
  const fields = [
    "patientsHelped",
    "hoursThisMonth",
    "averageRating",
    "yearsOnPlatform",
  ];

  fields.forEach((field) => {
    const input = form.querySelector(`[name="${field}"]`);
    if (input && stats[field] !== undefined && stats[field] !== null) {
      input.value = stats[field];
    }
  });
}

function populateUserStatsForm(stats) {
  const form = document.getElementById("userStatsForm");
  if (!form || !stats) return;

  // Populate each stats field for user
  const fields = [
    "daysActive",
    "sessionsCompleted",
    "moodEntries",
    "goalsAchieved",
  ];

  fields.forEach((field) => {
    const input = form.querySelector(`[name="${field}"]`);
    if (input && stats[field] !== undefined && stats[field] !== null) {
      input.value = stats[field];
    }
  });
}

function updateTherapistStats(stats) {
  if (!stats) return;

  // Update therapist stats in therapist dashboard
  if (window.location.pathname.includes("therapistDashboard")) {
    const statElements = {
      patientsHelped: document.querySelector(
        ".stat-card:nth-child(1) .stat-number"
      ),
      hoursThisMonth: document.querySelector(
        ".stat-card:nth-child(2) .stat-number"
      ),
      averageRating: document.querySelector(
        ".stat-card:nth-child(3) .stat-number"
      ),
      yearsOnPlatform: document.querySelector(
        ".stat-card:nth-child(4) .stat-number"
      ),
    };

    Object.keys(statElements).forEach((key) => {
      if (statElements[key] && stats[key] !== undefined) {
        // Format averageRating to 1 decimal place
        if (key === "averageRating") {
          statElements[key].textContent = Number(stats[key]).toFixed(1);
        } else {
          statElements[key].textContent = stats[key];
        }
      }
    });
  }
}

function updateProfileDisplay(profileData) {
  // Update any display elements based on the new profile data
  console.log("Profile updated:", profileData);

  // Update sidebar profile
  const fullName = `${profileData.firstName || ""} ${
    profileData.lastName || ""
  }`.trim();
  updateSidebarProfile(profileData.profileImage, fullName || "User");

  // Store user data in localStorage for persistence
  localStorage.setItem("userData", JSON.stringify(profileData));
}

function updateTherapistProfileDisplay(profileData) {
  // Update any display elements based on the new therapist profile data
  console.log("Therapist profile updated:", profileData);
}

async function resetForm() {
  const form = document.getElementById("profileForm");
  if (form) {
    form.reset();
    showNotification("Profile form reset!", "info");
    // Reload original data
    await loadUserProfileData();
  }
}

async function resetTherapistForm() {
  const form = document.getElementById("therapistProfileForm");
  if (form) {
    form.reset();
    showNotification("Therapist profile form reset!", "info");
    // Reload original data
    await loadTherapistProfileData();
  }
}

// Initialize profile functionality when page loads
document.addEventListener("DOMContentLoaded", function () {
  // Check authentication before initializing profile functionality
  if (checkAuthentication()) {
    initializeProfileImageUpload();
    initializeProfileForms();

    // Load profile data to populate sidebar with real user information
    if (window.location.pathname.includes("userDashboard")) {
      loadUserProfileData();
    } else if (window.location.pathname.includes("therapistDashboard")) {
      loadTherapistProfileData();
    }
  }

  // Initialize dashboard functionality
  initializeDashboard();
});
