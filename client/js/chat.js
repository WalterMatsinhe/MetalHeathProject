// ============================================
// CHAT FUNCTIONALITY
// ============================================

class ChatManager {
  constructor() {
    // Prevent multiple instances
    if (window.chatManagerInstance) {
      console.warn("ChatManager already exists, returning existing instance");
      return window.chatManagerInstance;
    }

    this.socket = null;
    this.currentUser = null;
    this.currentChat = null;
    this.typingTimer = null;
    this.isTyping = false;
    this.messageHistory = new Map();
    this.initialized = false;

    window.chatManagerInstance = this;
    this.init();
  }

  async init() {
    try {
      // Check authentication first
      if (!checkAuthentication()) {
        return; // checkAuthentication will handle the redirect
      }

      // Clear any cached therapist data
      console.log("Clearing any cached data...");
      localStorage.removeItem("therapistsCache");
      sessionStorage.removeItem("therapistsCache");
      localStorage.removeItem("userData"); // Also clear cached user data to force refresh

      // Get current user info
      await this.loadCurrentUser();

      // Initialize Socket.IO
      this.initSocket();

      // Setup event listeners
      this.setupEventListeners();

      // Load initial data based on user role
      if (this.currentUser.role === "therapist") {
        await this.loadConversations();
      } else {
        await this.loadTherapists();
      }
    } catch (error) {
      console.error("Failed to initialize chat:", error);
      this.showError("Failed to initialize chat system");
    }
  }

  async loadCurrentUser() {
    try {
      const response = await fetch("/api/user/profile", {
        headers: getAuthHeaders(), // Use the auth headers from utils.js
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to login if not authenticated
          window.location.href = "login.html";
          return;
        }
        throw new Error(`Failed to load user profile: ${response.status}`);
      }

      this.currentUser = await response.json();

      console.log("Current user loaded:", this.currentUser);
      console.log("User role:", this.currentUser.role);

      // Ensure role is set (should always come from API)
      if (!this.currentUser.role) {
        console.error("ERROR: User role not received from API!");
        this.currentUser.role = "user"; // Safe default
      }

      // Re-register video call user with accurate user data
      if (window.videoCallManager) {
        console.log("Re-registering video call user with accurate data...");
        await window.videoCallManager.registerUser();
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
      throw error;
    }
  }

  initSocket() {
    console.log("=== INITIALIZING SOCKET.IO ===");

    this.socket = io({
      transports: ["websocket", "polling"],
      credentials: true,
    });

    // Register user with socket
    this.socket.on("connect", () => {
      console.log("✅ Connected to Socket.IO server");
      console.log("Socket ID:", this.socket.id);

      const userName =
        this.currentUser.fullName ||
        `${this.currentUser.firstName || ""} ${
          this.currentUser.lastName || ""
        }`.trim() ||
        this.currentUser.email;

      const registerData = {
        userId: this.currentUser._id || this.currentUser.id,
        userType: this.currentUser.role,
        userName: userName,
      };

      console.log("→ Registering user with server:", registerData);
      this.socket.emit("register", registerData);
    });

    this.socket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
      this.showError("Failed to connect to chat server");
    });

    this.socket.on("disconnect", (reason) => {
      console.log("⚠️ Disconnected from server. Reason:", reason);
      if (reason === "io server disconnect") {
        // Server disconnected, try to reconnect
        this.socket.connect();
      }
    });

