// ============================================
// NOTIFICATION SYSTEM
// ============================================

// Function to update notification names with real user data
async function updateNotificationNames() {
  try {
    // Get real user data from conversations
    const response = await fetch("/api/chat/conversations", {
      headers: getAuthHeaders(),
    });

    if (response.ok) {
      const conversations = await response.json();

      if (conversations.length > 0) {
        // Update the session request with real user name
        const sessionRequestElement = document.getElementById(
          "session-request-user"
        );
        if (sessionRequestElement && conversations[0]) {
          const userName = conversations[0].name || "User";
          sessionRequestElement.textContent = `${userName} • 30 minutes ago`;
        }
      }
    }
  } catch (error) {
    console.error("Error updating notification names:", error);
  }
}

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
      if (typeof showSection === "function") {
        showSection("mood");
      }
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
      if (typeof showSection === "function") {
        showSection("resources");
      }
      break;
    case "support":
      // Navigate to support section
      if (typeof showSection === "function") {
        showSection("support");
      }
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
            <span style="font-size: 11px; color: #999;" id="session-request-user">User • 30 minutes ago</span>
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

// Initialize notification badge on page load
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(() => {
    updateNotificationBadge();
    initializeSidebarProfile();
  }, 1000);

  // Initialize therapist notifications if on therapist dashboard
  if (window.location.pathname.includes("therapistDashboard")) {
    setTimeout(initTherapistNotifications, 1000);
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

    // Update notification names with real data
    setTimeout(() => {
      updateNotificationNames();
    }, 2000);
  }
});
