// HERO SLIDER LOGIC
document.addEventListener("DOMContentLoaded", function () {
  // Only initialize slider if hero-slider element exists (on main page)
  const slider = document.getElementById("hero-slider");
  if (!slider) {
    // Hero slider not found, skip initialization
    return;
  }

  // Add your slide image URLs here (relative to /assets/ or use your own images)
  const slides = [
    "../assets/hero.png",
    "../assets/bannerTwo.png",
    "../assets/bannerThree.png",
    "../assets/bannerFour.png",
    // Add more images if available, e.g. "../assets/profile-pictures/yourimg.png"
  ];
  let currentSlide = 0;

  function renderSlides() {
    if (!slider) return; // Safety check

    slider.innerHTML = slides
      .map(
        (slide, index) => `
        <div class="hero-slide${
          index === currentSlide ? " active" : ""
        }" style="position:absolute;top:0;left:0;width:100%;height:100%;transition:opacity 1s;opacity:${
          index === currentSlide ? 1 : 0
        };z-index:${index === currentSlide ? 10 : 0};pointer-events:${
          index === currentSlide ? "auto" : "none"
        };">
          <div style='position:relative;width:100%;height:100%'>
            <img src="${slide}" alt="Banner ${
          index + 1
        }" style="width:100%;height:100%;object-fit:cover;margin-top:20px;border-radius:10px;" />
          </div>
        </div>
      `
      )
      .join("");
  }

  // --- Auto-slide logic ---
  let autoSlideInterval = setInterval(showNextSlide, 1000);
  function resetAutoSlide() {
    clearInterval(autoSlideInterval);
    autoSlideInterval = setInterval(showNextSlide, 10000);
  }

  function showPrevSlide() {
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    renderSlides();
    resetAutoSlide();
  }
  function showNextSlide() {
    currentSlide = (currentSlide + 1) % slides.length;
    renderSlides();
    resetAutoSlide();
  }

  // Initial render
  renderSlides();

  // Button listeners - only add if elements exist
  const prevBtn = document.getElementById("hero-prev");
  const nextBtn = document.getElementById("hero-next");

  if (prevBtn) {
    prevBtn.addEventListener("click", showPrevSlide);
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", showNextSlide);
  }

  // Optional: auto-slide every 7 seconds
  // setInterval(showNextSlide, 7000);
});
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

// Handles registration form submission and redirects to login page
document.addEventListener("DOMContentLoaded", function () {
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const formData = new FormData(registerForm);
      const data = Object.fromEntries(formData.entries());
      const res = await fetch(registerForm.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok) {
        showToast("Registration successful! Please login.", "success");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 1200);
      } else {
        showToast(result.message || "Registration failed", "error");
      }
    });
  }

  // Handles login form submission and redirects to dashboard based on user role
  const loginForm = document.querySelector(".login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const formData = new FormData(loginForm);
      const data = Object.fromEntries(formData.entries());
      const res = await fetch(loginForm.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok && result.user) {
        // Store JWT token for API requests
        if (result.token) {
          localStorage.setItem("authToken", result.token);
        }
        // Set flag to show toast on dashboard
        localStorage.setItem("showLoginToast", "1");
        if (result.user.role === "therapist") {
          window.location.href = "therapistDashboard.html";
        } else {
          window.location.href = "userDashboard.html";
        }
      } else {
        showToast(result.message || "Login failed", "error");
      }
      // Show login toast on dashboard if flag is set
      document.addEventListener("DOMContentLoaded", function () {
        if (localStorage.getItem("showLoginToast")) {
          showToast("Login successful!", "success");
          localStorage.removeItem("showLoginToast");
        }
      });
    });
  }
});
// Adds blur effect to navbar on scroll
window.addEventListener("scroll", function () {
  const navbar = document.querySelector(".navbar");
  if (window.scrollY > 10) {
    navbar.classList.add("navbar-blur");
  } else {
    navbar.classList.remove("navbar-blur");
  }
});

// Handles contact form submission and displays status
document.addEventListener("DOMContentLoaded", function () {
  var contactForm = document.getElementById("contactForm");
  var submitBtn = document.getElementById("submitBtn");
  var formStatus = document.getElementById("formStatus");
  if (contactForm) {
    contactForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";
      formStatus.textContent = "";
      var formData = new FormData(contactForm);
      formData.append("access_key", "3254b0de-7d62-4d0d-b1d8-7f64fa6063e4");
      var object = {};
      formData.forEach((value, key) => {
        object[key] = value;
      });
      var json = JSON.stringify(object);
      try {
        var res = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: json,
        });
        var data = await res.json();
        if (data.success) {
          formStatus.style.color = "#05c19b";
          formStatus.textContent =
            "Message Sent! Thank you for your message. We will get back to you soon.";
          contactForm.reset();
        } else {
          formStatus.style.color = "red";
          formStatus.textContent = "Submission Failed. Please try again later.";
        }
      } catch (error) {
        formStatus.style.color = "red";
        formStatus.textContent = "Network error or invalid request.";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send Message";
      }
    });
  }
});

// Dashboard section navigation function for userDashboard.html
function showSection(sectionId) {
  // Hide all sections
  const sections = document.querySelectorAll(".content-section");
  sections.forEach((sec) => {
    sec.classList.remove("content-section-hidden");
    sec.classList.add("content-section-hidden");
  });

  // Show target section
  const targetSection = document.getElementById(sectionId);
  targetSection.classList.remove("content-section-hidden");

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
      loadTherapists();
    } else if (window.location.pathname.includes("therapistDashboard")) {
      loadActiveConversations();
    }
  }
}

// Initialize sidebar active state on page load
document.addEventListener("DOMContentLoaded", function () {
  // Set default active section (awareness) - only on dashboard pages
  const defaultSection = "awareness";
  const defaultLink = document.querySelector(`a[href="#${defaultSection}"]`);
  if (defaultLink) {
    defaultLink.parentElement.classList.add("active");
  }

  // Initialize video call functionality if on dashboard pages
  if (window.location.pathname.includes("Dashboard.html")) {
    initializeVideoCall();
  }
});

// Video Call Functionality
class VideoCallManager {
  constructor() {
    this.localVideo = null;
    this.remoteVideo = null;
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.isTherapist = window.location.pathname.includes("therapistDashboard");
    this.callStartTime = null;
    this.callTimer = null;
    this.isMuted = false;
    this.isVideoOn = true;
    this.isCallActive = false;

    // Simulated therapist availability (in real implementation, this would be server-managed)
    this.therapistAvailable = false;
    this.incomingCalls = [];

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.checkTherapistAvailability();

    if (this.isTherapist) {
      this.initTherapistInterface();
    } else {
      this.initUserInterface();
    }
  }

