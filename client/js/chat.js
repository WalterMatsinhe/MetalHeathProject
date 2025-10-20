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

      // Determine user role from URL if not in profile
      if (!this.currentUser.role) {
        this.currentUser.role = window.location.pathname.includes("therapist")
          ? "therapist"
          : "user";
      }

      console.log("Current user loaded:", this.currentUser);
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
        this.currentUser.name ||
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
             onclick="chatManager.selectTherapist('${
               therapist._id
             }', '${displayName}')">
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
        <div class="therapist-card conversation-item ${
          conv.unreadCount > 0 ? "has-unread" : ""
        }" 
             data-user-id="${conv.userId}"
             onclick="chatManager.selectConversation('${conv.userId}', '${
          conv.name
        }', '${conv.id}')">
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

  async selectTherapist(therapistId, therapistName) {
    try {
      console.log("=== SELECTING THERAPIST ===");
      console.log("Therapist ID:", therapistId);
      console.log("Therapist Name:", therapistName);
      console.log("Current User:", this.currentUser);

      this.currentChat = {
        id: therapistId,
        name: therapistName,
        type: "therapist",
      };

      // Update UI
      this.updateChatHeader(therapistName, false);
      this.enableChatInput();

      // Join chat room
      const joinData = {
        therapistId: therapistId,
        userId: this.currentUser._id || this.currentUser.id,
        currentUserId: this.currentUser._id || this.currentUser.id,
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

      // Update UI
      this.updateChatHeader(userName, false);
      this.enableChatInput();

      // Join chat room
      const joinData = {
        therapistId: this.currentUser._id || this.currentUser.id,
        userId: userId,
        currentUserId: this.currentUser._id || this.currentUser.id,
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

    // Prepare message data
    const messageData = {
      message: message,
      timestamp: new Date().toISOString(),
    };

    // Set recipient based on user role
    if (this.currentUser.role === "therapist") {
      messageData.userId = this.currentChat.id;
      messageData.to = this.currentChat.id;
      console.log("→ Therapist sending to user:", this.currentChat.id);
    } else {
      messageData.therapistId = this.currentChat.id;
      messageData.to = this.currentChat.id;
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
          name: this.currentUser.name,
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

  updateChatHeader(name, isOnline = false) {
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
      chatUserAvatar.innerHTML = `<span>${this.getInitials(name)}</span>`;
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
