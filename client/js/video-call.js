// ============================================
// VIDEO CALL FUNCTIONALITY
// ============================================

// Video Call Functionality
class VideoCallManager {
  constructor() {
    console.log("VideoCallManager initialized");
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
    this.currentCallData = null;

    // Simulated therapist availability (in real implementation, this would be server-managed)
    // Set to true by default so users can test the video call feature
    this.therapistAvailable = true;
    this.incomingCalls = [];

    // Socket.IO connection
    this.socket = null;
    this.initializeSocket();

    console.log("Is therapist view:", this.isTherapist);
    console.log("Therapist available:", this.therapistAvailable);

    this.init();
  }

  initializeSocket() {
    // Connect to Socket.IO server
    const serverUrl = window.location.origin; // or specify your server URL
    this.socket = io(serverUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("Socket.IO connected:", this.socket.id);
      this.registerUser().catch((error) => {
        console.error("Failed to register user:", error);
      });
    });

    this.socket.on("disconnect", () => {
      console.log("Socket.IO disconnected");
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket.IO connection error:", error);
    });

    // Listen for incoming calls (therapist only)
    this.socket.on("incoming-call", (data) => {
      console.log("Incoming call received:", data);
      this.handleIncomingCallRequest(data);
    });

    // Listen for call accepted (user only)
    this.socket.on("call-accepted", (data) => {
      console.log("Call accepted by therapist:", data);
      this.onCallAccepted(data);
    });

    // Listen for call connecting
    this.socket.on("call-connecting", (data) => {
      console.log("Call connecting to therapist:", data);
      this.updateCallStatus("Connecting to " + data.therapistName + "...");
    });

    // Listen for no therapist available
    this.socket.on("no-therapist-available", () => {
      console.log("No therapist available");
      alert(
        "No therapist is currently available. Please try again later or request a callback."
      );
      this.updateCallStatus("No therapist available");
    });

    // Listen for call ended
    this.socket.on("call-ended", () => {
      console.log("Call ended by other party");
      this.endCall();
    });

    // Listen for therapist availability updates
    this.socket.on("therapist-availability-update", (data) => {
      console.log("Therapist availability updated:", data);
      this.therapistAvailable = data.availableCount > 0;
      this.updateUserTherapistStatus();
    });

    // WebRTC signaling
    this.socket.on("offer", async (data) => {
      console.log("Received offer from:", data.from);
      await this.handleOffer(data.offer);
    });

    this.socket.on("answer", async (data) => {
      console.log("Received answer from:", data.from);
      await this.handleAnswer(data.answer);
    });

