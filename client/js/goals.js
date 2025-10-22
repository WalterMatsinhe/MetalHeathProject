// ============================================
// GOALS AND REMINDERS FUNCTIONALITY
// ============================================

// Initialize goals and reminders on dashboard load
function initializeGoalsAndReminders() {
  console.log("Initializing goals and reminders...");
  loadDailyGoals();
  loadUpcomingReminders();
  initializeGoalEventListeners();
  initializeReminderEventListeners();
}

// Load daily goals
async function loadDailyGoals() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const response = await fetch(
      "http://localhost:5000/api/goals?category=daily&status=active",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (response.ok) {
      displayDailyGoals(data.goals);
    }
  } catch (error) {
    console.error("Error loading daily goals:", error);
  }
}

// Display daily goals in the UI
function displayDailyGoals(goals) {
  const goalsList = document.querySelector(".goals-list");
  if (!goalsList) return;

  if (!goals || goals.length === 0) {
    goalsList.innerHTML = `
      <li class="empty-message">
        <span>No daily goals yet. Click below to add one!</span>
      </li>
      <li>
        <button class="btn-add-goal" onclick="showAddGoalModal('daily')">
          <i class="fa fa-plus"></i> Add Daily Goal
        </button>
      </li>
    `;
    return;
  }

  goalsList.innerHTML = goals
    .map(
      (goal) => `
    <li>
      <label class="goal-item">
        <input 
          type="checkbox" 
          data-goal-id="${goal._id}"
          ${goal.status === "completed" ? "checked" : ""}
          onchange="toggleGoalComplete('${goal._id}', this.checked)"
        /> 
        ${goal.title}
        ${
          goal.streak > 0
            ? `<span class="goal-streak">🔥 ${goal.streak}</span>`
            : ""
        }
      </label>
    </li>
  `
    )
    .join("");

  // Add "Add Goal" button at the end
  goalsList.innerHTML += `
    <li>
      <button class="btn-add-goal" onclick="showAddGoalModal('daily')">
        <i class="fa fa-plus"></i> Add Daily Goal
      </button>
    </li>
  `;
}

// Load upcoming reminders
async function loadUpcomingReminders() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const response = await fetch(
      "http://localhost:5000/api/reminders/upcoming?days=7",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (response.ok) {
      displayUpcomingReminders(data.reminders);
    }
  } catch (error) {
    console.error("Error loading reminders:", error);
  }
}

// Display upcoming reminders in the UI
function displayUpcomingReminders(reminders) {
  const remindersList = document.querySelector(".reminders-list");
  if (!remindersList) return;

  if (!reminders || reminders.length === 0) {
    remindersList.innerHTML = `
      <li class="empty-message">No upcoming reminders</li>
      <li>
        <button class="btn-add-reminder" onclick="showAddReminderModal()">
          <i class="fa fa-plus"></i> Add Reminder
        </button>
      </li>
    `;
    return;
  }

  remindersList.innerHTML = reminders
    .map((reminder) => {
      const reminderDate = new Date(reminder.reminderTime);
      const timeString = formatReminderTime(reminderDate);
      const icon = getReminderIcon(reminder.reminderType);

      return `
      <li class="reminder-item" data-reminder-id="${reminder._id}">
        <span class="reminder-icon-inline">${icon}</span>
        <span class="reminder-text">${reminder.title} - ${timeString}</span>
        <button class="btn-complete-reminder" onclick="completeReminder('${reminder._id}')" title="Mark as complete">
          ✓
        </button>
      </li>
    `;
    })
    .join("");

  // Add "Add Reminder" button at the end
  remindersList.innerHTML += `
    <li>
      <button class="btn-add-reminder" onclick="showAddReminderModal()">
        <i class="fa fa-plus"></i> Add Reminder
      </button>
    </li>
  `;
}

