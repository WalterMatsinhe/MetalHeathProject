// ============================================
// VIDEO CALL FUNCTIONALITY
// ============================================

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
    const therapistVideoContainer = document.getElementById(
      "therapistVideoCallContainer"
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
      const callInfo = document.getElementById("therapistCallUserInfo");
      if (callInfo) {
        callInfo.textContent = "User: Anonymous User";
      }
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
      const startBtn = document.getElementById("startCallBtn");
      if (startBtn) {
        startBtn.style.display = "inline-block";
      }
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
        if (muteBtn) {
          const icon = muteBtn.querySelector(".control-icon");
          if (icon) {
            icon.textContent = this.isMuted ? "🔇" : "🎤";
          }
        }
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
        if (videoBtn) {
          const icon = videoBtn.querySelector(".control-icon");
          if (icon) {
            icon.textContent = this.isVideoOn ? "📹" : "📷";
          }
        }
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
        <div class="incoming-call-item">
          <span class="call-user">${call.username}</span>
          <span class="call-time">${call.time.toLocaleTimeString()}</span>
          <button class="btn btn-small" onclick="videoCallManager.acceptCall('${
            call.username
          }')">Accept</button>
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

    if (indicator && text) {
      if (available) {
        indicator.className = "therapist-status-indicator online";
        text.textContent = "Online";
      } else {
        indicator.className = "therapist-status-indicator offline";
        text.textContent = "Offline";
      }
    }

    // Update user dashboard status
    this.updateUserTherapistStatus();
  }

  checkTherapistAvailability() {
    // Simulate checking therapist availability
    setTimeout(() => {
      const status = document.getElementById("therapistStatus");
      const startBtn = document.getElementById("startCallBtn");

      if (status) {
        if (this.therapistAvailable) {
          status.innerHTML = `
            <span class="status-indicator online"></span>
            <span class="status-text">Therapist available</span>
          `;
          if (startBtn) startBtn.disabled = false;
        } else {
          status.innerHTML = `
            <span class="status-indicator offline"></span>
            <span class="status-text">Therapist offline</span>
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
          <span class="status-indicator online"></span>
          <span class="status-text">Therapist available</span>
        `;
        if (startBtn) startBtn.disabled = false;
      } else {
        status.innerHTML = `
          <span class="status-indicator offline"></span>
          <span class="status-text">Therapist offline</span>
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
      const therapistDuration = document.getElementById(
        "therapistCallDuration"
      );

      if (userDuration) userDuration.textContent = timeString;
      if (therapistDuration) therapistDuration.textContent = timeString;
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
    // Initialize therapist-specific functionality
    this.updateIncomingCallsList();

    // Simulate some statistics
    const totalCallsElement = document.getElementById("totalCallsToday");
    const averageCallElement = document.getElementById("averageCallDuration");
    const waitingUsersElement = document.getElementById("waitingUsers");

    if (totalCallsElement) totalCallsElement.textContent = "12";
    if (averageCallElement) averageCallElement.textContent = "8m";
    if (waitingUsersElement)
      waitingUsersElement.textContent = this.incomingCalls.length;
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