    this.socket.on("ice-candidate", async (data) => {
      console.log("Received ICE candidate from:", data.from);
      await this.handleIceCandidate(data.candidate);
    });
  }

  async registerUser() {
    try {
      // Fetch current user data from API to get accurate name
      const response = await fetch("/api/user/profile", {
        headers: getAuthHeaders(),
      });

      let userData = { id: "anonymous" };
      if (response.ok) {
        userData = await response.json();
        console.log("✅ User data from API:", userData);
      } else {
        // Fallback to localStorage if API fails
        userData = JSON.parse(localStorage.getItem("user") || "{}");
        console.log("⚠️ Using localStorage user data:", userData);
      }

      const userType = this.isTherapist ? "therapist" : "user";
      const userName =
        userData.fullName ||
        `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
        (this.isTherapist ? "Therapist" : "User");

      console.log("📝 Constructing userName:", {
        fullName: userData.fullName,
        firstName: userData.firstName,
        lastName: userData.lastName,
        finalUserName: userName,
      });

      this.socket.emit("register", {
        userId: userData._id || userData.id || "anonymous",
        userType: userType,
        userName: userName,
      });

      console.log("✅ Registered as:", userType, userName);
    } catch (error) {
      console.error("❌ Error registering user:", error);
      // Fallback registration with minimal data
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const userType = this.isTherapist ? "therapist" : "user";
      this.socket.emit("register", {
        userId: userData.id || "anonymous",
        userType: userType,
        userName: userType === "therapist" ? "Therapist" : "User",
      });
    }
  }

  init() {
    // Check if browser supports required APIs
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error("Browser doesn't support video calls");
      const startBtn = document.getElementById("startCallBtn");
      if (startBtn) {
        startBtn.disabled = true;
        startBtn.textContent = "Video calls not supported in this browser";
      }
      return;
    }

    this.setupEventListeners();
    this.checkTherapistAvailability();

    if (this.isTherapist) {
      this.initTherapistInterface();
    } else {
      this.initUserInterface();
    }
  }

  setupEventListeners() {
    console.log("Setting up video call event listeners...");

    // User dashboard event listeners
    const startCallBtn = document.getElementById("startCallBtn");
    const requestCallBtn = document.getElementById("requestCallBtn");
    const endCallBtn = document.getElementById("endCallBtn");
    const muteBtn = document.getElementById("muteBtn");
    const videoBtn = document.getElementById("videoBtn");

    if (startCallBtn) {
      console.log("Start call button found, adding listener");
      startCallBtn.addEventListener("click", () => {
        console.log("Start call button clicked");
        this.startCall();
      });
    } else {
      console.warn("Start call button not found");
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
    if (!this.socket || !this.socket.connected) {
      alert("Not connected to server. Please refresh the page and try again.");
      return;
    }

    try {
      // Update status to show we're requesting permissions
      this.updateCallStatus("Requesting camera and microphone access...");

      // Get user media with proper error handling
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      const videoContainer = document.getElementById("videoCallContainer");
      this.localVideo = document.getElementById("localVideo");

      if (!this.localVideo) {
        throw new Error("Video element not found");
      }

      this.localVideo.srcObject = this.localStream;

      // Ensure local video plays
      this.localVideo.play().catch((err) => {
        console.error("Error playing local video:", err);
      });

      videoContainer.style.display = "block";

      this.isCallActive = true;
      this.updateCallStatus("Requesting call with therapist...");

      // Hide start call button
      const startBtn = document.getElementById("startCallBtn");
      if (startBtn) {
        startBtn.style.display = "none";
      }

      // Request call via Socket.IO
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      const userName =
        userData.fullName ||
        `${userData.firstName || ""} ${userData.lastName || ""}`.trim() ||
        "Anonymous User";
      this.socket.emit("request-call", {
        userName: userName,
        userId: userData.id || "anonymous",
      });

      console.log("Call request sent to server");
    } catch (error) {
      console.error("Error starting call:", error);

      let errorMessage = "Error accessing camera/microphone. ";

      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        errorMessage +=
          "Please grant camera and microphone permissions in your browser settings and try again.";
      } else if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
      ) {
        errorMessage +=
          "No camera or microphone found. Please connect a device and try again.";
      } else if (
        error.name === "NotReadableError" ||
        error.name === "TrackStartError"
      ) {
        errorMessage +=
          "Your camera or microphone is already in use by another application.";
      } else {
        errorMessage += "Please check your device settings and try again.";
      }

      alert(errorMessage);
      this.updateCallStatus("Call failed - " + error.name);

      // Show start button again
      const startBtn = document.getElementById("startCallBtn");
      if (startBtn) {
        startBtn.style.display = "inline-block";
      }
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

  // Handle incoming call request (Therapist side)
  handleIncomingCallRequest(data) {
    const { roomId, userName, userId } = data;
    console.log("Incoming call from:", userName, "Room:", roomId);

    // Check if this call is already in the list (prevent duplicates)
    const existingCall = this.incomingCalls.find(
      (call) => call.roomId === roomId
    );
    if (existingCall) {
      console.log("Call already exists in queue, ignoring duplicate");
      return;
    }

    // Store call data
    this.currentCallData = { roomId, userName, userId };

    // Add to incoming calls list
    this.addToIncomingCalls(userName, new Date(), roomId);

    // Show notification
    if (window.Notification && Notification.permission === "granted") {
      new Notification("Incoming Call", {
        body: `${userName} is calling you`,
        icon: "/assets/profile-pictures/default-avatar.svg",
      });
    }

    // Play notification sound (optional)
    this.playNotificationSound();
  }

  playNotificationSound() {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.value = 0.3;

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  }

  // Accept incoming call (Therapist side)
  async acceptCall(userName, roomId) {
    console.log("Accepting call from:", userName, "Room:", roomId);

    // Remove from incoming calls list
    this.removeFromIncomingCalls(roomId);

    try {
      // Get therapist's media stream
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      const therapistVideoContainer = document.getElementById(
        "therapistVideoCallContainer"
      );
      const therapistLocalVideo = document.getElementById(
        "therapistLocalVideo"
      );

      if (!therapistLocalVideo) {
        throw new Error("Therapist video element not found");
      }

      therapistLocalVideo.srcObject = this.localStream;

      // Ensure therapist local video plays
      therapistLocalVideo.play().catch((err) => {
        console.error("Error playing therapist local video:", err);
      });

      therapistVideoContainer.style.display = "block";

      this.isCallActive = true;
      this.currentRoomId = roomId;
      this.startCallTimer();

      // Update therapist call info
      const callInfo = document.getElementById("therapistCallUserInfo");
      if (callInfo) {
        callInfo.textContent = `User: ${userName}`;
      }

      // Update call status
      const callStatus = document.getElementById("therapistCallStatus");
      if (callStatus) {
        callStatus.textContent = `Connected with ${userName}`;
      }

      // Accept call via Socket.IO
      this.socket.emit("accept-call", { roomId });

      // Initialize WebRTC peer connection
      await this.createPeerConnection(roomId);
      await this.createAndSendOffer(roomId);

      console.log("Call accepted, WebRTC negotiation started");
    } catch (error) {
      console.error("Error accepting call:", error);
      alert("Error accessing camera/microphone. Please check permissions.");
    }
  }

  // Called when therapist accepts the call (User side)
  async onCallAccepted(data) {
    const { roomId } = data;
    console.log("Therapist accepted call, room:", roomId);

    this.currentRoomId = roomId;
    this.updateCallStatus("Therapist joined - Connecting...");
    this.startCallTimer();

    // Initialize WebRTC peer connection
    await this.createPeerConnection(roomId);
  }

  // Create WebRTC peer connection
  async createPeerConnection(roomId) {
    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };

    this.peerConnection = new RTCPeerConnection(configuration);
    console.log("WebRTC peer connection created");

    // Add local stream to peer connection
    this.localStream.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, this.localStream);
      console.log("Added track to peer connection:", track.kind);
    });

    // Handle incoming remote stream
    this.peerConnection.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);

      // Use the first stream from the event
      if (event.streams && event.streams[0]) {
        const remoteVideo = this.isTherapist
          ? document.getElementById("therapistRemoteVideo")
          : document.getElementById("remoteVideo");

        if (remoteVideo) {
          remoteVideo.srcObject = event.streams[0];
          this.remoteStream = event.streams[0];
          console.log("Remote video stream connected:", event.streams[0].id);

          // Ensure video plays
          remoteVideo
            .play()
            .then(() => {
              console.log("Remote video is playing");
            })
            .catch((err) => {
              console.error("Error playing remote video:", err);
              // Try to play again after a short delay
              setTimeout(() => {
                remoteVideo
                  .play()
                  .catch((e) => console.error("Retry failed:", e));
              }, 500);
            });

          // Log track states
          event.streams[0].getTracks().forEach((track) => {
            console.log(
              `Remote ${track.kind} track - enabled: ${track.enabled}, muted: ${track.muted}, readyState: ${track.readyState}`
            );
          });
        } else {
          console.error("Remote video element not found!");
        }
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("Sending ICE candidate");
        this.socket.emit("ice-candidate", {
          roomId: roomId,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log("Connection state:", this.peerConnection.connectionState);
      if (this.peerConnection.connectionState === "connected") {
        this.updateCallStatus("Connected");
      } else if (this.peerConnection.connectionState === "disconnected") {
        this.updateCallStatus("Disconnected");
      } else if (this.peerConnection.connectionState === "failed") {
        this.updateCallStatus("Connection failed");
        alert("Connection failed. Please try again.");
        this.endCall();
      }
    };
  }

  // Create and send offer (Therapist initiates)
  async createAndSendOffer(roomId) {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      console.log("Sending offer to room:", roomId);
      this.socket.emit("offer", {
        roomId: roomId,
        offer: offer,
      });
    } catch (error) {
      console.error("Error creating offer:", error);
    }
  }

  // Handle received offer (User side)
  async handleOffer(offer) {
    try {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      console.log("Remote description set from offer");

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      console.log("Sending answer to room:", this.currentRoomId);
      this.socket.emit("answer", {
        roomId: this.currentRoomId,
        answer: answer,
      });
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  }

  // Handle received answer (Therapist side)
  async handleAnswer(answer) {
    try {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      console.log("Remote description set from answer");
      this.updateCallStatus("Connected");
    } catch (error) {
      console.error("Error handling answer:", error);
    }
  }

  // Handle received ICE candidate
  async handleIceCandidate(candidate) {
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log("ICE candidate added");
    } catch (error) {
      console.error("Error adding ICE candidate:", error);
    }
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
    console.log("Ending call...");

    // Stop all tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
        console.log("Stopped local track:", track.kind);
      });
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => {
        track.stop();
        console.log("Stopped remote track:", track.kind);
      });
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
      console.log("Peer connection closed");
    }

    // Notify server
    if (this.socket && this.currentRoomId) {
      this.socket.emit("end-call", { roomId: this.currentRoomId });
    }

    this.isCallActive = false;
    this.currentRoomId = null;
    this.currentCallData = null;
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
    console.log("Call ended successfully");
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
    this.addToIncomingCalls("Anonymous User", new Date(), null);
  }

  addToIncomingCalls(username, time, roomId) {
    this.incomingCalls.push({ username, time, roomId });
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
          <div class="call-info">
            <span class="call-user">📞 ${call.username}</span>
            <span class="call-time">${call.time.toLocaleTimeString()}</span>
          </div>
          <button class="btn btn-small btn-accept" onclick="videoCallManager.acceptCall('${
            call.username
          }', '${call.roomId}')">
            <i class="fas fa-phone"></i> Accept
          </button>
        </div>
      `
        )
        .join("");
    }

    // Update waiting users count
    const waitingUsersElement = document.getElementById("waitingUsers");
    if (waitingUsersElement) {
      waitingUsersElement.textContent = this.incomingCalls.length;
    }
  }

  // Remove call from incoming calls list after accepting
  removeFromIncomingCalls(roomId) {
    this.incomingCalls = this.incomingCalls.filter(
      (call) => call.roomId !== roomId
    );
    this.updateIncomingCallsList();
  }

  toggleTherapistAvailability(available) {
    console.log("=== TOGGLE THERAPIST AVAILABILITY ===");
    console.log("Setting availability to:", available);

    this.therapistAvailable = available;
    const indicator = document.getElementById("therapistStatusIndicator");
    const text = document.getElementById("therapistStatusText");

    if (indicator && text) {
      if (available) {
        indicator.className = "therapist-status-indicator online";
        text.textContent = "Online";
        console.log("✅ UI updated to ONLINE");
      } else {
        indicator.className = "therapist-status-indicator offline";
        text.textContent = "Offline";
        console.log("✅ UI updated to OFFLINE");
      }
    }

    // Notify server of availability change
    if (this.socket && this.socket.connected) {
      console.log("📡 Socket connected, emitting toggle event...");
      this.socket.emit("toggle-therapist-availability", available);
      console.log("✅ Toggle event emitted, availability set to:", available);

      // Also emit to update all users
      this.socket.emit("therapist-availability-update", {
        availableCount: available ? 1 : 0,
      });
    } else {
      console.warn("⚠️ Socket not connected, retrying in 1 second...");
      // Try to reconnect and emit
      setTimeout(() => {
        if (this.socket && this.socket.connected) {
          this.socket.emit("toggle-therapist-availability", available);
          console.log("✅ Retry successful, toggle event emitted");
        } else {
          console.error("❌ Socket still not connected after retry");
        }
      }, 1000);
    }

    console.log("=== END TOGGLE ===");
    // Update user dashboard status
    this.updateUserTherapistStatus();
  }

  checkTherapistAvailability() {
    // Therapist availability is already being listened to in initializeSocket
    // Just update the user interface with current availability status
    setTimeout(() => {
      this.updateUserTherapistStatus();
    }, 500);
  }

  updateUserTherapistStatus() {
    const status = document.getElementById("therapistStatus");
    const startBtn = document.getElementById("startCallBtn");

    if (status) {
      // Get the selected therapist's name from the chat manager
      let therapistName = "Therapist";
      if (
        window.chatManagerInstance &&
        window.chatManagerInstance.currentChat
      ) {
        const currentChat = window.chatManagerInstance.currentChat;
        if (currentChat.firstName || currentChat.lastName) {
          therapistName = `${currentChat.firstName || ""} ${
            currentChat.lastName || ""
          }`.trim();
        } else {
          therapistName = currentChat.name || "Therapist";
        }
      }

      if (this.therapistAvailable) {
        status.innerHTML = `
          <span class="status-indicator online"></span>
          <span class="status-text">${therapistName} available</span>
        `;
        if (startBtn) startBtn.disabled = false;
      } else {
        status.innerHTML = `
          <span class="status-indicator offline"></span>
          <span class="status-text">${therapistName} offline</span>
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

// Note: VideoCallManager is initialized in main.js to prevent duplicate instances