// Toggle goal completion
async function toggleGoalComplete(goalId, isCompleted) {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    if (isCompleted) {
      // Mark as completed
      const response = await fetch(
        `http://localhost:5000/api/goals/${goalId}/complete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        showNotification(data.message || "Goal completed! 🎉", "success");
        loadDailyGoals(); // Reload to show updated streak
        loadDashboardStats(); // Update stats
      }
    } else {
      // Unmark completion
      const response = await fetch(
        `http://localhost:5000/api/goals/${goalId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "active" }),
        }
      );

      if (response.ok) {
        showNotification("Goal marked as active", "info");
        loadDailyGoals();
      }
    }
  } catch (error) {
    console.error("Error toggling goal:", error);
    showNotification("Error updating goal", "error");
  }
}

// Complete a reminder
async function completeReminder(reminderId) {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const response = await fetch(
      `http://localhost:5000/api/reminders/${reminderId}/complete`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (response.ok) {
      showNotification(data.message || "Reminder completed! ✓", "success");
      loadUpcomingReminders();
    }
  } catch (error) {
    console.error("Error completing reminder:", error);
    showNotification("Error completing reminder", "error");
  }
}

// Show add goal modal
function showAddGoalModal(category = "daily") {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-content goal-modal">
      <div class="modal-header">
        <h3>Add New Goal</h3>
        <button class="btn-close-modal" onclick="closeModal()">&times;</button>
      </div>
      <form id="addGoalForm" class="goal-form">
        <div class="form-group">
          <label for="goalTitle">Goal Title *</label>
          <input type="text" id="goalTitle" required placeholder="e.g., Complete mood check-in">
        </div>
        
        <div class="form-group">
          <label for="goalDescription">Description</label>
          <textarea id="goalDescription" rows="3" placeholder="Optional details about your goal"></textarea>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="goalCategory">Category</label>
            <select id="goalCategory">
              <option value="daily" ${
                category === "daily" ? "selected" : ""
              }>Daily</option>
              <option value="weekly" ${
                category === "weekly" ? "selected" : ""
              }>Weekly</option>
              <option value="monthly" ${
                category === "monthly" ? "selected" : ""
              }>Monthly</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="goalPriority">Priority</label>
            <select id="goalPriority">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label for="goalDueDate">Due Date (Optional)</label>
          <input type="date" id="goalDueDate">
        </div>
        
        <div class="form-group">
          <label for="goalRecurring">Recurring</label>
          <select id="goalRecurring">
            <option value="none">No</option>
            <option value="daily" ${
              category === "daily" ? "selected" : ""
            }>Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        
        <div class="modal-actions">
          <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn-primary">Add Goal</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Handle form submission
  document
    .getElementById("addGoalForm")
    .addEventListener("submit", handleAddGoal);
}

// Show add reminder modal
function showAddReminderModal() {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-content reminder-modal">
      <div class="modal-header">
        <h3>Add New Reminder</h3>
        <button class="btn-close-modal" onclick="closeModal()">&times;</button>
      </div>
      <form id="addReminderForm" class="reminder-form">
        <div class="form-group">
          <label for="reminderTitle">Reminder Title *</label>
          <input type="text" id="reminderTitle" required placeholder="e.g., Evening reflection">
        </div>
        
        <div class="form-group">
          <label for="reminderDescription">Description</label>
          <textarea id="reminderDescription" rows="2" placeholder="Optional details"></textarea>
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="reminderDate">Date *</label>
            <input type="date" id="reminderDate" required>
          </div>
          
          <div class="form-group">
            <label for="reminderTime">Time *</label>
            <input type="time" id="reminderTime" required>
          </div>
        </div>
        
        <div class="form-group">
          <label for="reminderType">Type</label>
          <select id="reminderType">
            <option value="custom">Custom</option>
            <option value="mood_check">Mood Check-in</option>
            <option value="therapy_session">Therapy Session</option>
            <option value="medication">Medication</option>
            <option value="exercise">Exercise</option>
            <option value="meditation">Meditation</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="reminderRecurring">Recurring</label>
          <select id="reminderRecurring">
            <option value="none">No</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        
        <div class="modal-actions">
          <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn-primary">Add Reminder</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Set default date and time
  const now = new Date();
  document.getElementById("reminderDate").valueAsDate = now;
  document.getElementById("reminderTime").value = now
    .toTimeString()
    .slice(0, 5);

  // Handle form submission
  document
    .getElementById("addReminderForm")
    .addEventListener("submit", handleAddReminder);
}