  setupEventListeners() {
    // User dashboard event listeners
    const startCallBtn = document.getElementById("startCallBtn");
    const requestCallBtn = document.getElementById("requestCallBtn");
    const endCallBtn = document.getElementById("endCallBtn");
    const muteBtn = document.getElementById("muteBtn");
    const videoBtn = document.getElementById("videoBtn");

    if (startCallBtn) {
      startCallBtn.addEventListener("click", () => this.startCall());
    }
    if (requestCallBtn) {
      requestCallBtn.addEventListener("click", () => this.requestCallback());
    }
    if (endCallBtn) {
      endCallBtn.addEventListener("click", () => this.endCall());
    }
    if (muteBtn) {
      muteBtn.addEventListener("click", () => this.toggleMute());
    }
    if (videoBtn) {
      videoBtn.addEventListener("click", () => this.toggleVideo());
    }

    // Therapist dashboard event listeners
    const therapistAvailableToggle = document.getElementById(
      "therapistAvailableToggle"
    );
    const therapistEndCallBtn = document.getElementById("therapistEndCallBtn");
    const therapistMuteBtn = document.getElementById("therapistMuteBtn");
    const therapistVideoBtn = document.getElementById("therapistVideoBtn");

    if (therapistAvailableToggle) {
      therapistAvailableToggle.addEventListener("change", (e) =>
        this.toggleTherapistAvailability(e.target.checked)
      );
    }
    if (therapistEndCallBtn) {
      therapistEndCallBtn.addEventListener("click", () => this.endCall());
    }
    if (therapistMuteBtn) {
      therapistMuteBtn.addEventListener("click", () => this.toggleMute());
    }
    if (therapistVideoBtn) {
      therapistVideoBtn.addEventListener("click", () => this.toggleVideo());
    }
  }

