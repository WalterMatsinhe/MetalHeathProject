// ============================================
// NOTIFICATION SYSTEM
// ============================================

// Notification state management
let notificationState = {
  user: {
    unread: 0,
    notifications: [],
    lastFetch: null,
  },
  therapist: {
    unread: 0,
    notifications: [],
    lastFetch: null,
  },
};

// Function to fetch real-time notifications for users
async function fetchUserNotifications() {
  try {
    const notifications = [];

    // Fetch unread messages count
    const chatResponse = await fetch("/api/chat/unread-count", {
      headers: getAuthHeaders(),
    });
    if (chatResponse.ok) {
      const { unreadCount } = await chatResponse.json();
      if (unreadCount > 0) {
        notifications.push({
          id: `chat-${Date.now()}`,
          type: "chat",
          icon: "fa-comments",
          iconBg: "#e1f5fe",
          iconColor: "#00bfff",
          title: "New Messages",
          message: `You have ${unreadCount} unread message${
            unreadCount > 1 ? "s" : ""
          } from therapists`,
          time: "Just now",
          timestamp: new Date(),
          priority: "high",
          action: "chat",
        });
      }
    }

    // Fetch overdue reminders
    const remindersResponse = await fetch("/api/reminders/overdue", {
      headers: getAuthHeaders(),
    });
    if (remindersResponse.ok) {
      const { reminders } = await remindersResponse.json();
      reminders.slice(0, 3).forEach((reminder, index) => {
        notifications.push({
          id: `reminder-${reminder._id}`,
          type: "reminder",
          icon: "fa-bell",
          iconBg: "#fff3e0",
          iconColor: "#ff9800",
          title: reminder.title,
          message: reminder.description || "You have a pending reminder",
          time: formatTimeAgo(new Date(reminder.reminderTime)),
          timestamp: new Date(reminder.reminderTime),
          priority: "medium",
          action: "reminders",
          data: reminder,
        });
      });
    }

    // Fetch upcoming reminders
    const upcomingResponse = await fetch("/api/reminders/upcoming?days=1", {
      headers: getAuthHeaders(),
    });
    if (upcomingResponse.ok) {
      const { reminders } = await upcomingResponse.json();
      reminders.slice(0, 2).forEach((reminder) => {
        notifications.push({
          id: `upcoming-${reminder._id}`,
          type: "upcoming",
          icon: "fa-clock",
          iconBg: "#e3f2fd",
          iconColor: "#2196f3",
          title: "Upcoming: " + reminder.title,
          message: reminder.description || "Coming up soon",
          time: formatTimeAgo(new Date(reminder.reminderTime)),
          timestamp: new Date(reminder.reminderTime),
          priority: "low",
          action: "reminders",
          data: reminder,
        });
      });
    }

    // Check if daily mood check-in is done
    const moodCheckResponse = await fetch("/api/mood/today/check", {
      headers: getAuthHeaders(),
    });
    if (moodCheckResponse.ok) {
      const { hasCheckedIn } = await moodCheckResponse.json();
      if (!hasCheckedIn) {
        notifications.push({
          id: "mood-checkin",
          type: "mood",
          icon: "fa-face-smile",
          iconBg: "#e8f5e8",
          iconColor: "#4caf50",
          title: "Daily Mood Check-in",
          message: "Track your mood to identify patterns and triggers",
          time: "Today",
          timestamp: new Date(),
          priority: "medium",
          action: "mood",
        });
      }
    }

    // Fetch goal achievements
    const goalsResponse = await fetch("/api/goals/stats", {
      headers: getAuthHeaders(),
    });
    if (goalsResponse.ok) {
      const { stats } = await goalsResponse.json();
      if (stats.completedToday > 0) {
        notifications.push({
          id: "goals-achievement",
          type: "achievement",
          icon: "fa-trophy",
          iconBg: "#fff9c4",
          iconColor: "#f9a825",
          title: "Goal Achievement! 🎉",
          message: `Congratulations! You've completed ${
            stats.completedToday
          } goal${stats.completedToday > 1 ? "s" : ""} today`,
          time: "Today",
          timestamp: new Date(),
          priority: "low",
          action: "goals",
        });
      }
    }

    // Sort notifications by priority and timestamp
    notifications.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      return b.timestamp - a.timestamp;
    });

    notificationState.user.notifications = notifications;
    notificationState.user.unread = notifications.length;
    notificationState.user.lastFetch = new Date();

    return notifications;
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    return [];
  }
}