// Handle add goal form submission
async function handleAddGoal(e) {
  e.preventDefault();

  const goalData = {
    title: document.getElementById("goalTitle").value.trim(),
    description: document.getElementById("goalDescription").value.trim(),
    category: document.getElementById("goalCategory").value,
    priority: document.getElementById("goalPriority").value,
    dueDate: document.getElementById("goalDueDate").value || null,
    recurringType: document.getElementById("goalRecurring").value,
  };

  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch("http://localhost:5000/api/goals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(goalData),
    });

    const data = await response.json();

    if (response.ok) {
      showNotification(
        data.message || "Goal added successfully! 🎯",
        "success"
      );
      closeModal();
      loadDailyGoals();
      loadDashboardStats();
    } else {
      showNotification(data.message || "Failed to add goal", "error");
    }
  } catch (error) {
    console.error("Error adding goal:", error);
    showNotification("Error adding goal", "error");
  }
}

// Handle add reminder form submission
async function handleAddReminder(e) {
  e.preventDefault();

  const date = document.getElementById("reminderDate").value;
  const time = document.getElementById("reminderTime").value;
  const reminderTime = new Date(`${date}T${time}`);

  const reminderData = {
    title: document.getElementById("reminderTitle").value.trim(),
    description: document.getElementById("reminderDescription").value.trim(),
    reminderTime: reminderTime.toISOString(),
    reminderType: document.getElementById("reminderType").value,
    recurring: document.getElementById("reminderRecurring").value,
  };

  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch("http://localhost:5000/api/reminders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(reminderData),
    });

    const data = await response.json();

    if (response.ok) {
      showNotification(
        data.message || "Reminder added successfully! ⏰",
        "success"
      );
      closeModal();
      loadUpcomingReminders();
    } else {
      showNotification(data.message || "Failed to add reminder", "error");
    }
  } catch (error) {
    console.error("Error adding reminder:", error);
    showNotification("Error adding reminder", "error");
  }
}

// Close modal
function closeModal() {
  const modal = document.querySelector(".modal-overlay");
  if (modal) {
    modal.remove();
  }
}

// Format reminder time for display
function formatReminderTime(date) {
  const now = new Date();
  const diffMs = date - now;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffDays === 0) {
    if (diffHours === 0) {
      if (diffMins <= 0) {
        return "Now";
      }
      return `In ${diffMins} min${diffMins !== 1 ? "s" : ""}`;
    }
    return `Today at ${date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  } else if (diffDays === 1) {
    return `Tomorrow at ${date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  } else if (diffDays < 7) {
    return `${date.toLocaleDateString("en-US", {
      weekday: "short",
    })} at ${date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  } else {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
}

// Get icon for reminder type
function getReminderIcon(type) {
  const icons = {
    mood_check: "😊",
    therapy_session: "🧠",
    medication: "💊",
    exercise: "🏃",
    meditation: "🧘",
    custom: "⏰",
  };
  return icons[type] || "⏰";
}

// Initialize event listeners
function initializeGoalEventListeners() {
  // Event delegation for dynamically added goal checkboxes
  document.addEventListener("change", function (e) {
    if (e.target.matches('.goal-item input[type="checkbox"]')) {
      const goalId = e.target.dataset.goalId;
      const isCompleted = e.target.checked;
      if (goalId) {
        toggleGoalComplete(goalId, isCompleted);
      }
    }
  });
}

function initializeReminderEventListeners() {
  // Add any reminder-specific event listeners here
}

// Close modal when clicking outside
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("modal-overlay")) {
    closeModal();
  }
});

// Initialize on dashboard load
if (window.location.pathname.includes("userDashboard")) {
  document.addEventListener("DOMContentLoaded", function () {
    initializeGoalsAndReminders();
  });
}
