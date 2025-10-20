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
  ctx.strokeStyle = "#00bfff";
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
  ctx.fillStyle = "#00bfff";
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
    { name: "Meditation", hours: 5, color: "#00bfff" },
    { name: "Exercise", hours: 8, color: "#0099cc" },
    { name: "Journaling", hours: 3, color: "#0066cc" },
    { name: "Therapy", hours: 4, color: "#1976d2" },
    { name: "Reading", hours: 6, color: "#2c3e50" },
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
    { name: "Completed", value: 7, color: "#00bfff" },
    { name: "In Progress", value: 3, color: "#0099cc" },
    { name: "Pending", value: 2, color: "#0066cc" },
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
  if (score >= 80) return "#00bfff"; // Excellent - Primary Blue
  if (score >= 60) return "#0099cc"; // Good - Secondary Blue
  if (score >= 40) return "#0066cc"; // Fair - Darker Blue
  return "#2c3e50"; // Needs Attention - Dark Gray
}

// Update charts when window resizes
window.addEventListener("resize", function () {
  setTimeout(() => {
    if (window.location.pathname.includes("userDashboard")) {
      initializeVisualCharts();
    }
  }, 100);
});