// Function to fetch real-time notifications for therapists
async function fetchTherapistNotifications() {
  try {
    const notifications = [];

    // Fetch unread messages from users
    const chatResponse = await fetch("/api/chat/unread-count", {
      headers: getAuthHeaders(),
    });
    if (chatResponse.ok) {
      const { unreadCount } = await chatResponse.json();
      if (unreadCount > 0) {
        notifications.push({
          id: `chat-${Date.now()}`,
          type: "urgent",
          icon: "fa-envelope",
          iconBg: "#fee",
          iconColor: "#dc3545",
          title: "New Messages from Users",
          message: `You have ${unreadCount} unread message${
            unreadCount > 1 ? "s" : ""
          } from users`,
          time: "Just now",
          timestamp: new Date(),
          priority: "high",
          action: "chat",
        });
      }
    }

    // Fetch conversations to get detailed message info
    const conversationsResponse = await fetch("/api/chat/conversations", {
      headers: getAuthHeaders(),
    });
    if (conversationsResponse.ok) {
      const conversations = await conversationsResponse.json();

      // Add notifications for each conversation with unread messages
      conversations
        .filter((conv) => conv.unreadCount > 0)
        .slice(0, 5)
        .forEach((conv, index) => {
          const priority = index === 0 ? "high" : "medium";
          notifications.push({
            id: `conv-${conv.id}`,
            type: "message",
            icon: "fa-comment-dots",
            iconBg: priority === "high" ? "#fff5f5" : "#e3f2fd",
            iconColor: priority === "high" ? "#e53e3e" : "#2196f3",
            title: `Message from ${conv.name}`,
            message: conv.lastMessage || "New message received",
            time: formatTimeAgo(new Date(conv.lastMessageTime)),
            timestamp: new Date(conv.lastMessageTime),
            priority: priority,
            action: "chat",
            data: conv,
          });
        });
    }

    // Add sample appointment notifications (can be extended with real appointment system)
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    notifications.push({
      id: "appointments-today",
      type: "appointment",
      icon: "fa-calendar-check",
      iconBg: "#e8f5e8",
      iconColor: "#4caf50",
      title: "Today's Schedule",
      message: "Check your appointments and tasks for today",
      time: "Today",
      timestamp: todayStart,
      priority: "medium",
      action: "dashboard",
    });

    // Sort notifications by priority and timestamp
    notifications.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      return b.timestamp - a.timestamp;
    });

    notificationState.therapist.notifications = notifications;
    notificationState.therapist.unread = notifications.length;
    notificationState.therapist.lastFetch = new Date();

    return notifications;
  } catch (error) {
    console.error("Error fetching therapist notifications:", error);
    return [];
  }
}

// Helper function to format time ago
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

// Notification functionality
let unreadNotifications = 0; // Will be updated from API

// Update notification badge
async function updateNotificationBadge() {
  const badge = document.getElementById("notification-badge");
  if (badge) {
    try {
      // Fetch fresh notifications
      await fetchUserNotifications();
      const count = notificationState.user.unread;

      if (count > 0) {
        badge.textContent = count > 99 ? "99+" : count.toString();
        badge.style.display = "flex";
      } else {
        badge.style.display = "none";
      }
    } catch (error) {
      console.error("Error updating notification badge:", error);
      badge.style.display = "none";
    }
  }
}

// Update therapist notification badge
async function updateTherapistNotificationBadge() {
  const badge = document.getElementById("therapist-notification-badge");
  if (badge) {
    try {
      // Fetch fresh notifications
      await fetchTherapistNotifications();
      const count = notificationState.therapist.unread;

      if (count > 0) {
        badge.textContent = count > 99 ? "99+" : count.toString();
        badge.style.display = "inline-block";
      } else {
        badge.style.display = "none";
      }
    } catch (error) {
      console.error("Error updating therapist notification badge:", error);
      badge.style.display = "none";
    }
  }
}

// Function to add new notifications (for real-time updates)
function addNewNotification() {
  unreadNotifications++;
  updateNotificationBadge();
}

// Auto-refresh notifications periodically
function startNotificationAutoRefresh() {
  const isTherapist = window.location.pathname.includes("therapistDashboard");

  // Refresh every 30 seconds
  setInterval(async () => {
    if (isTherapist) {
      await updateTherapistNotificationBadge();
    } else {
      await updateNotificationBadge();
    }
  }, 30000);
}

function showNotifications() {
  // Fetch latest notifications first
  fetchUserNotifications().then((notifications) => {
    displayNotificationPanel(notifications, false);
  });
}

