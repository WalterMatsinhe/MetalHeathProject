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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to fetch profile (${response.status})`
        );
      }

      const data = await response.json();
      console.log("Profile data fetched successfully:", data);
      return data;
    } catch (error) {
      console.error("Get profile error:", error);
      throw error;
    }
  }

  static async updateProfile(profileData) {
    try {
      const headers = getAuthHeaders();
      console.log("Sending profile update with headers:", headers);
      console.log("Profile data:", profileData);

      const response = await fetch("/api/profile/", {
        method: "PUT",
        credentials: "include",
        headers: headers,
        body: JSON.stringify(profileData),
      });

      console.log("Profile update response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Profile update error response:", errorData);
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
      const token = sessionStorage.getItem("authToken");
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

    // Create a local preview URL for immediate feedback
    const reader = new FileReader();
    reader.onload = function (e) {
      // Update main profile image immediately for UX
      imageElement.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Upload to server and save to database
    console.log("Starting upload to server...");
    const result = await ProfileAPI.uploadProfileImage(file);
    console.log("Upload result:", result);

    if (result && result.profilePictureUrl) {
      // Update with the actual server URL
      const serverImageUrl = result.profilePictureUrl;
      imageElement.src = serverImageUrl;

      // Update sidebar profile image
      updateSidebarProfile(serverImageUrl);

      // Update localStorage with the server URL
      const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
      userData.profilePicture = serverImageUrl;
      sessionStorage.setItem("userData", JSON.stringify(userData));

      // Force update sidebar profile
      setTimeout(() => {
        const sidebarImg = document.getElementById("sidebarProfileImage");
        if (sidebarImg) {
          sidebarImg.src = serverImageUrl;
          console.log("Sidebar image updated with server URL:", serverImageUrl);
        }
      }, 100);

      showNotification("Profile image updated successfully!", "success");
    } else {
      throw new Error("No image URL returned from server");
    }
  } catch (error) {
    console.error("Image upload error:", error);
    showNotification(error.message || "Failed to upload image", "error");

    // Reset the image on error
    loadUserProfileData();
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
      } else if (key === "goals") {
        // Map goals field to mentalHealthGoals
        profileData.mentalHealthGoals = value;
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

    // Immediately update sidebar with new name
    if (profileData.firstName || profileData.lastName) {
      const fullName = `${profileData.firstName || ""} ${
        profileData.lastName || ""
      }`.trim();

      // Get current profile picture for sidebar
      const profileImage = document.getElementById("profileImage");
      const imageSrc = profileImage ? profileImage.src : "";

      updateSidebarProfile(imageSrc, fullName || "User");
    }

    // Update sessionStorage with new profile data
    const currentUserData = StorageManager.get("userData", {});
    const updatedUserData = {
      ...currentUserData,
      ...profileData,
    };
    StorageManager.set("userData", updatedUserData);

    // Reload profile data from server to ensure consistency
    await loadUserProfileData();
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

    // Immediately update sidebar with new name
    if (profileData.firstName || profileData.lastName) {
      const fullName = `${profileData.firstName || ""} ${
        profileData.lastName || ""
      }`.trim();

      // Get current profile picture for sidebar
      const profileImage = document.getElementById("therapistProfileImage");
      const imageSrc = profileImage ? profileImage.src : "";

      updateSidebarProfile(imageSrc, fullName || "Therapist");
    }

    // Update sessionStorage with new profile data
    const currentUserData = StorageManager.get("userData", {});
    const updatedUserData = {
      ...currentUserData,
      ...profileData,
    };
    StorageManager.set("userData", updatedUserData);

    // Update UI elements by reloading profile data
    await loadTherapistProfileData();
  } catch (error) {
    showNotification(
      error.message || "Failed to update therapist profile",
      "error"
    );
  }
}

async function loadUserProfileData() {
  try {
    if (!checkAuthentication()) {
      console.warn("Not authenticated");
      return;
    }

    console.log("Loading user profile data...");
    const userData = await ProfileAPI.getProfile();
    console.log("User data received:", userData);

    // Update profile image
    const profileImage = document.getElementById("profileImage");
    if (profileImage && userData.profilePicture) {
      profileImage.src = userData.profilePicture;
      console.log("Profile image updated");
    }

    // Update sidebar with real user data
    const fullName = `${userData.firstName || ""} ${
      userData.lastName || ""
    }`.trim();
    updateSidebarProfile(userData.profilePicture, fullName || "User");

    // Store user data in localStorage for persistence
    sessionStorage.setItem("userData", JSON.stringify(userData));
    console.log("User data stored in localStorage");

    // Populate form if it exists
    const profileForm = document.getElementById("profileForm");
    if (profileForm) {
      populateForm("profileForm", userData);
      console.log("Profile form populated");
    }

    // Update statistics
    if (userData.stats) {
      updateUserStats(userData.stats);
      console.log("User stats updated");
    }
  } catch (error) {
    console.error("Failed to load user profile:", error);
    showNotification("Failed to load profile data: " + error.message, "error");
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
    sessionStorage.setItem("userData", JSON.stringify(userData));

    // Populate form
    populateForm("therapistProfileForm", userData);

    // Auto-load and display professional stats
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
    // Map mentalHealthGoals to goals field
    let fieldName = key === "mentalHealthGoals" ? "goals" : key;

    const element = form.querySelector(`[name="${fieldName}"]`);
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

function updateUserStats(stats) {
  if (!stats) return;

  console.log("Updating user stats:", stats);

  // Update user stats display from automatic progress tracking
  if (window.location.pathname.includes("userDashboard")) {
    // Get the stats section
    const statsSection = document.querySelector(".profile-stats");
    if (!statsSection) {
      console.warn("Stats section not found");
      return;
    }

    const statCards = statsSection.querySelectorAll(".stat-card");
    if (statCards.length < 4) {
      console.warn("Not enough stat cards found:", statCards.length);
      return;
    }

    // Map stats to their card positions
    const statKeys = [
      "daysActive",
      "sessionsCompleted",
      "moodEntries",
      "goalsAchieved",
    ];

    statKeys.forEach((key, index) => {
      if (stats[key] !== undefined && statCards[index]) {
        const statNumber = statCards[index].querySelector(".stat-number");
        if (statNumber) {
          statNumber.textContent = stats[key];
          console.log(`Updated ${key} to ${stats[key]}`);
        }
      }
    });
  }
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
    initializeSimpleProfilePage();

    // Load profile data to populate sidebar with real user information
    if (window.location.pathname.includes("userDashboard")) {
      loadUserProfileData();
    } else if (window.location.pathname.includes("therapistDashboard")) {
      loadTherapistProfileData();
    } else if (window.location.pathname.includes("profile.html")) {
      loadSimpleProfileData();
    }
  }
});

// Initialize simple profile page (profile.html)
function initializeSimpleProfilePage() {
  const savePictureBtn = document.getElementById("save-picture");
  const uploadPictureInput = document.getElementById("upload-picture");
  const profilePicture = document.getElementById("profile-picture");

  if (savePictureBtn && uploadPictureInput) {
    savePictureBtn.addEventListener("click", async function () {
      const file = uploadPictureInput.files[0];
      if (!file) {
        showToast("Please select an image first", "error");
        return;
      }

      try {
        showToast("Uploading profile picture...", "info");

        // Upload to server
        const result = await ProfileAPI.uploadProfileImage(file);

        if (result && result.profilePictureUrl) {
          // Update the profile picture display
          if (profilePicture) {
            profilePicture.src = result.profilePictureUrl;
          }

          // Update sidebar
          updateSidebarProfile(result.profilePictureUrl);

          // Update localStorage
          const userData = JSON.parse(
            sessionStorage.getItem("userData") || "{}"
          );
          userData.profilePicture = result.profilePictureUrl;
          sessionStorage.setItem("userData", JSON.stringify(userData));

          showToast("Profile picture updated successfully!", "success");
        }
      } catch (error) {
        console.error("Profile picture upload error:", error);
        showToast(error.message || "Failed to upload profile picture", "error");
      }
    });
  }
}

// Load data for simple profile page
async function loadSimpleProfileData() {
  try {
    const userData = await ProfileAPI.getProfile();

    // Update profile picture
    const profilePicture = document.getElementById("profile-picture");
    if (profilePicture && userData.profilePicture) {
      profilePicture.src = userData.profilePicture;
    }

    // Update profile name and email
    const profileName = document.getElementById("profile-name");
    const profileEmail = document.getElementById("profile-email");

    if (profileName) {
      const fullName = `${userData.firstName || ""} ${
        userData.lastName || ""
      }`.trim();
      profileName.textContent = fullName || "User";
    }

    if (profileEmail) {
      profileEmail.textContent = `Email: ${userData.email || ""}`;
    }

    // Update sidebar
    const fullName = `${userData.firstName || ""} ${
      userData.lastName || ""
    }`.trim();
    updateSidebarProfile(userData.profilePicture, fullName || "User");

    // Store in localStorage
    sessionStorage.setItem("userData", JSON.stringify(userData));
  } catch (error) {
    console.error("Failed to load profile data:", error);
    showToast("Failed to load profile data", "error");
  }
}