  async startCall() {
    if (!this.therapistAvailable) {
      alert(
        "No therapist is currently available. Please try again later or request a callback."
      );
      return;
    }

    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      const videoContainer = document.getElementById("videoCallContainer");
      this.localVideo = document.getElementById("localVideo");

      this.localVideo.srcObject = this.localStream;
      videoContainer.style.display = "block";

      this.isCallActive = true;
      this.startCallTimer();
      this.updateCallStatus("Connected to mental health professional");

      // Hide start call button
      document.getElementById("startCallBtn").style.display = "none";

      // In a real implementation, this would establish WebRTC connection
      this.simulateTherapistConnection();
    } catch (error) {
      console.error("Error starting call:", error);
      alert("Error accessing camera/microphone. Please check permissions.");
    }
  }

  simulateTherapistConnection() {
    // Simulate therapist joining the call
    setTimeout(() => {
      if (this.isTherapist) {
        this.handleIncomingCall();
      } else {
        this.updateCallStatus("Mental health professional joined");
      }
    }, 2000);
  }

  async handleIncomingCall() {
    const adminVideoContainer = document.getElementById(
      "adminVideoCallContainer"
    );
    const therapistLocalVideo = document.getElementById("therapistLocalVideo");

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      therapistLocalVideo.srcObject = this.localStream;
      therapistVideoContainer.style.display = "block";

      this.isCallActive = true;
      this.startCallTimer();

      // Update therapist call info
      document.getElementById("therapistCallUserInfo").textContent =
        "User: Anonymous User";
    } catch (error) {
      console.error("Error handling incoming call:", error);
    }
  }

  endCall() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
    }

    this.isCallActive = false;
    this.stopCallTimer();

    // Hide video containers
    const videoContainer = document.getElementById("videoCallContainer");
    const therapistVideoContainer = document.getElementById(
      "therapistVideoCallContainer"
    );

    if (videoContainer) {
      videoContainer.style.display = "none";
      document.getElementById("startCallBtn").style.display = "inline-block";
    }

    if (therapistVideoContainer) {
      therapistVideoContainer.style.display = "none";
    }

    this.updateCallStatus("Call ended");
  }

  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.isMuted = !audioTrack.enabled;

        const muteBtn = this.isTherapist
          ? document.getElementById("therapistMuteBtn")
          : document.getElementById("muteBtn");
        const icon = muteBtn.querySelector(".control-icon");
        icon.textContent = this.isMuted ? "🔇" : "🎤";
      }
    }
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.isVideoOn = videoTrack.enabled;

        const videoBtn = this.isTherapist
          ? document.getElementById("therapistVideoBtn")
          : document.getElementById("videoBtn");
        const icon = videoBtn.querySelector(".control-icon");
        icon.textContent = this.isVideoOn ? "📹" : "📷";
      }
    }
  }

  requestCallback() {
    // Simulate callback request
    alert(
      "Callback requested! A mental health professional will contact you within 24 hours."
    );

    // Add to therapist's incoming calls list (simulation)
    this.addToIncomingCalls("Anonymous User", new Date());
  }

  addToIncomingCalls(username, time) {
    this.incomingCalls.push({ username, time });
    this.updateIncomingCallsList();
  }

  updateIncomingCallsList() {
    const list = document.getElementById("incomingCallsList");
    if (!list) return;

    if (this.incomingCalls.length === 0) {
      list.innerHTML = '<p class="no-calls">No incoming calls</p>';
    } else {
      list.innerHTML = this.incomingCalls
        .map(
          (call) => `
        <div class=\"incoming-call-item\">
          <span class=\"call-user\">${call.username}</span>
          <span class=\"call-time\">${call.time.toLocaleTimeString()}</span>
          <button class=\"btn btn-small\" onclick=\"videoCallManager.acceptCall('${
            call.username
          }')\">Accept</button>
        </div>
      `
        )
        .join("");
    }
  }

  acceptCall(username) {
    this.handleIncomingCall();
    // Remove from incoming calls
    this.incomingCalls = this.incomingCalls.filter(
      (call) => call.username !== username
    );
    this.updateIncomingCallsList();
  }

  toggleTherapistAvailability(available) {
    this.therapistAvailable = available;
    const indicator = document.getElementById("therapistStatusIndicator");
    const text = document.getElementById("therapistStatusText");

    if (available) {
      indicator.className = "therapist-status-indicator online";
      text.textContent = "Online";
    } else {
      indicator.className = "therapist-status-indicator offline";
      text.textContent = "Offline";
    }

    // Update user dashboard status
    this.updateUserTherapistStatus();
  }

  checkTherapistAvailability() {
    // Simulate checking admin availability
    setTimeout(() => {
      const status = document.getElementById("therapistStatus");
      const startBtn = document.getElementById("startCallBtn");

      if (status) {
        if (this.therapistAvailable) {
          status.innerHTML = `
            <span class=\"status-indicator online\"></span>
            <span class=\"status-text\">Admin available</span>
          `;
          if (startBtn) startBtn.disabled = false;
        } else {
          status.innerHTML = `
            <span class=\"status-indicator offline\"></span>
            <span class=\"status-text\">Admin offline</span>
          `;
          if (startBtn) startBtn.disabled = true;
        }
      }
    }, 1000);
  }

  updateUserTherapistStatus() {
    const status = document.getElementById("therapistStatus");
    const startBtn = document.getElementById("startCallBtn");

    if (status) {
      if (this.therapistAvailable) {
        status.innerHTML = `
          <span class=\"status-indicator online\"></span>
          <span class=\"status-text\">Therapist available</span>
        `;
        if (startBtn) startBtn.disabled = false;
      } else {
        status.innerHTML = `
          <span class=\"status-indicator offline\"></span>
          <span class=\"status-text\">Admin offline</span>
        `;
        if (startBtn) startBtn.disabled = true;
      }
    }
  }

  startCallTimer() {
    this.callStartTime = new Date();
    this.callTimer = setInterval(() => {
      const duration = Math.floor((new Date() - this.callStartTime) / 1000);
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      const timeString = `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;

      const userDuration = document.getElementById("callDuration");
      const adminDuration = document.getElementById("adminCallDuration");

      if (userDuration) userDuration.textContent = timeString;
      if (adminDuration) adminDuration.textContent = timeString;
    }, 1000);
  }

  stopCallTimer() {
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }
  }

  updateCallStatus(status) {
    const callStatus = document.getElementById("callStatus");
    if (callStatus) {
      callStatus.textContent = status;
    }
  }

  initTherapistInterface() {
    // Initialize admin-specific functionality
    this.updateIncomingCallsList();

    // Simulate some statistics
    document.getElementById("totalCallsToday").textContent = "12";
    document.getElementById("averageCallDuration").textContent = "8m";
    document.getElementById("waitingUsers").textContent =
      this.incomingCalls.length;
  }

  initUserInterface() {
    // Initialize user-specific functionality
    this.checkTherapistAvailability();
  }
}

// Initialize video call functionality
function initializeVideoCall() {
  // Only initialize if we're on a dashboard page
  if (window.location.pathname.includes("Dashboard.html")) {
    window.videoCallManager = new VideoCallManager();
  }
}

// ============================================
// PROFILE MANAGEMENT FUNCTIONALITY
// ============================================

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

// Logout function
function logout() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("showLoginToast");
  window.location.href = "index.html";
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

  // Admin profile image upload
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

  // Admin profile form
  const therapistProfileForm = document.getElementById("therapistProfileForm");
  if (therapistProfileForm) {
    therapistProfileForm.addEventListener(
      "submit",
      handleTherapistProfileSubmit
    );
    loadTherapistProfileData();
  }

  // Professional stats form for admin
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
    showNotification("Updating admin profile...", "info");

    // Update profile via API
    const result = await ProfileAPI.updateProfile(profileData);

    showNotification("Admin profile updated successfully!", "success");

    // Update UI elements
    updateTherapistProfileDisplay(result.user);
  } catch (error) {
    showNotification(
      error.message || "Failed to update admin profile",
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
    updateAdminStats(response.stats);
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
    updateAdminStats(userData.stats);
  } catch (error) {
    console.error("Failed to load admin profile:", error);
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

function updateUserStats(stats) {
  if (!stats) return;

  // Only update if we're on the user dashboard page
  if (window.location.pathname.includes("userDashboard")) {
    const statElements = {
      daysActive: document.querySelector(
        ".stat-card:nth-child(1) .stat-number"
      ),
      sessionsCompleted: document.querySelector(
        ".stat-card:nth-child(2) .stat-number"
      ),
      moodEntries: document.querySelector(
        ".stat-card:nth-child(3) .stat-number"
      ),
      goalsAchieved: document.querySelector(
        ".stat-card:nth-child(4) .stat-number"
      ),
    };

    Object.keys(statElements).forEach((key) => {
      if (statElements[key] && stats[key] !== undefined) {
        statElements[key].textContent = stats[key];
      }
    });
  }
}

function updateAdminStats(stats) {
  if (!stats) return;

  // Update admin stats in admin dashboard
  if (window.location.pathname.includes("adminDashboard")) {
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
  // Update any display elements based on the new admin profile data
  console.log("Admin profile updated:", profileData);
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
    showNotification("Admin profile form reset!", "info");
    // Reload original data
    await loadTherapistProfileData();
  }
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

// ============================================
// DASHBOARD FUNCTIONALITY
// ============================================

function initializeDashboard() {
  // Only initialize dashboard features if we're on the user dashboard
  if (!window.location.pathname.includes("userDashboard")) {
    return;
  }

  // Set dashboard as default section
  showSection("dashboard");

  // Load user stats
  loadDashboardStats();

  // Initialize mood selector
  initializeMoodSelector();

  // Initialize daily tips rotation
  initializeDailyContent();

  // Load recent activity
  loadRecentActivity();

  // Initialize visual charts
  initializeVisualCharts();
}

// Load and display dashboard statistics
function loadDashboardStats() {
  const stats = getUserStats();

  // Update dashboard stats display
  const dashboardDaysActive = document.getElementById("dashboardDaysActive");
  const dashboardSessionsCompleted = document.getElementById(
    "dashboardSessionsCompleted"
  );
  const dashboardMoodEntries = document.getElementById("dashboardMoodEntries");
  const dashboardGoalsAchieved = document.getElementById(
    "dashboardGoalsAchieved"
  );

  if (dashboardDaysActive)
    dashboardDaysActive.textContent = stats.daysActive || 0;
  if (dashboardSessionsCompleted)
    dashboardSessionsCompleted.textContent = stats.sessionsCompleted || 0;
  if (dashboardMoodEntries)
    dashboardMoodEntries.textContent = stats.moodEntries || 0;
  if (dashboardGoalsAchieved)
    dashboardGoalsAchieved.textContent = stats.goalsAchieved || 0;
}

// Initialize mood selector functionality
function initializeMoodSelector() {
  const moodButtons = document.querySelectorAll(".mood-btn");
  let selectedMood = null;

  moodButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      // Remove active class from all buttons
      moodButtons.forEach((b) => b.classList.remove("active"));

      // Add active class to clicked button
      this.classList.add("active");
      selectedMood = this.dataset.mood;
    });
  });
}

// Save daily wellness check-in
function saveDailyWellness() {
  const selectedMood = document.querySelector(".mood-btn.active");
  const dailyNotes = document.getElementById("dailyNotes").value;

  if (!selectedMood) {
    showNotification("Please select your mood first", "warning");
    return;
  }

  const wellnessData = {
    mood: selectedMood.dataset.mood,
    notes: dailyNotes,
    date: new Date().toISOString().split("T")[0],
  };

  // Save to localStorage (in real app, this would be sent to server)
  let wellnessHistory =
    JSON.parse(localStorage.getItem("wellnessHistory")) || [];

  // Check if entry for today already exists
  const today = wellnessData.date;
  const existingEntry = wellnessHistory.findIndex(
    (entry) => entry.date === today
  );

  if (existingEntry !== -1) {
    wellnessHistory[existingEntry] = wellnessData;
    showNotification("Today's wellness check updated successfully!", "success");
  } else {
    wellnessHistory.push(wellnessData);
    showNotification("Wellness check saved successfully!", "success");

    // Update mood entries count
    const stats = getUserStats();
    stats.moodEntries = (stats.moodEntries || 0) + 1;
    updateUserStats(stats);
    loadDashboardStats();
  }

  localStorage.setItem("wellnessHistory", JSON.stringify(wellnessHistory));

  // Add to recent activity
  addRecentActivity("mood", "Completed daily wellness check-in", "Just now");

  // Clear form
  document
    .querySelectorAll(".mood-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document.getElementById("dailyNotes").value = "";
}

// Initialize daily tips and affirmations rotation
function initializeDailyContent() {
  const tips = [
    "Take time to breathe deeply and center yourself. Even 5 minutes of mindful breathing can reduce stress and improve your mood.",
    "Practice gratitude by writing down three things you're thankful for today.",
    "Take a short walk outside. Fresh air and movement can boost your mental energy.",
    "Connect with a friend or family member. Social connections are vital for mental health.",
    "Set small, achievable goals for today. Celebrating small wins builds confidence.",
    "Practice self-compassion. Treat yourself with the same kindness you'd show a good friend.",
    "Limit social media time today. Too much can increase anxiety and comparison.",
    "Try a new hobby or activity that brings you joy and helps you relax.",
  ];

  const affirmations = [
    "I am worthy of love, care, and happiness. I choose to be kind to myself today.",
    "I have the strength to overcome challenges and grow from them.",
    "My feelings are valid, and it's okay to take time to process them.",
    "I am capable of creating positive change in my life.",
    "I deserve peace and tranquility in my mind and heart.",
    "I am resilient and can handle whatever comes my way.",
    "I choose to focus on progress, not perfection.",
    "I am grateful for my journey and excited about my growth.",
  ];

  // Get today's tip and affirmation based on date
  const today = new Date().getDate();
  const dailyTip = tips[today % tips.length];
  const dailyAffirmation = affirmations[today % affirmations.length];

  // Update the content
  const tipElement = document.getElementById("dailyTip");
  const affirmationElement = document.getElementById("dailyAffirmation");

  if (tipElement) tipElement.textContent = dailyTip;
  if (affirmationElement) affirmationElement.textContent = dailyAffirmation;
}

// Add activity to recent activity list
function addRecentActivity(type, description, time) {
  const activityList = document.getElementById("activityList");
  if (!activityList) return;

  const icons = {
    mood: "😊",
    session: "✅",
    goal: "🎯",
    resource: "📚",
    support: "💬",
    profile: "👤",
  };

  const activityItem = document.createElement("div");
  activityItem.className = "activity-item";
  activityItem.innerHTML = `
    <div class="activity-icon">${icons[type] || "📊"}</div>
    <div class="activity-content">
      <h4>${description}</h4>
      <span class="activity-time">${time}</span>
    </div>
  `;

  // Add to the beginning of the list
  activityList.insertBefore(activityItem, activityList.firstChild);

  // Keep only last 5 activities visible
  const activities = activityList.querySelectorAll(".activity-item");
  if (activities.length > 5) {
    activities[activities.length - 1].remove();
  }
}

// Load recent activity from localStorage
function loadRecentActivity() {
  const recentActivity =
    JSON.parse(localStorage.getItem("recentActivity")) || [];
  const activityList = document.getElementById("activityList");

  if (!activityList || recentActivity.length === 0) return;

  // Clear existing activity (except welcome message)
  const existingActivities = activityList.querySelectorAll(".activity-item");
  existingActivities.forEach((item, index) => {
    if (index > 0) item.remove(); // Keep first welcome message
  });

  // Add recent activities
  recentActivity.slice(0, 4).forEach((activity) => {
    addRecentActivity(activity.type, activity.description, activity.time);
  });
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

// Override the default section to show dashboard first
document.addEventListener("DOMContentLoaded", function () {
  // Set default active section to dashboard instead of awareness for user dashboard
  if (window.location.pathname.includes("userDashboard")) {
    const defaultSection = "dashboard";
    const defaultLink = document.querySelector(`a[href="#${defaultSection}"]`);
    if (defaultLink) {
      defaultLink.parentElement.classList.add("active");
      showSection(defaultSection);
    }
  } else {
    const defaultSection = "awareness";
    const defaultLink = document.querySelector(`a[href="#${defaultSection}"]`);
    if (defaultLink) {
      defaultLink.parentElement.classList.add("active");
    }
  }

  // Initialize video call functionality if on dashboard pages
  if (window.location.pathname.includes("Dashboard.html")) {
    initializeVideoCall();
  }
});

// ============================================
// VISUAL CHARTS AND ANALYTICS SECTION
// ============================================

// Initialize visual charts for dashboard
function initializeVisualCharts() {
  if (!window.location.pathname.includes("userDashboard")) {
    return;
  }

  // Initialize all charts
  initMoodTrendChart();
  initActivityChart();
  initWellnessGauge();
  initProgressChart();
}

// Mood Trend Line Chart
function initMoodTrendChart() {
  const canvas = document.getElementById("moodTrendChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = (canvas.width = canvas.offsetWidth);
  const height = (canvas.height = canvas.offsetHeight);

  // Sample mood data (1-5 scale)
  const moodData = [3, 4, 2, 4, 5, 3, 4, 3, 5, 4, 3, 4, 5, 3];
  const labels = [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
  ];

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Set up chart dimensions
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Draw grid lines
  ctx.strokeStyle = "#f0f0f0";
  ctx.lineWidth = 1;

  // Horizontal lines
  for (let i = 0; i <= 5; i++) {
    const y = padding + (i * chartHeight) / 5;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  // Vertical lines
  for (let i = 0; i < moodData.length; i++) {
    const x = padding + (i * chartWidth) / (moodData.length - 1);
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, height - padding);
    ctx.stroke();
  }

  // Draw mood line
  ctx.strokeStyle = "#05c19b";
  ctx.lineWidth = 3;
  ctx.beginPath();

  for (let i = 0; i < moodData.length; i++) {
    const x = padding + (i * chartWidth) / (moodData.length - 1);
    const y = height - padding - ((moodData[i] - 1) * chartHeight) / 4;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  // Draw data points
  ctx.fillStyle = "#05c19b";
  for (let i = 0; i < moodData.length; i++) {
    const x = padding + (i * chartWidth) / (moodData.length - 1);
    const y = height - padding - ((moodData[i] - 1) * chartHeight) / 4;

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Add labels
  ctx.fillStyle = "#666";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";

  // X-axis labels
  for (let i = 0; i < labels.length; i++) {
    const x = padding + (i * chartWidth) / (labels.length - 1);
    ctx.fillText(labels[i], x, height - 10);
  }

  // Y-axis labels
  ctx.textAlign = "right";
  for (let i = 1; i <= 5; i++) {
    const y = height - padding - ((i - 1) * chartHeight) / 4 + 5;
    ctx.fillText(i, padding - 10, y);
  }
}

// Activity Bar Chart
function initActivityChart() {
  const canvas = document.getElementById("activityChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = (canvas.width = canvas.offsetWidth);
  const height = (canvas.height = canvas.offsetHeight);

  // Activity data
  const activities = [
    { name: "Meditation", hours: 5, color: "#05c19b" },
    { name: "Exercise", hours: 8, color: "#3498db" },
    { name: "Journaling", hours: 3, color: "#9b59b6" },
    { name: "Therapy", hours: 4, color: "#e74c3c" },
    { name: "Reading", hours: 6, color: "#f39c12" },
  ];

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Chart dimensions
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const barWidth = chartWidth / activities.length - 10;
  const maxHours = Math.max(...activities.map((a) => a.hours));

  // Draw bars
  activities.forEach((activity, index) => {
    const x = padding + index * (chartWidth / activities.length) + 5;
    const barHeight = (activity.hours / maxHours) * chartHeight;
    const y = height - padding - barHeight;

    // Draw bar
    ctx.fillStyle = activity.color;
    ctx.fillRect(x, y, barWidth, barHeight);

    // Add label
    ctx.fillStyle = "#333";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(activity.name, x + barWidth / 2, height - 15);

    // Add value
    ctx.fillStyle = "#fff";
    ctx.font = "12px Arial";
    ctx.fillText(activity.hours + "h", x + barWidth / 2, y + barHeight / 2 + 5);
  });
}

// Wellness Gauge Chart
function initWellnessGauge() {
  const canvas = document.getElementById("wellnessGauge");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = (canvas.width = canvas.offsetWidth);
  const height = (canvas.height = canvas.offsetHeight);

  // Gauge settings
  const centerX = width / 2;
  const centerY = height / 2 + 20;
  const radius = Math.min(width, height) / 3;
  const wellnessScore = 75; // Sample score out of 100

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Draw background arc
  ctx.lineWidth = 20;
  ctx.strokeStyle = "#f0f0f0";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, Math.PI, 0);
  ctx.stroke();

  // Draw progress arc
  const progressAngle = Math.PI + (wellnessScore / 100) * Math.PI;
  ctx.strokeStyle = getWellnessColor(wellnessScore);
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, Math.PI, progressAngle);
  ctx.stroke();

  // Add center text
  ctx.fillStyle = "#333";
  ctx.font = "24px Arial";
  ctx.textAlign = "center";
  ctx.fillText(wellnessScore + "%", centerX, centerY + 8);

  ctx.font = "12px Arial";
  ctx.fillStyle = "#666";
  ctx.fillText("Wellness Score", centerX, centerY + 30);
}

// Progress Doughnut Chart
function initProgressChart() {
  const canvas = document.getElementById("progressChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = (canvas.width = canvas.offsetWidth);
  const height = (canvas.height = canvas.offsetHeight);

  // Progress data
  const goals = [
    { name: "Completed", value: 7, color: "#05c19b" },
    { name: "In Progress", value: 3, color: "#f39c12" },
    { name: "Pending", value: 2, color: "#e74c3c" },
  ];

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  // Chart settings
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 3;
  const total = goals.reduce((sum, goal) => sum + goal.value, 0);

  let currentAngle = -Math.PI / 2;

  // Draw segments
  goals.forEach((goal) => {
    const segmentAngle = (goal.value / total) * Math.PI * 2;

    ctx.fillStyle = goal.color;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(
      centerX,
      centerY,
      radius,
      currentAngle,
      currentAngle + segmentAngle
    );
    ctx.closePath();
    ctx.fill();

    currentAngle += segmentAngle;
  });

  // Draw center hole
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  // Add center text
  ctx.fillStyle = "#333";
  ctx.font = "18px Arial";
  ctx.textAlign = "center";
  ctx.fillText(total, centerX, centerY + 5);

  ctx.font = "10px Arial";
  ctx.fillStyle = "#666";
  ctx.fillText("Total Goals", centerX, centerY + 20);
}

// Helper function for wellness color
function getWellnessColor(score) {
  if (score >= 80) return "#05c19b"; // Green
  if (score >= 60) return "#f39c12"; // Yellow
  if (score >= 40) return "#e67e22"; // Orange
  return "#e74c3c"; // Red
}

// Helper function for updating profile stats (to prevent undefined error)
function updateProfileStats(stats) {
  // This function can be expanded to update profile-specific stat displays
  // For now, it prevents the "updateProfileStats is not defined" error
  console.log("Profile stats updated:", stats);
}

// Update charts when window resizes
window.addEventListener("resize", function () {
  setTimeout(() => {
    if (window.location.pathname.includes("userDashboard")) {
      initializeVisualCharts();
    }
  }, 100);
});

// Notification functionality
let unreadNotifications = 5; // Default number of unread notifications

// Update notification badge
function updateNotificationBadge() {
  const badge = document.getElementById("notification-badge");
  if (badge) {
    if (unreadNotifications > 0) {
      badge.textContent =
        unreadNotifications > 99 ? "99+" : unreadNotifications.toString();
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }
  }
}

// Initialize notification badge on page load
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(() => {
    updateNotificationBadge();
    initializeSidebarProfile();
  }, 1000);
});

// Initialize sidebar profile
function initializeSidebarProfile() {
  const sidebarProfileImg = document.getElementById("sidebarProfileImage");
  const sidebarUserName = document.getElementById("sidebarUserName");

  // Set default image fallback immediately
  if (sidebarProfileImg) {
    sidebarProfileImg.onerror = function () {
      this.src =
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9IiNGMEYwRjAiLz4KPGNpcmNsZSBjeD0iMzAiIGN5PSIyMyIgcj0iMTAiIGZpbGw9IiM5OTk5OTkiLz4KPHBhdGggZD0iTTEwIDUwQzEwIDQwIDIwIDMzIDMwIDMzUzUwIDQwIDUwIDUwIiBmaWxsPSIjOTk5OTk5Ii8+Cjwvc3ZnPgo=";
    };
  }

  // Try to get user data from localStorage
  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  console.log(
    "InitializeSidebarProfile - userData from localStorage:",
    userData
  );

  // Update user name and welcome message if available
  const sidebarWelcomeMessage = document.getElementById(
    "sidebarWelcomeMessage"
  );

  if (userData.firstName || userData.lastName) {
    const fullName = `${userData.firstName || ""} ${
      userData.lastName || ""
    }`.trim();

    if (sidebarUserName) {
      sidebarUserName.textContent = fullName;
    }

    // Update welcome message with real name
    if (sidebarWelcomeMessage) {
      const firstName = userData.firstName || fullName.split(" ")[0] || "there";
      sidebarWelcomeMessage.textContent = `Welcome back, ${firstName}!`;
    }
  } else {
    // Fallback if no name is available
    if (sidebarUserName) {
      sidebarUserName.textContent = "User";
    }
    if (sidebarWelcomeMessage) {
      sidebarWelcomeMessage.textContent = "Welcome back!";
    }
  }

  // PRIORITY 1: Load saved profile image from localStorage
  if (userData.profileImage && sidebarProfileImg) {
    console.log("Loading image from localStorage for sidebar");
    sidebarProfileImg.src = userData.profileImage;

    // Also update main profile image if it exists and doesn't have the same image
    const mainProfileImg = document.getElementById("profileImage");
    if (mainProfileImg && mainProfileImg.src !== userData.profileImage) {
      mainProfileImg.src = userData.profileImage;
      console.log("Synced main profile image with localStorage data");
    }
  } else if (sidebarProfileImg) {
    // PRIORITY 2: Check if main profile image has a custom image
    const mainProfileImg = document.getElementById("profileImage");
    if (mainProfileImg && mainProfileImg.src) {
      // Copy any image from main profile to sidebar (including uploaded images)
      console.log("Loading image from main profile for sidebar");
      sidebarProfileImg.src = mainProfileImg.src;
      // Save to localStorage for future use if it's not a default image
      if (
        !mainProfileImg.src.includes("default-avatar.svg") &&
        !mainProfileImg.src.includes("data:image/svg+xml")
      ) {
        const updatedUserData = JSON.parse(
          localStorage.getItem("userData") || "{}"
        );
        updatedUserData.profileImage = mainProfileImg.src;
        localStorage.setItem("userData", JSON.stringify(updatedUserData));
        console.log("Saved main profile image to localStorage");
      }
    } else {
      console.log("No custom image found, using default");
    }
  }

  // Add click handler to navigate to profile section
  if (sidebarProfileImg) {
    sidebarProfileImg.addEventListener("click", function () {
      showSection("profile");
    });
  }
}

// Function to manually sync main profile image to sidebar
function syncProfileToSidebar() {
  const mainProfileImg = document.getElementById("profileImage");
  const sidebarProfileImg = document.getElementById("sidebarProfileImage");

  if (mainProfileImg && sidebarProfileImg) {
    sidebarProfileImg.src = mainProfileImg.src;
    console.log("Profile image synced to sidebar");
    return "Images synced successfully";
  }
  return "Could not find profile images";
}

// Function to update sidebar profile image when main profile changes
function updateSidebarProfile(imageSrc, userName) {
  const sidebarProfileImg = document.getElementById("sidebarProfileImage");
  const sidebarUserName = document.getElementById("sidebarUserName");
  const sidebarWelcomeMessage = document.getElementById(
    "sidebarWelcomeMessage"
  );

  console.log("updateSidebarProfile called with:", {
    imageSrc: imageSrc ? "image provided" : "no image",
    userName: userName || "no username",
  });

  if (sidebarProfileImg && imageSrc) {
    sidebarProfileImg.src = imageSrc;
    console.log(
      "Sidebar profile image updated to:",
      imageSrc.substring(0, 50) + "..."
    );
  }

  if (sidebarUserName && userName) {
    sidebarUserName.textContent = userName;
    console.log("Sidebar username updated to:", userName);

    // Update welcome message with the user's first name
    if (sidebarWelcomeMessage) {
      const firstName = userName.split(" ")[0] || "there";
      sidebarWelcomeMessage.textContent = `Welcome back, ${firstName}!`;
    }
  }
}

// Function to add new notifications (for demonstration)
function addNewNotification() {
  unreadNotifications++;
  updateNotificationBadge();
}

// Simulate new notifications arriving periodically (optional demo feature)
function startNotificationDemo() {
  setInterval(() => {
    if (Math.random() < 0.1) {
      // 10% chance every interval
      addNewNotification();
    }
  }, 30000); // Check every 30 seconds
}

function showNotifications() {
  // Create notification overlay
  const overlay = document.createElement("div");
  overlay.id = "notification-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 20px;
  `;

  // Create notification panel
  const panel = document.createElement("div");
  panel.style.cssText = `
    background: white;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    width: 350px;
    max-height: 80vh;
    overflow-y: auto;
    margin-top: 60px;
    animation: slideInRight 0.3s ease-out;
  `;

  // Add slide-in animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // Notification content
  panel.innerHTML = `
    <div style="padding: 20px; border-bottom: 1px solid #eee;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0; color: #333; display: flex; align-items: center;">
          <i class="fa-solid fa-bell" style="margin-right: 10px; color: #007bff;"></i>
          Notifications
        </h3>
        <button onclick="closeNotifications()" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #666;">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    </div>
    
    <div style="padding: 0;">
      <!-- Wellness Reminder -->
      <div class="notification-item" style="padding: 15px 20px; border-bottom: 1px solid #f0f0f0; cursor: pointer;" onclick="handleNotificationClick('wellness')">
        <div style="display: flex; align-items: center;">
          <div style="width: 40px; height: 40px; background: #e3f2fd; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
            <i class="fa-solid fa-heart-pulse" style="color: #2196f3;"></i>
          </div>
          <div style="flex: 1;">
            <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #333;">Daily Wellness Check</h4>
            <p style="margin: 0; font-size: 12px; color: #666;">Don't forget to complete your wellness check-in today!</p>
            <span style="font-size: 11px; color: #999;">2 hours ago</span>
          </div>
          <div style="width: 8px; height: 8px; background: #2196f3; border-radius: 50%;"></div>
        </div>
      </div>

      <!-- Mood Tracking -->
      <div class="notification-item" style="padding: 15px 20px; border-bottom: 1px solid #f0f0f0; cursor: pointer;" onclick="handleNotificationClick('mood')">
        <div style="display: flex; align-items: center;">
          <div style="width: 40px; height: 40px; background: #f3e5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
            <i class="fa-solid fa-face-smile" style="color: #9c27b0;"></i>
          </div>
          <div style="flex: 1;">
            <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #333;">Mood Tracking Reminder</h4>
            <p style="margin: 0; font-size: 12px; color: #666;">Track your mood to identify patterns and triggers</p>
            <span style="font-size: 11px; color: #999;">5 hours ago</span>
          </div>
          <div style="width: 8px; height: 8px; background: #9c27b0; border-radius: 50%;"></div>
        </div>
      </div>

      <!-- Goal Achievement -->
      <div class="notification-item" style="padding: 15px 20px; border-bottom: 1px solid #f0f0f0; cursor: pointer;" onclick="handleNotificationClick('goals')">
        <div style="display: flex; align-items: center;">
          <div style="width: 40px; height: 40px; background: #e8f5e8; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
            <i class="fa-solid fa-trophy" style="color: #4caf50;"></i>
          </div>
          <div style="flex: 1;">
            <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #333;">Goal Milestone Reached!</h4>
            <p style="margin: 0; font-size: 12px; color: #666;">Congratulations! You've completed 3 wellness sessions</p>
            <span style="font-size: 11px; color: #999;">1 day ago</span>
          </div>
        </div>
      </div>

      <!-- Resource Suggestion -->
      <div class="notification-item" style="padding: 15px 20px; border-bottom: 1px solid #f0f0f0; cursor: pointer;" onclick="handleNotificationClick('resources')">
        <div style="display: flex; align-items: center;">
          <div style="width: 40px; height: 40px; background: #fff3e0; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
            <i class="fa-solid fa-lightbulb" style="color: #ff9800;"></i>
          </div>
          <div style="flex: 1;">
            <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #333;">New Resource Available</h4>
            <p style="margin: 0; font-size: 12px; color: #666;">Check out our new mindfulness exercises in the resources section</p>
            <span style="font-size: 11px; color: #999;">2 days ago</span>
          </div>
        </div>
      </div>

      <!-- Support Group -->
      <div class="notification-item" style="padding: 15px 20px; cursor: pointer;" onclick="handleNotificationClick('support')">
        <div style="display: flex; align-items: center;">
          <div style="width: 40px; height: 40px; background: #fce4ec; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
            <i class="fa-solid fa-users" style="color: #e91e63;"></i>
          </div>
          <div style="flex: 1;">
            <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #333;">Support Group Meeting</h4>
            <p style="margin: 0; font-size: 12px; color: #666;">Weekly support group session starts in 30 minutes</p>
            <span style="font-size: 11px; color: #999;">3 days ago</span>
          </div>
        </div>
      </div>
    </div>

    <div style="padding: 15px 20px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
      <button onclick="markAllAsRead()" style="width: 100%; padding: 8px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">
        Mark All as Read
      </button>
    </div>
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // Close on overlay click
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) {
      closeNotifications();
    }
  });

  // Add hover effects
  const notificationItems = panel.querySelectorAll(".notification-item");
  notificationItems.forEach((item) => {
    item.addEventListener("mouseenter", function () {
      this.style.backgroundColor = "#f8f9fa";
    });
    item.addEventListener("mouseleave", function () {
      this.style.backgroundColor = "transparent";
    });
  });
}

// Close notifications panel
function closeNotifications() {
  const overlay = document.getElementById("notification-overlay");
  if (overlay) {
    overlay.remove();
  }
}

// Handle notification clicks
function handleNotificationClick(type) {
  // Decrease unread count when a notification is clicked
  if (unreadNotifications > 0) {
    unreadNotifications--;
    updateNotificationBadge();
  }

  closeNotifications();

  switch (type) {
    case "wellness":
      // Scroll to wellness check section
      const wellnessSection = document.querySelector(".wellness-check");
      if (wellnessSection) {
        wellnessSection.scrollIntoView({ behavior: "smooth" });
      }
      break;
    case "mood":
      // Navigate to mood tracking section
      showSection("mood");
      break;
    case "goals":
      // Scroll to goals section
      const goalsSection = document.querySelector(".reminders");
      if (goalsSection) {
        goalsSection.scrollIntoView({ behavior: "smooth" });
      }
      break;
    case "resources":
      // Navigate to resources section
      showSection("resources");
      break;
    case "support":
      // Navigate to support section
      showSection("support");
      break;
  }
}

// Mark all notifications as read
function markAllAsRead() {
  const notificationDots = document.querySelectorAll(
    '#notification-overlay .notification-item div[style*="border-radius: 50%"]:last-child'
  );
  notificationDots.forEach((dot) => {
    if (dot.style.background !== "transparent") {
      dot.style.background = "#ddd";
    }
  });

  // Reset unread notifications count
  unreadNotifications = 0;
  updateNotificationBadge();

  // Show success message
  const button = event.target;
  const originalText = button.textContent;
  button.textContent = "Marked as Read ✓";
  button.style.background = "#28a745";

  setTimeout(() => {
    button.textContent = originalText;
    button.style.background = "#007bff";
  }, 2000);
}

// Therapist Notification System
function showTherapistNotifications() {
  // Create notification overlay
  const overlay = document.createElement("div");
  overlay.id = "therapist-notification-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    padding: 20px;
  `;

  // Create notification panel
  const panel = document.createElement("div");
  panel.style.cssText = `
    background: white;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    width: 400px;
    max-height: 80vh;
    overflow-y: auto;
    margin-top: 60px;
    animation: slideInRight 0.3s ease-out;
  `;

  // Add slide-in animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // Notification content with user messages
  panel.innerHTML = `
    <div style="padding: 20px; border-bottom: 1px solid #eee;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0; color: #333; display: flex; align-items: center;">
          <i class="fa-solid fa-envelope" style="margin-right: 10px; color: #007bff;"></i>
          Messages from Users
        </h3>
        <button onclick="closeTherapistNotifications()" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #666;">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    </div>
    
    <div style="padding: 0;">
      <!-- Urgent Support Request -->
      <div class="notification-item" style="padding: 15px 20px; border-bottom: 1px solid #f0f0f0; cursor: pointer; background: #fff5f5;" onclick="handleTherapistNotificationClick('urgent-support')">
        <div style="display: flex; align-items: center;">
          <div style="width: 40px; height: 40px; background: #fee; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
            <i class="fa-solid fa-exclamation-triangle" style="color: #dc3545;"></i>
          </div>
          <div style="flex: 1;">
            <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #333; font-weight: bold;">Urgent Support Request</h4>
            <p style="margin: 0; font-size: 12px; color: #666;">"I'm having severe anxiety and need immediate help"</p>
            <span style="font-size: 11px; color: #999;">Sarah M. • 5 minutes ago</span>
          </div>
          <div style="width: 8px; height: 8px; background: #dc3545; border-radius: 50%;"></div>
        </div>
      </div>

      <!-- Crisis Intervention Request -->
      <div class="notification-item" style="padding: 15px 20px; border-bottom: 1px solid #f0f0f0; cursor: pointer; background: #fff9f9;" onclick="handleTherapistNotificationClick('crisis')">
        <div style="display: flex; align-items: center;">
          <div style="width: 40px; height: 40px; background: #fff0f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
            <i class="fa-solid fa-heart-pulse" style="color: #e53e3e;"></i>
          </div>
          <div style="flex: 1;">
            <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #333; font-weight: bold;">Crisis Intervention Needed</h4>
            <p style="margin: 0; font-size: 12px; color: #666;">"Feeling overwhelmed and having thoughts of self-harm"</p>
            <span style="font-size: 11px; color: #999;">Anonymous User • 15 minutes ago</span>
          </div>
          <div style="width: 8px; height: 8px; background: #e53e3e; border-radius: 50%;"></div>
        </div>
      </div>

      <!-- Session Request -->
      <div class="notification-item" style="padding: 15px 20px; border-bottom: 1px solid #f0f0f0; cursor: pointer;" onclick="handleTherapistNotificationClick('session-request')">
        <div style="display: flex; align-items: center;">
          <div style="width: 40px; height: 40px; background: #e3f2fd; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
            <i class="fa-solid fa-video" style="color: #2196f3;"></i>
          </div>
          <div style="flex: 1;">
            <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #333;">Video Session Request</h4>
            <p style="margin: 0; font-size: 12px; color: #666;">"Would like to schedule a session to discuss anxiety management"</p>
            <span style="font-size: 11px; color: #999;">John D. • 30 minutes ago</span>
          </div>
          <div style="width: 8px; height: 8px; background: #2196f3; border-radius: 50%;"></div>
        </div>
      </div>

      <!-- Follow-up Message -->
      <div class="notification-item" style="padding: 15px 20px; border-bottom: 1px solid #f0f0f0; cursor: pointer;" onclick="handleTherapistNotificationClick('followup')">
        <div style="display: flex; align-items: center;">
          <div style="width: 40px; height: 40px; background: #f3e5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
            <i class="fa-solid fa-comment-dots" style="color: #9c27b0;"></i>
          </div>
          <div style="flex: 1;">
            <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #333;">Follow-up Message</h4>
            <p style="margin: 0; font-size: 12px; color: #666;">"Thank you for yesterday's session. Feeling much better!"</p>
            <span style="font-size: 11px; color: #999;">Maria L. • 1 hour ago</span>
          </div>
        </div>
      </div>

      <!-- Feedback Request -->
      <div class="notification-item" style="padding: 15px 20px; border-bottom: 1px solid #f0f0f0; cursor: pointer;" onclick="handleTherapistNotificationClick('feedback')">
        <div style="display: flex; align-items: center;">
          <div style="width: 40px; height: 40px; background: #e8f5e8; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
            <i class="fa-solid fa-star" style="color: #4caf50;"></i>
          </div>
          <div style="flex: 1;">
            <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #333;">Session Feedback</h4>
            <p style="margin: 0; font-size: 12px; color: #666;">"5-star rating: 'Very helpful session, thank you!'"</p>
            <span style="font-size: 11px; color: #999;">Alex K. • 2 hours ago</span>
          </div>
        </div>
      </div>

      <!-- Appointment Confirmation -->
      <div class="notification-item" style="padding: 15px 20px; cursor: pointer;" onclick="handleTherapistNotificationClick('appointment')">
        <div style="display: flex; align-items: center;">
          <div style="width: 40px; height: 40px; background: #fff3e0; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
            <i class="fa-solid fa-calendar-check" style="color: #ff9800;"></i>
          </div>
          <div style="flex: 1;">
            <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #333;">Appointment Confirmation</h4>
            <p style="margin: 0; font-size: 12px; color: #666;">"Confirmed appointment for tomorrow at 2:00 PM"</p>
            <span style="font-size: 11px; color: #999;">Emily R. • 3 hours ago</span>
          </div>
        </div>
      </div>
    </div>

    <div style="padding: 15px 20px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
      <button onclick="markAllTherapistMessagesAsRead()" style="width: 100%; padding: 8px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px; margin-bottom: 8px;">
        Mark All as Read
      </button>
      <button onclick="showSection('support')" style="width: 100%; padding: 8px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">
        Go to Support Center
      </button>
    </div>
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // Close on overlay click
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) {
      closeTherapistNotifications();
    }
  });

  // Add hover effects
  const notificationItems = panel.querySelectorAll(".notification-item");
  notificationItems.forEach((item) => {
    item.addEventListener("mouseenter", function () {
      this.style.background = "#f8f9fa";
    });
    item.addEventListener("mouseleave", function () {
      this.style.background =
        this.style.background === "rgb(255, 245, 245)"
          ? "#fff5f5"
          : this.style.background === "rgb(255, 249, 249)"
          ? "#fff9f9"
          : "white";
    });
  });
}

function closeTherapistNotifications() {
  const overlay = document.getElementById("therapist-notification-overlay");
  if (overlay) {
    overlay.remove();
  }
}

function handleTherapistNotificationClick(type) {
  closeTherapistNotifications();

  switch (type) {
    case "urgent-support":
    case "crisis":
      showSection("support");
      alert(
        "Prioritizing urgent support request. Redirecting to support center."
      );
      break;
    case "session-request":
      showSection("support");
      break;
    case "followup":
    case "feedback":
    case "appointment":
      alert("Message details would open here in a full implementation.");
      break;
    default:
      console.log("Notification clicked:", type);
  }
}

function markAllTherapistMessagesAsRead() {
  const badge = document.getElementById("therapist-notification-badge");
  if (badge) {
    badge.style.display = "none";
    badge.textContent = "0";
  }
  closeTherapistNotifications();

  // Show feedback
  const button = event.target;
  const originalText = button.textContent;
  button.textContent = "Marked as Read ✓";
  button.style.background = "#28a745";

  setTimeout(() => {
    closeTherapistNotifications();
  }, 1000);
}

// Initialize therapist notification badge (simulate new messages)
function initTherapistNotifications() {
  const badge = document.getElementById("therapist-notification-badge");
  if (badge && window.location.pathname.includes("therapistDashboard")) {
    // Simulate having 3 new messages from users
    badge.textContent = "3";
    badge.style.display = "inline-block";

    // Simulate periodic new messages
    setInterval(() => {
      const currentCount = parseInt(badge.textContent) || 0;
      if (currentCount < 5 && Math.random() > 0.7) {
        badge.textContent = currentCount + 1;
        badge.style.display = "inline-block";
      }
    }, 45000); // Check every 45 seconds
  }
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", function () {
  if (window.location.pathname.includes("therapistDashboard")) {
    setTimeout(initTherapistNotifications, 1000);
  }

  // Initialize chat functionality for user dashboard
  if (window.location.pathname.includes("userDashboard")) {
    initializeChat();
  }

  // Initialize therapist chat functionality for therapist dashboard
  if (window.location.pathname.includes("therapistDashboard")) {
    initializeTherapistChat();
  }
});