function displayNotificationPanel(notifications, isTherapist = false) {
  // Create notification overlay
  const overlay = document.createElement("div");
  overlay.id = isTherapist
    ? "therapist-notification-overlay"
    : "notification-overlay";
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
    width: ${isTherapist ? "400px" : "350px"};
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

  // Build notification items HTML
  let notificationsHTML = "";

  if (notifications.length === 0) {
    notificationsHTML = `
      <div style="padding: 40px 20px; text-align: center; color: #999;">
        <i class="fa-solid fa-bell-slash" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
        <p style="margin: 0;">No new notifications</p>
      </div>
    `;
  } else {
    notifications.forEach((notif) => {
      const bgColor =
        notif.priority === "high"
          ? "#fff5f5"
          : notif.priority === "medium"
          ? "#f8f9fa"
          : "white";

      notificationsHTML += `
        <div class="notification-item" style="padding: 15px 20px; border-bottom: 1px solid #f0f0f0; cursor: pointer; background: ${bgColor};" 
             onclick="handleNotificationClick('${notif.action}', '${
        notif.id
      }', ${isTherapist})">
          <div style="display: flex; align-items: center;">
            <div style="width: 40px; height: 40px; background: ${
              notif.iconBg
            }; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
              <i class="fa-solid ${notif.icon}" style="color: ${
        notif.iconColor
      };"></i>
            </div>
            <div style="flex: 1;">
              <h4 style="margin: 0 0 4px 0; font-size: 14px; color: #333; font-weight: ${
                notif.priority === "high" ? "bold" : "600"
              };">${notif.title}</h4>
              <p style="margin: 0; font-size: 12px; color: #666;">${
                notif.message
              }</p>
              <span style="font-size: 11px; color: #999;">${notif.time}</span>
            </div>
            ${
              notif.priority === "high" || notif.type === "urgent"
                ? '<div style="width: 8px; height: 8px; background: #dc3545; border-radius: 50%;"></div>'
                : ""
            }
          </div>
        </div>
      `;
    });
  }

  // Notification content
  const title = isTherapist ? "Messages from Users" : "Notifications";
  const icon = isTherapist ? "fa-envelope" : "fa-bell";

  panel.innerHTML = `
    <div style="padding: 20px; border-bottom: 1px solid #eee;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0; color: #333; display: flex; align-items: center;">
          <i class="fa-solid ${icon}" style="margin-right: 10px; color: #007bff;"></i>
          ${title}
        </h3>
        <button onclick="${
          isTherapist ? "closeTherapistNotifications" : "closeNotifications"
        }()" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #666;">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    </div>
    
    <div style="padding: 0;">
      ${notificationsHTML}
    </div>

    <div style="padding: 15px 20px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
      ${
        notifications.length > 0
          ? `
        <button onclick="${
          isTherapist ? "markAllTherapistMessagesAsRead" : "markAllAsRead"
        }()" style="width: 100%; padding: 8px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px; margin-bottom: 8px;">
          Mark All as Read
        </button>
      `
          : ""
      }
      ${
        isTherapist
          ? `
        <button onclick="closeTherapistNotifications(); showSection('chat');" style="width: 100%; padding: 8px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">
          Go to Chat
        </button>
      `
          : ""
      }
    </div>
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // Close on overlay click
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) {
      if (isTherapist) {
        closeTherapistNotifications();
      } else {
        closeNotifications();
      }
    }
  });

  // Add hover effects
  const notificationItems = panel.querySelectorAll(".notification-item");
  notificationItems.forEach((item) => {
    const originalBg = item.style.background;
    item.addEventListener("mouseenter", function () {
      this.style.background = "#e9ecef";
    });
    item.addEventListener("mouseleave", function () {
      this.style.background = originalBg;
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

// Handle notification clicks with real navigation
function handleNotificationClick(action, notificationId, isTherapist = false) {
  // Mark this notification as read
  if (isTherapist) {
    const index = notificationState.therapist.notifications.findIndex(
      (n) => n.id === notificationId
    );
    if (index !== -1) {
      notificationState.therapist.notifications.splice(index, 1);
      notificationState.therapist.unread =
        notificationState.therapist.notifications.length;
      updateTherapistNotificationBadge();
    }
    closeTherapistNotifications();
  } else {
    const index = notificationState.user.notifications.findIndex(
      (n) => n.id === notificationId
    );
    if (index !== -1) {
      notificationState.user.notifications.splice(index, 1);
      notificationState.user.unread =
        notificationState.user.notifications.length;
      updateNotificationBadge();
    }
    closeNotifications();
  }

  // Navigate based on action
  switch (action) {
    case "chat":
      if (typeof showSection === "function") {
        showSection("chat");
      }
      break;
    case "mood":
      if (typeof showSection === "function") {
        showSection("mood");
      }
      break;
    case "goals":
    case "reminders":
      const section = document.getElementById("goals");
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
      }
      break;
    case "resources":
      if (typeof showSection === "function") {
        showSection("resources");
      }
      break;
    case "support":
      if (typeof showSection === "function") {
        showSection("support");
      }
      break;
    case "dashboard":
      if (typeof showSection === "function") {
        showSection("dashboard");
      }
      break;
  }
}

// Mark all notifications as read
async function markAllAsRead() {
  try {
    // Clear all user notifications
    notificationState.user.notifications = [];
    notificationState.user.unread = 0;

    // Update UI
    updateNotificationBadge();

    // Show success message
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = "Marked as Read ✓";
    button.style.background = "#28a745";

    setTimeout(() => {
      closeNotifications();
    }, 1000);
  } catch (error) {
    console.error("Error marking notifications as read:", error);
  }
}

// Therapist Notification System
function showTherapistNotifications() {
  // Fetch latest therapist notifications first
  fetchTherapistNotifications().then((notifications) => {
    displayNotificationPanel(notifications, true);
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
      if (typeof showSection === "function") {
        showSection("support");
      }
      alert(
        "Prioritizing urgent support request. Redirecting to support center."
      );
      break;
    case "session-request":
      if (typeof showSection === "function") {
        showSection("support");
      }
      break;
    case "followup":
    case "feedback":
    case "appointment":
      if (typeof showSection === "function") {
        showSection("chat");
      }
      break;
    default:
      console.log("Notification clicked:", type);
  }
}

async function markAllTherapistMessagesAsRead() {
  try {
    // Clear all therapist notifications
    notificationState.therapist.notifications = [];
    notificationState.therapist.unread = 0;

    // Update UI
    updateTherapistNotificationBadge();

    // Show feedback
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = "Marked as Read ✓";
    button.style.background = "#28a745";

    setTimeout(() => {
      closeTherapistNotifications();
    }, 1000);
  } catch (error) {
    console.error("Error marking therapist notifications as read:", error);
  }
}

// Listen for new messages via socket
function initializeNotificationSocket() {
  if (typeof io !== "undefined" && window.socket) {
    // Listen for new messages
    window.socket.on("newMessage", (data) => {
      console.log("New message received, refreshing notifications");
      const isTherapist =
        window.location.pathname.includes("therapistDashboard");

      if (isTherapist) {
        updateTherapistNotificationBadge();
      } else {
        updateNotificationBadge();
      }
    });

    // Listen for reminder alerts
    window.socket.on("reminderAlert", (data) => {
      console.log("Reminder alert received:", data);
      updateNotificationBadge();

      // Show browser notification if permission granted
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(data.title, {
          body: data.message,
          icon: "/assets/icon.png",
          badge: "/assets/badge.png",
        });
      }
    });
  }
}

// Request browser notification permission
async function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    try {
      const permission = await Notification.requestPermission();
      console.log("Notification permission:", permission);
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
  }
}

// Initialize notification badge on page load
document.addEventListener("DOMContentLoaded", function () {
  // Request notification permission
  requestNotificationPermission();

  // Initialize based on user type
  const isTherapist = window.location.pathname.includes("therapistDashboard");

  setTimeout(() => {
    if (isTherapist) {
      updateTherapistNotificationBadge();
    } else {
      updateNotificationBadge();
    }

    // Initialize socket listeners
    initializeNotificationSocket();

    // Start auto-refresh
    startNotificationAutoRefresh();
  }, 1000);

  // Initialize sidebar profile
  if (typeof initializeSidebarProfile === "function") {
    setTimeout(initializeSidebarProfile, 1000);
  }

  // Initialize chat functionality for user dashboard
  if (window.location.pathname.includes("userDashboard")) {
    if (typeof initializeChat === "function") {
      initializeChat();
    }
  }

  // Initialize therapist chat functionality for therapist dashboard
  if (window.location.pathname.includes("therapistDashboard")) {
    if (typeof initializeTherapistChat === "function") {
      initializeTherapistChat();
    }
  }
});

// Export functions for use in other modules
if (typeof window !== "undefined") {
  window.fetchUserNotifications = fetchUserNotifications;
  window.fetchTherapistNotifications = fetchTherapistNotifications;
  window.updateNotificationBadge = updateNotificationBadge;
  window.updateTherapistNotificationBadge = updateTherapistNotificationBadge;
  window.showNotifications = showNotifications;
  window.showTherapistNotifications = showTherapistNotifications;
  window.closeNotifications = closeNotifications;
  window.closeTherapistNotifications = closeTherapistNotifications;
  window.handleNotificationClick = handleNotificationClick;
  window.markAllAsRead = markAllAsRead;
  window.markAllTherapistMessagesAsRead = markAllTherapistMessagesAsRead;
}
