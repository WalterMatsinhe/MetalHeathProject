// Real WebRTC Video Call Manager
class WebRTCVideoCallManager {
  constructor() {
    this.socket = null;
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
    this.currentRoomId = null;
    this.userId = this.generateUserId();
    this.userName = this.isTherapist
      ? `Therapist_${this.userId.slice(-4)}`
      : `User_${this.userId.slice(-4)}`;
    this.actualUserName = null;

    // WebRTC Configuration with STUN servers
    this.pcConfig = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        // Add TURN servers for production
        // {
        //   urls: 'turn:your-turn-server.com:3478',
        //   username: 'username',
        //   credential: 'password'
        // }
      ],
    };

    this.init();
  }

  generateUserId() {
    return (
      "user_" +
      Math.random().toString(36).substr(2, 9) +
      "_" +
      Date.now().toString(36)
    );
  }

  async init() {
    // Fetch actual user name first
    await this.fetchUserName();

    this.connectSocket();
    this.setupEventListeners();

    if (this.isTherapist) {
      this.initTherapistInterface();
    } else {
      this.initUserInterface();
    }
  }

  async fetchUserName() {
    try {
      const token = localStorage.getItem("authToken");
      const headers = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch("/api/profile/", {
        method: "GET",
        credentials: "include",
        headers: headers,
      });

      if (response.ok) {
        const userData = await response.json();
        this.actualUserName = userData.name;
        this.userName = this.isTherapist
          ? `Dr. ${userData.name}`
          : userData.name;
      } else {
        this.actualUserName = this.userName;
      }
    } catch (error) {
      this.actualUserName = this.userName;
    }
  }

  connectSocket() {
    // Connect to Socket.IO server
    this.socket = io(window.location.origin);

    this.socket.on("connect", () => {
      // Register with server using the fetched userName
      this.socket.emit("register", {
        userId: this.userId,
        userType: this.isTherapist ? "therapist" : "user",
        userName: this.userName, // This should now be the real name
      });
    });

    this.socket.on("connect_error", (error) => {
      this.updateCallStatus("Connection failed. Please refresh the page.");
    });

    this.socket.on("disconnect", (reason) => {
      this.updateCallStatus("Disconnected from server");
    });

    // Socket event listeners
    this.setupSocketListeners();
  }

  setupSocketListeners() {
    // Therapist availability updates
    this.socket.on("therapist-availability-update", (data) => {
      this.updateTherapistAvailability(data);
    });

    // Incoming call for therapist
    this.socket.on("incoming-call", (data) => {
      this.handleIncomingCall(data);
    });

    // Call connecting notification for user
    this.socket.on("call-connecting", (data) => {
      this.handleCallConnecting(data);
    });

    // Call accepted by therapist
    this.socket.on("call-accepted", (data) => {
      this.handleCallAccepted(data);
    });

    // No therapist available
    this.socket.on("no-therapist-available", () => {
      alert("No therapist is currently available. Please try again later.");
      this.resetCallUI();
    });

    // WebRTC signaling events
    this.socket.on("offer", async (data) => {
      await this.handleOffer(data);
    });

    this.socket.on("answer", async (data) => {
      await this.handleAnswer(data);
    });

    this.socket.on("ice-candidate", async (data) => {
      await this.handleIceCandidate(data);
    });

    // Call ended
    this.socket.on("call-ended", () => {
      this.handleCallEnded();
    });
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
    try {
      // Get user media first
      await this.getUserMedia();

      // Request call through socket
      this.socket.emit("request-call", {
        userName: this.userName,
      });

      this.updateCallStatus("Requesting call...");
    } catch (error) {
      alert("Error accessing camera/microphone. Please check permissions.");
    }
  }

  async getUserMedia() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: { echoCancellation: true, noiseSuppression: true },
      });

      const videoContainer = document.getElementById("videoCallContainer");
      this.localVideo = document.getElementById("localVideo");

      if (this.isTherapist) {
        const therapistVideoContainer = document.getElementById(
          "therapistVideoCallContainer"
        );
        this.localVideo = document.getElementById("therapistLocalVideo");
        if (therapistVideoContainer) {
          therapistVideoContainer.style.display = "block";
        }
      } else {
        if (videoContainer) {
          videoContainer.style.display = "block";
        }
      }

      if (this.localVideo) {
        this.localVideo.srcObject = this.localStream;
      }
    } catch (error) {
      let errorMessage = "Error accessing camera/microphone. ";

      if (error.name === "NotAllowedError") {
        errorMessage += "Please allow camera and microphone permissions.";
      } else if (error.name === "NotFoundError") {
        errorMessage += "No camera or microphone found.";
      } else if (error.name === "NotReadableError") {
        errorMessage += "Camera or microphone is already in use.";
      } else {
        errorMessage += "Please check your device settings.";
      }

      alert(errorMessage);
      throw error;
    }
  }

  async createPeerConnection() {
    // Close existing connection if any
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection(this.pcConfig);

    // Add local stream to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];

      const remoteVideo = this.isTherapist
        ? document.getElementById("therapistRemoteVideo")
        : document.getElementById("remoteVideo");

      if (remoteVideo) {
        remoteVideo.srcObject = this.remoteStream;
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.currentRoomId) {
        this.socket.emit("ice-candidate", {
          roomId: this.currentRoomId,
          candidate: event.candidate,
        });
      }
    };

    // Connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection.connectionState === "connected") {
        this.updateCallStatus("Connected");
        this.isCallActive = true;
        this.startCallTimer();
      } else if (this.peerConnection.connectionState === "failed") {
        this.updateCallStatus("Connection failed");
        this.endCall();
      }
    };
  }

  async handleIncomingCall(data) {
    const { roomId, userName } = data;

    // Show incoming call notification with accept/reject buttons
    this.showIncomingCallNotification(roomId, userName);
  }

  showIncomingCallNotification(roomId, userName) {
    // Create notification overlay
    const overlay = document.createElement("div");
    overlay.id = "incomingCallOverlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

    const notification = document.createElement("div");
    notification.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 15px;
      text-align: center;
      max-width: 400px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;

    notification.innerHTML = `
      <h3 style="margin: 0 0 20px 0; color: #333;">📞 Incoming Call</h3>
      <p style="margin: 0 0 30px 0; font-size: 16px; color: #666;">Call from: <strong>${userName}</strong></p>
      <div style="display: flex; gap: 15px; justify-content: center;">
        <button id="acceptCallBtn" style="
          background: #28a745;
          color: white;
          border: none;
          padding: 12px 25px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.3s;
        ">Accept</button>
        <button id="rejectCallBtn" style="
          background: #dc3545;
          color: white;
          border: none;
          padding: 12px 25px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.3s;
        ">Decline</button>
      </div>
    `;

    overlay.appendChild(notification);
    document.body.appendChild(overlay);

    // Add event listeners
    document.getElementById("acceptCallBtn").onclick = async () => {
      this.currentRoomId = roomId;

      try {
        // Get user media and create peer connection
        await this.getUserMedia();
        await this.createPeerConnection();

        // Accept the call
        this.socket.emit("accept-call", { roomId });

        // Update UI
        this.updateTherapistCallInfo(userName);

        // Remove notification
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
      } catch (error) {
        alert("Error accessing camera/microphone. Please check permissions.");
        if (document.body.contains(overlay)) {
          document.body.removeChild(overlay);
        }
      }
    };

    document.getElementById("rejectCallBtn").onclick = () => {
      // Reject call
      this.socket.emit("reject-call", { roomId });

      // Remove notification
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    };

    // Auto-reject after 30 seconds
    setTimeout(() => {
      if (document.body.contains(overlay)) {
        this.socket.emit("reject-call", { roomId });
        document.body.removeChild(overlay);
      }
    }, 30000);
  }

  async handleCallConnecting(data) {
    const { roomId, adminName } = data;
    this.currentRoomId = roomId;
    this.updateCallStatus(`Connecting to ${adminName}...`);
  }

  async handleCallAccepted(data) {
    const { roomId } = data;
    this.currentRoomId = roomId;

    try {
      // Create peer connection and send offer
      await this.createPeerConnection();

      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      this.socket.emit("offer", {
        roomId: this.currentRoomId,
        offer: offer,
      });

      this.updateCallStatus("Call accepted, connecting...");
    } catch (error) {
      this.updateCallStatus("Failed to establish connection");
      this.endCall();
    }
  }

  async handleOffer(data) {
    const { offer } = data;

    try {
      if (!this.peerConnection) {
        await this.createPeerConnection();
      }

      // Check if we can set remote description
      if (
        this.peerConnection.signalingState === "stable" ||
        this.peerConnection.signalingState === "have-local-offer"
      ) {
        await this.peerConnection.setRemoteDescription(offer);

        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        this.socket.emit("answer", {
          roomId: this.currentRoomId,
          answer: answer,
        });
      }
    } catch (error) {
      // Handle WebRTC state errors gracefully
      this.updateCallStatus("Connection error occurred");
    }
  }

  async handleAnswer(data) {
    const { answer } = data;
    try {
      if (
        this.peerConnection &&
        this.peerConnection.signalingState === "have-local-offer"
      ) {
        await this.peerConnection.setRemoteDescription(answer);
      }
    } catch (error) {
      // Handle WebRTC state errors gracefully
      this.updateCallStatus("Connection error occurred");
    }
  }

  async handleIceCandidate(data) {
    const { candidate } = data;

    if (this.peerConnection) {
      try {
        await this.peerConnection.addIceCandidate(candidate);
      } catch (error) {
        // ICE candidate error - connection may still work
      }
    }
  }

  handleCallEnded() {
    this.endCall();
    this.updateCallStatus("Call ended");
  }

  endCall() {
    // Clean up streams
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Notify server
    if (this.currentRoomId) {
      this.socket.emit("end-call", { roomId: this.currentRoomId });
      this.currentRoomId = null;
    }

    // Remove any existing call notifications
    const overlay = document.getElementById("incomingCallOverlay");
    if (overlay && document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }

    this.isCallActive = false;
    this.stopCallTimer();
    this.resetCallUI();
  }

  resetCallUI() {
    // Hide video containers
    const videoContainer = document.getElementById("videoCallContainer");
    const therapistVideoContainer = document.getElementById(
      "therapistVideoCallContainer"
    );

    if (videoContainer) {
      videoContainer.style.display = "none";
      const startBtn = document.getElementById("startCallBtn");
      if (startBtn) startBtn.style.display = "inline-block";
    }

    if (therapistVideoContainer) {
      therapistVideoContainer.style.display = "none";
    }

    // Clear video elements
    const videos = [
      "localVideo",
      "remoteVideo",
      "therapistLocalVideo",
      "therapistRemoteVideo",
    ];
    videos.forEach((id) => {
      const video = document.getElementById(id);
      if (video) {
        video.srcObject = null;
      }
    });
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
        const icon = muteBtn?.querySelector(".control-icon");
        if (icon) {
          icon.textContent = this.isMuted ? "🔇" : "🎤";
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
        const icon = videoBtn?.querySelector(".control-icon");
        if (icon) {
          icon.textContent = this.isVideoOn ? "📹" : "📷";
        }
      }
    }
  }

  toggleTherapistAvailability(available) {
    this.socket.emit("toggle-therapist-availability", available);

    const indicator = document.getElementById("therapistStatusIndicator");
    const text = document.getElementById("therapistStatusText");

    if (indicator && text) {
      if (available) {
        indicator.className = "admin-status-indicator online";
        text.textContent = "Online";
      } else {
        indicator.className = "admin-status-indicator offline";
        text.textContent = "Offline";
      }
    }
  }

  updateTherapistAvailability(data) {
    const { hasAvailableTherapists, availableCount } = data;

    const status = document.getElementById("therapistStatus");
    const startBtn = document.getElementById("startCallBtn");

    if (status) {
      if (hasAvailableTherapists) {
        status.innerHTML = `
          <span class="status-indicator online"></span>
          <span class="status-text">${availableCount} therapist${
          availableCount > 1 ? "s" : ""
        } available</span>
        `;
        if (startBtn) startBtn.disabled = false;
      } else {
        status.innerHTML = `
          <span class="status-indicator offline"></span>
          <span class="status-text">No therapists available</span>
        `;
        if (startBtn) startBtn.disabled = true;
      }
    }
  }

  updateTherapistCallInfo(userName) {
    const callInfo = document.getElementById("therapistCallUserInfo");
    if (callInfo) {
      callInfo.textContent = `User: ${userName}`;
    }
  }

  requestCallback() {
    alert(
      "Callback requested! A mental health professional will contact you within 24 hours."
    );
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
    // Initialize admin-specific functionality
    this.updateIncomingCallsList();

    // Simulate some statistics
    const stats = {
      totalCallsToday: document.getElementById("totalCallsToday"),
      averageCallDuration: document.getElementById("averageCallDuration"),
      waitingUsers: document.getElementById("waitingUsers"),
    };

    if (stats.totalCallsToday) stats.totalCallsToday.textContent = "0";
    if (stats.averageCallDuration) stats.averageCallDuration.textContent = "0m";
    if (stats.waitingUsers) stats.waitingUsers.textContent = "0";
  }

  updateIncomingCallsList() {
    const list = document.getElementById("incomingCallsList");
    if (list) {
      list.innerHTML = '<p class="no-calls">No incoming calls</p>';
    }
  }

  initUserInterface() {
    // Initialize user-specific functionality
    // Admin availability will be updated via socket events
  }
}

// Initialize WebRTC video call functionality
function initializeWebRTCVideoCall() {
  // Only initialize if we're on a dashboard page
  if (
    window.location.pathname.includes("userDashboard.html") ||
    window.location.pathname.includes("therapistDashboard.html") ||
    window.location.pathname.includes("adminDashboard.html")
  ) {
    window.videoCallManager = new WebRTCVideoCallManager();
  }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", function () {
  initializeWebRTCVideoCall();
});