    this.socket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Reconnected after", attemptNumber, "attempts");
    });

    // Handle incoming messages
    this.socket.on("message", (data) => {
      console.log("📨 Received message event:", data);
      this.handleIncomingMessage(data);
    });

    // Handle message sent confirmation
    this.socket.on("message-sent", (data) => {
      console.log("✅ Message sent confirmation:", data);
    });

    // Handle message errors
    this.socket.on("message-error", (error) => {
      console.error("❌ Message error - Full object:", error);
      console.error("❌ Message error - Type:", typeof error);
      console.error("❌ Message error - Keys:", Object.keys(error || {}));
      console.error(
        "❌ Message error - Stringified:",
        JSON.stringify(error, null, 2)
      );
      this.showError(error?.message || error || "Failed to send message");
    });

    // Handle typing indicators
    this.socket.on("typing", (data) => {
      this.showTypingIndicator(data);
    });

    this.socket.on("stop-typing", (data) => {
      this.hideTypingIndicator(data);
    });

    // Handle chat room events
    this.socket.on("user-joined-chat", (data) => {
      console.log("👤 User joined chat:", data);
    });

    this.socket.on("chat-room-joined", (data) => {
      console.log("✅ Successfully joined chat room:", data);
    });

    // Handle online/offline status changes
    this.socket.on("user-status-changed", (data) => {
      console.log("👤 User status changed:", data);
      this.updateUserStatus(data.userId, data.status);
    });

    this.socket.on("therapist-availability-update", (data) => {
      console.log("🩺 Therapist availability updated:", data);
      if (this.currentUser.role === "user") {
        // Reload therapist list for users
        this.loadTherapists();
      }
    });

    console.log("=== SOCKET.IO INITIALIZED ===");
  }

  setupEventListeners() {
    // Send button
    const sendButton = document.getElementById("sendButton");
    if (sendButton) {
      sendButton.addEventListener("click", () => this.sendMessage());
    }

    // Message input
    const messageInput = document.getElementById("messageInput");
    if (messageInput) {
      messageInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.sendMessage();
        } else {
          this.handleTyping();
        }
      });

      messageInput.addEventListener("keyup", () => {
        this.handleStopTyping();
      });
    }

    // Event delegation for therapist cards
    const therapistsList = document.getElementById("therapistsList");
    if (therapistsList) {
      therapistsList.addEventListener("click", (e) => {
        const therapistCard = e.target.closest(".therapist-card");
        if (therapistCard) {
          const therapistId = therapistCard.dataset.therapistId;
          const therapistName = therapistCard.dataset.therapistName;
          const firstName = therapistCard.dataset.therapistFirstname || "";
          const lastName = therapistCard.dataset.therapistLastname || "";
          if (therapistId && therapistName) {
            this.selectTherapist(
              therapistId,
              therapistName,
              firstName,
              lastName
            );
          }
        }
      });

      // Also handle keyboard navigation
      therapistsList.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          const therapistCard = e.target.closest(".therapist-card");
          if (therapistCard) {
            e.preventDefault();
            const therapistId = therapistCard.dataset.therapistId;
            const therapistName = therapistCard.dataset.therapistName;
            const firstName = therapistCard.dataset.therapistFirstname || "";
            const lastName = therapistCard.dataset.therapistLastname || "";
            if (therapistId && therapistName) {
              this.selectTherapist(
                therapistId,
                therapistName,
                firstName,
                lastName
              );
            }
          }
        }
      });
    }

    // Event delegation for user/conversation cards
    const usersList = document.getElementById("usersList");
    if (usersList) {
      usersList.addEventListener("click", (e) => {
        const userCard = e.target.closest(".user-card");
        if (userCard) {
          const userId = userCard.dataset.userId;
          const userName = userCard.dataset.userName;
          const conversationId = userCard.dataset.conversationId;
          if (userId && userName) {
            this.selectConversation(userId, userName, conversationId);
          }
        }
      });

      // Also handle keyboard navigation
      usersList.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          const userCard = e.target.closest(".user-card");
          if (userCard) {
            e.preventDefault();
            const userId = userCard.dataset.userId;
            const userName = userCard.dataset.userName;
            const conversationId = userCard.dataset.conversationId;
            if (userId && userName) {
              this.selectConversation(userId, userName, conversationId);
            }
          }
        }
      });
    }
  }

  // Force refresh therapist data (for debugging)
  async forceRefreshTherapists() {
    console.log("=== FORCE REFRESHING THERAPIST DATA ===");

    // Clear any caches
    localStorage.removeItem("therapistsCache");
    sessionStorage.removeItem("therapistsCache");

    // Clear the container first
    const container = document.getElementById("therapistsList");
    if (container) {
      container.innerHTML =
        '<div class="loading-message">Loading therapists...</div>';
    }

    // Wait a moment then reload
    setTimeout(async () => {
      await this.loadTherapists();
    }, 100);
  }

  async loadTherapists() {
    try {
      console.log("Loading therapists from API...");

      // Add cache busting parameter
      const response = await fetch(`/api/chat/therapists?t=${Date.now()}`, {
        headers: getAuthHeaders(),
        cache: "no-cache",
      });

      if (!response.ok) throw new Error("Failed to load therapists");

      const therapists = await response.json();
      console.log("Raw therapists data from API:", therapists);

      // Log each therapist's data individually
      therapists.forEach((t, index) => {
        console.log(`Therapist ${index + 1}:`, {
          id: t._id,
          name: t.name,
          firstName: t.firstName,
          lastName: t.lastName,
          email: t.email,
          profilePicture: t.profilePicture,
        });
      });

      this.displayTherapistsList(therapists);
    } catch (error) {
      console.error("Error loading therapists:", error);
      this.showError("Failed to load therapists");
    }
  }

  async loadConversations() {
    try {
      const response = await fetch("/api/chat/conversations", {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error("Failed to load conversations");

      const conversations = await response.json();
      this.displayConversationsList(conversations);
    } catch (error) {
      console.error("Error loading conversations:", error);
      this.showError("Failed to load conversations");
    }
  }

  displayTherapistsList(therapists) {
    const container = document.getElementById("therapistsList");
    if (!container) return;

    console.log("=== DISPLAYING THERAPISTS ===");
    console.log("Container found:", !!container);
    console.log("Number of therapists:", therapists.length);

    if (therapists.length === 0) {
      container.innerHTML =
        '<div class="no-therapists">No therapists available</div>';
      return;
    }

    const therapistItems = therapists.map((therapist, index) => {
      // Ensure we have a proper display name
      let displayName = therapist.name;
      if (!displayName && (therapist.firstName || therapist.lastName)) {
        displayName = `${therapist.firstName || ""} ${
          therapist.lastName || ""
        }`.trim();
      }
      if (!displayName) {
        displayName = therapist.email || "Unknown Therapist";
      }

      console.log(`Therapist ${index + 1} display data:`, {
        originalName: therapist.name,
        firstName: therapist.firstName,
        lastName: therapist.lastName,
        finalDisplayName: displayName,
        id: therapist._id,
      });

      return `
        <div class="therapist-card" 
             data-therapist-id="${therapist._id}"
             data-therapist-name="${displayName.replace(/"/g, "&quot;")}"
             data-therapist-firstname="${(therapist.firstName || "").replace(
               /"/g,
               "&quot;"
             )}"
             data-therapist-lastname="${(therapist.lastName || "").replace(
               /"/g,
               "&quot;"
             )}"
             role="button"
             tabindex="0">
          <div class="therapist-avatar">
            ${
              therapist.profilePicture
                ? `<img src="${therapist.profilePicture}" 
                     alt="${displayName}" 
                     onerror="this.src='../assets/profile-pictures/default-avatar.svg'">`
                : `<span>${this.getInitials(displayName)}</span>`
            }
          </div>
          <div class="therapist-info">
            <div class="therapist-info-header">
              <h4 class="therapist-name">${displayName}</h4>
            </div>
            <p class="last-message">${
              therapist.specialization || "General Therapy"
            }</p>
            <div class="therapist-status status-${
              therapist.status || "offline"
            }">
              <i class="fa-solid fa-circle"></i>
              ${therapist.status === "online" ? "Available" : "Offline"}
              ${
                therapist.yearsExperience
                  ? ` • ${therapist.yearsExperience} years exp.`
                  : ""
              }
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = therapistItems.join("");

    console.log("HTML has been set in container");
    console.log(
      "Container content after update:",
      container.innerHTML.substring(0, 200) + "..."
    );

    // Add a mutation observer to detect if content is being changed by other scripts
    if (window.therapistContainerObserver) {
      window.therapistContainerObserver.disconnect();
    }

    window.therapistContainerObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "childList" ||
          mutation.type === "characterData"
        ) {
          console.warn(
            "Therapist container content was modified by another script!",
            mutation
          );
          console.log(
            "New content:",
            container.innerHTML.substring(0, 200) + "..."
          );
        }
      });
    });

    window.therapistContainerObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  displayConversationsList(conversations) {
    const container = document.getElementById("usersList");
    if (!container) return;

    if (conversations.length === 0) {
      container.innerHTML =
        '<div class="no-conversations">No active conversations</div>';
      return;
    }

    container.innerHTML = conversations
      .map(
        (conv) => `
        <div class="therapist-card conversation-item user-card ${
          conv.unreadCount > 0 ? "has-unread" : ""
        }" 
             data-user-id="${conv.userId}"
             data-user-name="${conv.name.replace(/"/g, "&quot;")}"
             data-conversation-id="${conv.id}"
             data-is-online="${conv.isOnline}"
             data-profile-picture="${(conv.profilePicture || "").replace(
               /"/g,
               "&quot;"
             )}"
             role="button"
             tabindex="0">
          <div class="therapist-avatar">
            ${
              conv.profilePicture
                ? `<img src="${conv.profilePicture}" 
                     alt="${conv.name}"
                     onerror="this.src='../assets/profile-pictures/default-avatar.svg'">`
                : `<span>${this.getInitials(conv.name)}</span>`
            }
          </div>
          <div class="therapist-info">
            <div class="therapist-info-header">
              <h4 class="therapist-name">${conv.name}</h4>
              <span class="message-time">${this.formatTime(
                conv.lastMessageTime
              )}</span>
            </div>
            <p class="last-message">${conv.lastMessage || "No messages yet"}</p>
            <div class="therapist-status status-badge status-${
              conv.isOnline ? "online" : "offline"
            }">
              <i class="fa-solid fa-circle"></i>
              ${conv.isOnline ? "Online" : "Offline"}
            </div>
          </div>
          ${
            conv.unreadCount > 0
              ? `<span class="unread-badge">${conv.unreadCount}</span>`
              : ""
          }
        </div>
      `
      )
      .join("");
  }

  async selectTherapist(
    therapistId,
    therapistName,
    firstName = "",
    lastName = ""
  ) {
    try {
      console.log("=== SELECTING THERAPIST ===");
      console.log("Therapist ID:", therapistId);
      console.log("Therapist Name:", therapistName);
      console.log("Current User:", this.currentUser);

      this.currentChat = {
        id: therapistId,
        name: therapistName,
        firstName: firstName,
        lastName: lastName,
        type: "therapist",
      };

      // Get therapist's online status and profile picture from therapist list
      const therapistElement = document.querySelector(
        `[data-therapist-id="${therapistId}"]`
      );
      let therapistIsOnline = false;
      let therapistProfilePicture = null;

      if (therapistElement) {
        const statusBadge = therapistElement.querySelector(".therapist-status");
        therapistIsOnline =
          statusBadge?.classList.contains("status-online") || false;
        const profileImg = therapistElement.querySelector("img");
        therapistProfilePicture = profileImg?.src || null;
      }

      // Update UI with correct status and profile picture
      this.updateChatHeader(
        therapistName,
        therapistIsOnline,
        therapistProfilePicture
      );
      this.enableChatInput();

      // Join chat room with correct parameters
      const userId = this.currentUser._id || this.currentUser.id;
      const joinData = {
        therapistId: therapistId,
        userId: userId,
        currentUserId: userId,
      };

      console.log("→ Emitting 'join-chat' with data:", joinData);
      this.socket.emit("join-chat", joinData);

      // Load chat history
      console.log("→ Loading chat history...");
      await this.loadChatHistory(therapistId);

      // Mark active therapist
      this.markActiveItem("therapist", therapistId);

      console.log("✅ Therapist chat ready");
      console.log("=== THERAPIST SELECTED ===");
    } catch (error) {
      console.error("❌ Error selecting therapist:", error);
      this.showError("Failed to start chat with therapist");
    }
  }

  async selectConversation(userId, userName, conversationId) {
    try {
      console.log("=== SELECTING CONVERSATION ===");
      console.log("User ID:", userId);
      console.log("User Name:", userName);
      console.log("Conversation ID:", conversationId);
      console.log("Current User (Therapist):", this.currentUser);

      this.currentChat = {
        id: userId,
        name: userName,
        type: "user",
        conversationId: conversationId,
      };

      // Get user's online status and profile picture from data attributes
      const userElement = document.querySelector(`[data-user-id="${userId}"]`);
      let userIsOnline = false;
      let userProfilePicture = null;

      if (userElement) {
        userIsOnline = userElement.dataset.isOnline === "true";
        userProfilePicture = userElement.dataset.profilePicture || null;
      }

      // Update UI with correct status and profile picture
      this.updateChatHeader(userName, userIsOnline, userProfilePicture);
      this.enableChatInput();

      // Join chat room with correct parameters
      const therapistId = this.currentUser._id || this.currentUser.id;
      const joinData = {
        therapistId: therapistId,
        userId: userId,
        currentUserId: therapistId,
      };

      console.log("→ Emitting 'join-chat' with data:", joinData);
      this.socket.emit("join-chat", joinData);

      // Load chat history
      console.log("→ Loading chat history...");
      await this.loadChatHistoryForUser(userId);

      // Mark conversation as read
      if (conversationId) {
        await this.markConversationAsRead(conversationId);
      }

      // Mark active conversation
      this.markActiveItem("conversation", userId);

      console.log("✅ User chat ready");
      console.log("=== CONVERSATION SELECTED ===");
    } catch (error) {
      console.error("❌ Error selecting conversation:", error);
      this.showError("Failed to start chat with user");
    }
  }

  async loadChatHistory(therapistId) {
    try {
      const response = await fetch(`/api/chat/history/${therapistId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error("Failed to load chat history");

      const data = await response.json();

      // Store the actual conversation ID for use in clear/delete operations
      if (data.conversation && data.conversation.id) {
        this.currentChat.conversationId = data.conversation.id;
        console.log("Stored conversation ID:", data.conversation.id);
      }

      this.displayMessages(data.messages || []);
      this.messageHistory.set(therapistId, data.messages || []);
    } catch (error) {
      console.error("Error loading chat history:", error);
      this.showError("Failed to load chat history");
    }
  }

  async loadChatHistoryForUser(userId) {
    try {
      const response = await fetch(`/api/chat/history/user/${userId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error("Failed to load chat history");

      const data = await response.json();

      // Store the actual conversation ID for use in clear/delete operations
      if (data.conversation && data.conversation.id) {
        this.currentChat.conversationId = data.conversation.id;
        console.log("Stored conversation ID:", data.conversation.id);
      }

      this.displayMessages(data.messages || []);
      this.messageHistory.set(userId, data.messages || []);
    } catch (error) {
      console.error("Error loading chat history:", error);
      this.showError("Failed to load chat history");
    }
  }

  displayMessages(messages) {
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages) return;

    if (messages.length === 0) {
      chatMessages.innerHTML = `
        <div class="chat-empty-state">
          <div class="empty-state-icon">
            <i class="fa-solid fa-message"></i>
          </div>
          <h3>Start the Conversation</h3>
          <p>Send a message to begin your chat!</p>
        </div>
      `;
      return;
    }

    const messagesHTML = messages
      .map((msg) => this.createMessageHTML(msg))
      .join("");

    chatMessages.innerHTML = messagesHTML;
    this.scrollToBottom();
  }

  createMessageHTML(message) {
    // Safely get sender ID
    const senderId =
      message.sender?._id ||
      message.sender?.id ||
      message.from ||
      message.sender;
    const currentUserId = this.currentUser._id || this.currentUser.id;

    const isCurrentUser = senderId === currentUserId;
    const senderClass = isCurrentUser ? "sent" : "received";
    const timestamp = this.formatTime(message.createdAt || message.timestamp);

    // Get message content from various possible fields
    const messageContent =
      message.content || message.message || message.text || "";

    return `
      <div class="message ${senderClass}">
        <div class="message-content">
          <div class="message-text">${this.escapeHtml(messageContent)}</div>
          <div class="message-time">${timestamp}</div>
        </div>
      </div>
    `;
  }

  handleIncomingMessage(data) {
    console.log("=== INCOMING MESSAGE ===");
    console.log("Message data:", data);
    console.log("Current chat:", this.currentChat);
    console.log("Current user:", this.currentUser);

    if (!this.currentChat) {
      console.log("⚠️ No current chat selected, ignoring message");
      return;
    }

    // Check if message is for current chat
    const messageFromId = data.from || data.sender?._id || data.sender?.id;
    const isRelevantMessage = messageFromId === this.currentChat.id;

    console.log("Message from ID:", messageFromId);
    console.log("Current chat ID:", this.currentChat.id);
    console.log("Is relevant:", isRelevantMessage);

    if (isRelevantMessage) {
      console.log("✅ Message is relevant, adding to chat");

      // Add message to chat
      this.addMessageToChat(
        {
          content: data.message || data.content,
          sender: {
            _id: data.from || data.sender?._id,
            name: data.fromName || data.sender?.name,
          },
          createdAt: data.timestamp || data.createdAt,
        },
        false
      );

      // Update message history
      const messages = this.messageHistory.get(this.currentChat.id) || [];
      messages.push({
        content: data.message || data.content,
        sender: { _id: data.from || data.sender?._id },
        createdAt: data.timestamp || data.createdAt,
      });
      this.messageHistory.set(this.currentChat.id, messages);
    } else {
      console.log("⚠️ Message not relevant to current chat, ignoring");
    }

    // Update conversations list for therapists
    if (this.currentUser.role === "therapist") {
      this.loadConversations();
    }

    console.log("=== MESSAGE HANDLED ===");
  }

  addMessageToChat(message, isOwnMessage) {
    console.log(
      "Adding message to chat:",
      message,
      "Own message:",
      isOwnMessage
    );

    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages) {
      console.log("Chat messages container not found");
      return;
    }

    // Remove empty state if it exists
    const emptyState = chatMessages.querySelector(".chat-empty-state");
    if (emptyState) {
      emptyState.remove();
    }

    const messageElement = this.createMessageHTML(message);
    chatMessages.insertAdjacentHTML("beforeend", messageElement);
    this.scrollToBottom();
  }

  sendMessage() {
    const messageInput = document.getElementById("messageInput");
    if (!messageInput || !this.currentChat) {
      console.error("Cannot send message: missing input or chat not selected");
      this.showError("Please select a chat first");
      return;
    }

    const message = messageInput.value.trim();
    if (!message) {
      console.log("Cannot send empty message");
      return;
    }

    // Check socket connection
    if (!this.socket || !this.socket.connected) {
      console.error("Socket not connected!");
      this.showError("Connection lost. Please refresh the page.");
      return;
    }

    console.log("=== SENDING MESSAGE ===");
    console.log("Message text:", message);
    console.log("Current chat:", this.currentChat);
    console.log("Current user:", this.currentUser);
    console.log("Socket connected:", this.socket.connected);

    // Prepare message data - use consistent format
    const messageData = {
      message: message,
      timestamp: new Date().toISOString(),
      to: this.currentChat.id,
    };

    // Add role-specific IDs
    if (this.currentUser.role === "therapist") {
      messageData.userId = this.currentChat.id;
      console.log("→ Therapist sending to user:", this.currentChat.id);
    } else {
      messageData.therapistId = this.currentChat.id;
      console.log("→ User sending to therapist:", this.currentChat.id);
    }

    // Emit message through socket
    console.log("→ Emitting 'send-message' event with data:", messageData);
    this.socket.emit("send-message", messageData);

    // Add message to chat immediately (optimistic update)
    this.addMessageToChat(
      {
        content: message,
        sender: {
          _id: this.currentUser._id || this.currentUser.id,
          firstName: this.currentUser.firstName,
          lastName: this.currentUser.lastName,
        },
        createdAt: new Date().toISOString(),
      },
      true
    );

    // Clear input
    messageInput.value = "";

    // Stop typing indicator
    this.handleStopTyping();

    console.log("=== MESSAGE SENT ===");
  }

  handleTyping() {
    if (!this.currentChat || this.isTyping) return;

    this.isTyping = true;
    this.socket.emit("typing", { to: this.currentChat.id });

    // Clear existing timer
    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
    }

    // Set timer to stop typing
    this.typingTimer = setTimeout(() => {
      this.handleStopTyping();
    }, 2000);
  }

  handleStopTyping() {
    if (!this.currentChat || !this.isTyping) return;

    this.isTyping = false;
    this.socket.emit("stop-typing", { to: this.currentChat.id });

    if (this.typingTimer) {
      clearTimeout(this.typingTimer);
      this.typingTimer = null;
    }
  }

  showTypingIndicator(data) {
    const chatMessages = document.getElementById("chatMessages");
    if (!chatMessages) return;

    // Remove existing typing indicator
    const existingIndicator = chatMessages.querySelector(".typing-indicator");
    if (existingIndicator) {
      existingIndicator.remove();
    }

    // Add new typing indicator
    const typingHTML = `
      <div class="typing-indicator" id="typing-${data.from}">
        <div class="message received">
          <div class="message-content">
            <div class="typing-text">
              ${data.userName} is typing
              <span class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </div>
          </div>
        </div>
      </div>
    `;

    chatMessages.insertAdjacentHTML("beforeend", typingHTML);
    this.scrollToBottom();
  }

  hideTypingIndicator(data) {
    const indicator = document.getElementById(`typing-${data.from}`);
    if (indicator) {
      indicator.remove();
    }
  }

  async markConversationAsRead(conversationId) {
    try {
      await fetch(`/api/chat/mark-read/${conversationId}`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
    } catch (error) {
      console.error("Error marking conversation as read:", error);
    }
  }

  updateChatHeader(name, isOnline = false, profilePicture = null) {
    // Update main header
    const chatMainHeader = document.getElementById("chatMainHeader");
    const chatUserName = document.getElementById("chatUserName");
    const chatUserStatus = document.getElementById("chatUserStatus");
    const chatUserAvatar = document.getElementById("chatUserAvatar");

    if (chatMainHeader) {
      chatMainHeader.style.display = "flex";
    }

    if (chatUserName) {
      chatUserName.textContent = name;
    }

    if (chatUserStatus) {
      const statusClass = isOnline ? "status-online" : "status-offline";
      const statusText = isOnline ? "Online" : "Offline";
      chatUserStatus.className = `chat-user-status ${statusClass}`;
      chatUserStatus.innerHTML = `<i class="fa-solid fa-circle"></i> ${statusText}`;
    }

    if (chatUserAvatar) {
      if (profilePicture) {
        // Display profile picture if available
        chatUserAvatar.innerHTML = `<img src="${profilePicture}" 
                                        alt="${name}" 
                                        style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"
                                        onerror="this.parentElement.innerHTML='<span>${this.getInitials(
                                          name
                                        )}</span>'" />`;
      } else {
        // Fallback to initials
        chatUserAvatar.innerHTML = `<span>${this.getInitials(name)}</span>`;
      }
    }

    // Update status text
    const chatStatus = document.getElementById("chatStatus");
    if (chatStatus) {
      chatStatus.textContent = `Chatting with ${name}`;
    }
  }

  enableChatInput() {
    const messageInput = document.getElementById("messageInput");
    const sendButton = document.getElementById("sendButton");

    if (messageInput) {
      messageInput.disabled = false;
      messageInput.placeholder = "Type your message here...";
    }

    if (sendButton) {
      sendButton.disabled = false;
    }
  }

  markActiveItem(type, id) {
    // Remove previous active states
    document
      .querySelectorAll(".therapist-item, .conversation-item")
      .forEach((item) => {
        item.classList.remove("active");
      });

    // Add active state to selected item
    const selector =
      type === "therapist"
        ? `.therapist-item[onclick*="${id}"]`
        : `.conversation-item[onclick*="${id}"]`;

    const activeItem = document.querySelector(selector);
    if (activeItem) {
      activeItem.classList.add("active");
    }
  }

  scrollToBottom() {
    const chatMessages = document.getElementById("chatMessages");
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  formatTime(timestamp) {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) {
      // Less than 1 minute
      return "Just now";
    } else if (diff < 3600000) {
      // Less than 1 hour
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) {
      // Less than 1 day
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  getInitials(name) {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  showError(message) {
    console.error("Chat error:", message);
    // You can implement a toast notification here
    if (typeof showToast === "function") {
      showToast(message, "error");
    }
  }

  showSuccess(message) {
    console.log("Chat success:", message);
    // Show success toast notification
    if (typeof showToast === "function") {
      showToast(message, "success");
    }
  }

  // Update user online/offline status in real-time
  updateUserStatus(userId, status) {
    console.log(`Updating status for user ${userId} to ${status}`);

    // Update therapist cards if on user dashboard
    const therapistCards = document.querySelectorAll(".therapist-card");
    therapistCards.forEach((card) => {
      const therapistId = card.getAttribute("data-therapist-id");
      if (therapistId === userId) {
        const statusBadge = card.querySelector(".therapist-status");
        if (statusBadge) {
          // Update status class
          statusBadge.className = `therapist-status status-${status}`;
          // Update status text
          const statusText = status === "online" ? "Available" : "Offline";
          const statusHTML = statusBadge.innerHTML;
          statusBadge.innerHTML = statusHTML.replace(
            /Available|Offline/,
            statusText
          );
          console.log(`Updated therapist card status to ${statusText}`);
        }
      }
    });

    // Update conversation list if on therapist dashboard
    const conversationItems = document.querySelectorAll(".conversation-item");
    conversationItems.forEach((item) => {
      const conversationUserId = item.getAttribute("data-user-id");
      if (conversationUserId === userId) {
        const statusBadge = item.querySelector(".status-badge");
        if (statusBadge) {
          statusBadge.className = `status-badge status-${status}`;
          statusBadge.textContent = status === "online" ? "Online" : "Offline";
          console.log(`Updated conversation status to ${status}`);
        }
      }
    });

    // Update current chat header if this is the active chat
    if (this.currentChat && this.currentChat.userId === userId) {
      const headerStatus = document.querySelector(".chat-header .status-badge");
      if (headerStatus) {
        headerStatus.className = `status-badge status-${status}`;
        headerStatus.textContent = status === "online" ? "Online" : "Offline";
        console.log(`Updated chat header status to ${status}`);
      }
    }
  }

  // Force refresh all data - clears cache and reloads everything
  async forceRefreshAllData() {
    console.log("Force refreshing all chat data...");

    // Clear all cached data
    localStorage.removeItem("therapistsCache");
    sessionStorage.removeItem("therapistsCache");
    localStorage.removeItem("userData");
    sessionStorage.removeItem("userData");

    // Reload current user
    await this.loadCurrentUser();

    // Reload conversations/therapists based on role
    if (this.currentUser.role === "therapist") {
      await this.loadConversations();
    } else {
      await this.loadTherapists();
    }

    console.log("Force refresh complete");
  }

  // Chat Options Methods
  toggleChatOptions() {
    const menu = document.getElementById("chatOptionsMenu");
    if (menu) {
      menu.style.display = menu.style.display === "none" ? "block" : "none";
    }
  }

  closeChatOptions() {
    const menu = document.getElementById("chatOptionsMenu");
    if (menu) {
      menu.style.display = "none";
    }
  }

  async viewUserProfile() {
    if (!this.currentChat) {
      this.showError("Please select a conversation first");
      return;
    }
    console.log("Opening profile for:", this.currentChat.id);
    this.closeChatOptions();

    try {
      const response = await fetch(`/api/profile/${this.currentChat.id}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error("Failed to load profile");

      const userData = await response.json();
      this.showProfileModal(userData);
    } catch (error) {
      console.error("Error loading profile:", error);
      this.showError("Failed to load user profile");
    }
  }

  async viewTherapistProfile() {
    if (!this.currentChat) {
      this.showError("Please select a therapist first");
      return;
    }
    console.log("Opening therapist profile for:", this.currentChat.id);
    this.closeChatOptions();

    try {
      const response = await fetch(`/api/profile/${this.currentChat.id}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error("Failed to load profile");

      const therapistData = await response.json();
      this.showProfileModal(therapistData);
    } catch (error) {
      console.error("Error loading profile:", error);
      this.showError("Failed to load therapist profile");
    }
  }

  showProfileModal(userData) {
    const modalHTML = `
      <div class="profile-modal-overlay" onclick="this.remove()">
        <div class="profile-modal" onclick="event.stopPropagation()">
          <button class="modal-close" onclick="this.closest('.profile-modal-overlay').remove()">
            <i class="fa-solid fa-times"></i>
          </button>
          
          <div class="profile-modal-header">
            <div class="profile-modal-avatar">
              ${
                userData.profilePicture
                  ? `<img src="${userData.profilePicture}" alt="${userData.firstName} ${userData.lastName}" onerror="this.src='../assets/profile-pictures/default-avatar.svg'">`
                  : `<span>${this.getInitials(
                      `${userData.firstName} ${userData.lastName}`
                    )}</span>`
              }
            </div>
            <div class="profile-modal-title">
              <h2>${userData.firstName} ${userData.lastName}</h2>
              <p class="profile-role">${
                userData.role === "therapist"
                  ? "👨‍⚕️ Mental Health Professional"
                  : "👤 User"
              }</p>
            </div>
          </div>

          <div class="profile-modal-content">
            <!-- Basic Information -->
            <div class="profile-section">
              <h3>Personal Information</h3>
              <div class="profile-item">
                <span class="label"><i class="fa-solid fa-user"></i> First Name:</span>
                <span class="value">${userData.firstName || "N/A"}</span>
              </div>
              <div class="profile-item">
                <span class="label"><i class="fa-solid fa-user"></i> Last Name:</span>
                <span class="value">${userData.lastName || "N/A"}</span>
              </div>
              <div class="profile-item">
                <span class="label"><i class="fa-solid fa-envelope"></i> Email:</span>
                <span class="value">${userData.email || "N/A"}</span>
              </div>
              <div class="profile-item">
                <span class="label"><i class="fa-solid fa-phone"></i> Phone:</span>
                <span class="value">${userData.phone || "N/A"}</span>
              </div>
              ${
                userData.dateOfBirth
                  ? `
                <div class="profile-item">
                  <span class="label"><i class="fa-solid fa-calendar"></i> Date of Birth:</span>
                  <span class="value">${userData.dateOfBirth || "N/A"}</span>
                </div>
              `
                  : ""
              }
              ${
                userData.gender
                  ? `
                <div class="profile-item">
                  <span class="label"><i class="fa-solid fa-venus-mars"></i> Gender:</span>
                  <span class="value">${userData.gender || "N/A"}</span>
                </div>
              `
                  : ""
              }
              ${
                userData.location
                  ? `
                <div class="profile-item">
                  <span class="label"><i class="fa-solid fa-location-dot"></i> Location:</span>
                  <span class="value">${userData.location || "N/A"}</span>
                </div>
              `
                  : ""
              }
              ${
                userData.bio
                  ? `
                <div class="profile-item full-width">
                  <span class="label"><i class="fa-solid fa-info-circle"></i> About Me:</span>
                  <span class="value bio-text">${userData.bio}</span>
                </div>
              `
                  : ""
              }
            </div>

            ${
              userData.role !== "therapist"
                ? `
              <!-- Mental Health Information (for users) -->
              <div class="profile-section">
                <h3>Mental Health Information</h3>
                ${
                  userData.preferredLanguage
                    ? `
                  <div class="profile-item">
                    <span class="label"><i class="fa-solid fa-language"></i> Preferred Language:</span>
                    <span class="value">${userData.preferredLanguage}</span>
                  </div>
                `
                    : ""
                }
                ${
                  userData.mentalHealthConcerns &&
                  userData.mentalHealthConcerns.length > 0
                    ? `
                  <div class="profile-item full-width">
                    <span class="label"><i class="fa-solid fa-brain"></i> Primary Mental Health Concerns:</span>
                    <div class="profile-tags">
                      ${userData.mentalHealthConcerns
                        .map((concern) => `<span class="tag">${concern}</span>`)
                        .join("")}
                    </div>
                  </div>
                `
                    : ""
                }
                ${
                  userData.mentalHealthGoals
                    ? `
                  <div class="profile-item full-width">
                    <span class="label"><i class="fa-solid fa-target"></i> Mental Health Goals:</span>
                    <span class="value bio-text">${userData.mentalHealthGoals}</span>
                  </div>
                `
                    : ""
                }
              </div>
            `
                : ""
            }

            ${
              userData.role === "therapist"
                ? `
              <!-- Professional Information -->
              <div class="profile-section">
                <h3>Professional Information</h3>
                <div class="profile-item">
                  <span class="label"><i class="fa-solid fa-briefcase"></i> Specialization:</span>
                  <span class="value">${userData.specialization || "N/A"}</span>
                </div>
                <div class="profile-item">
                  <span class="label"><i class="fa-solid fa-award"></i> Experience:</span>
                  <span class="value">${
                    userData.yearsExperience || "N/A"
                  } years</span>
                </div>
                <div class="profile-item">
                  <span class="label"><i class="fa-solid fa-building"></i> Institution:</span>
                  <span class="value">${userData.institution || "N/A"}</span>
                </div>
                ${
                  userData.bio
                    ? `
                  <div class="profile-item full-width">
                    <span class="label"><i class="fa-solid fa-info-circle"></i> Bio:</span>
                    <span class="value bio-text">${userData.bio}</span>
                  </div>
                `
                    : ""
                }
              </div>

              <!-- Professional Credentials -->
              <div class="profile-section">
                <h3>Professional Credentials</h3>
                ${
                  userData.education
                    ? `
                  <div class="profile-item">
                    <span class="label"><i class="fa-solid fa-graduation-cap"></i> Education:</span>
                    <span class="value">${userData.education}</span>
                  </div>
                `
                    : ""
                }
                ${
                  userData.certifications
                    ? `
                  <div class="profile-item">
                    <span class="label"><i class="fa-solid fa-certificate"></i> Certifications:</span>
                    <span class="value">${userData.certifications}</span>
                  </div>
                `
                    : ""
                }
                ${
                  userData.licenseNumber
                    ? `
                  <div class="profile-item">
                    <span class="label"><i class="fa-solid fa-id-card"></i> License Number:</span>
                    <span class="value">${userData.licenseNumber}</span>
                  </div>
                `
                    : ""
                }
              </div>

              ${
                userData.stats
                  ? `
                <div class="profile-section">
                  <h3>Statistics</h3>
                  <div class="profile-stats-grid">
                    <div class="stat">
                      <span class="stat-number">${
                        userData.stats.patientsHelped || 0
                      }</span>
                      <span class="stat-label">Patients Helped</span>
                    </div>
                    <div class="stat">
                      <span class="stat-number">${
                        userData.stats.hoursThisMonth || 0
                      }h</span>
                      <span class="stat-label">Hours This Month</span>
                    </div>
                    <div class="stat">
                      <span class="stat-number">${
                        userData.stats.rating || "0.0"
                      }</span>
                      <span class="stat-label">Average Rating</span>
                    </div>
                  </div>
                </div>
              `
                  : ""
              }

              ${
                userData.languagesSpoken && userData.languagesSpoken.length > 0
                  ? `
                <div class="profile-section">
                  <h3>Languages</h3>
                  <div class="profile-tags">
                    ${userData.languagesSpoken
                      .map((lang) => `<span class="tag">${lang}</span>`)
                      .join("")}
                  </div>
                </div>
              `
                  : ""
              }

              ${
                userData.areasOfExpertise &&
                userData.areasOfExpertise.length > 0
                  ? `
                <div class="profile-section">
                  <h3>Areas of Expertise</h3>
                  <div class="profile-tags">
                    ${userData.areasOfExpertise
                      .map(
                        (area) =>
                          `<span class="tag expertise-tag">${area}</span>`
                      )
                      .join("")}
                  </div>
                </div>
              `
                  : ""
              }
            `
                : ""
            }
          </div>
        </div>
      </div>
    `;

    const container = document.createElement("div");
    container.innerHTML = modalHTML;
    document.body.appendChild(container.firstElementChild);
  }

  async clearChatHistory() {
    if (!this.currentChat) {
      this.showError("Please select a conversation first");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to clear this chat history? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      // Use the conversation ID, not the therapist/user ID
      const conversationId =
        this.currentChat.conversationId || this.currentChat.id;

      const response = await fetch(`/api/chat/${conversationId}/clear`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        // Clear messages from UI
        const chatMessages = document.getElementById("chatMessages");
        if (chatMessages) {
          chatMessages.innerHTML = `
            <div class="chat-empty-state">
              <div class="empty-state-icon">
                <i class="fa-solid fa-comments"></i>
              </div>
              <h3>Chat History Cleared</h3>
              <p>This conversation history has been cleared.</p>
            </div>
          `;
        }
        this.showSuccess("Chat history cleared successfully");
      } else {
        this.showError("Failed to clear chat history");
      }
    } catch (error) {
      console.error("Error clearing chat history:", error);
      this.showError("Error clearing chat history");
    }

    this.closeChatOptions();
  }

  async blockUser() {
    if (!this.currentChat) {
      this.showError("Please select a user first");
      return;
    }

    if (!confirm(`Are you sure you want to block ${this.currentChat.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${this.currentChat.id}/block`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        this.showSuccess(`${this.currentChat.name} has been blocked`);
        // Remove from conversation list
        const element = document.querySelector(
          `[data-user-id="${this.currentChat.id}"]`
        );
        if (element) {
          element.remove();
        }
        // Clear chat
        document.getElementById("chatMessages").innerHTML = `
          <div class="chat-empty-state">
            <div class="empty-state-icon">
              <i class="fa-solid fa-ban"></i>
            </div>
            <h3>User Blocked</h3>
            <p>You have blocked this user.</p>
          </div>
        `;
        this.currentChat = null;
      } else {
        this.showError("Failed to block user");
      }
    } catch (error) {
      console.error("Error blocking user:", error);
      this.showError("Error blocking user");
    }

    this.closeChatOptions();
  }

  async reportTherapist() {
    if (!this.currentChat) {
      this.showError("Please select a therapist first");
      return;
    }

    const reason = prompt(
      `Report ${this.currentChat.name}?\n\nPlease enter the reason:`,
      ""
    );
    if (!reason) {
      return;
    }

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          reportedUserId: this.currentChat.id,
          reason: reason,
          reportType: "therapist",
        }),
      });

      if (response.ok) {
        this.showSuccess(
          "Report submitted successfully. Thank you for helping keep our platform safe."
        );
      } else {
        this.showError("Failed to submit report");
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      this.showError("Error submitting report");
    }

    this.closeChatOptions();
  }
}

// Initialize chat manager when DOM is loaded
let chatManager;

document.addEventListener("DOMContentLoaded", function () {
  // Only initialize chat on pages with chat functionality
  const chatSection = document.getElementById("chat");
  if (chatSection) {
    chatManager = new ChatManager();
    window.chatManager = chatManager; // Make globally available
  }
});

// Global function to force refresh (used by the refresh button)
async function forceRefreshTherapists() {
  console.log("Global force refresh called");
  if (window.chatManager) {
    await window.chatManager.forceRefreshAllData();
  } else {
    console.log("ChatManager not initialized, reloading page...");
    window.location.reload();
  }
}
