// ============================================
// ADMIN DASHBOARD FUNCTIONALITY
// ============================================

let currentApplicationId = null;

document.addEventListener("DOMContentLoaded", function () {
  // Check if user is admin
  checkAdminAccess();

  // Load initial data
  loadStatistics();
  loadPendingApplications();
});

// Check if user has admin access
function checkAdminAccess() {
  const userData = JSON.parse(localStorage.getItem("userData") || "{}");

  if (userData.role !== "admin") {
    showToast("Access denied. Admin only.", "error");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
    return false;
  }

  // Update sidebar with admin info
  const sidebarUserName = document.getElementById("sidebarUserName");
  if (sidebarUserName && userData.firstName) {
    sidebarUserName.textContent = `${userData.firstName} ${userData.lastName}`;
  }

  return true;
}

// Load dashboard statistics
async function loadStatistics() {
  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch("/api/admin/statistics", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load statistics");
    }

    const stats = await response.json();

    // Update stat cards
    document.getElementById("totalUsers").textContent = stats.totalUsers || 0;
    document.getElementById("totalTherapists").textContent =
      stats.totalTherapists || 0;
    document.getElementById("pendingApplications").textContent =
      stats.pendingApplications || 0;
    document.getElementById("approvedTherapists").textContent =
      stats.approvedTherapists || 0;

    // Update sidebar badge
    const pendingBadge = document.getElementById("pendingBadge");
    if (pendingBadge) {
      pendingBadge.textContent = stats.pendingApplications || 0;
      if (stats.pendingApplications > 0) {
        pendingBadge.style.display = "inline-block";
      }
    }
  } catch (error) {
    console.error("Error loading statistics:", error);
    showToast("Failed to load statistics", "error");
  }
}

// Refresh statistics
function refreshStatistics() {
  loadStatistics();
  showToast("Statistics refreshed", "success");
}

// Load pending applications
async function loadPendingApplications() {
  const container = document.getElementById("pendingApplicationsContainer");

  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch("/api/admin/applications/pending", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load pending applications");
    }

    const applications = await response.json();

    if (applications.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fa-solid fa-inbox"></i>
          </div>
          <h3>No Pending Applications</h3>
          <p>There are currently no therapist applications waiting for review.</p>
        </div>
      `;
      return;
    }

    // Display applications
    container.innerHTML = applications
      .map(
        (app) => `
      <div class="application-card">
        <div class="application-header">
          <div class="applicant-info">
            <div class="applicant-avatar">
              <i class="fa-solid fa-user-doctor"></i>
            </div>
            <div class="applicant-details">
              <h4 class="applicant-name">${app.firstName} ${app.lastName}</h4>
              <p class="applicant-email">${app.email}</p>
            </div>
          </div>
          <span class="status-badge status-pending">
            <i class="fa-solid fa-clock"></i> Pending
          </span>
        </div>
        <div class="application-body">
          <div class="application-info-grid">
            <div class="info-item">
              <span class="info-label">License Number:</span>
              <span class="info-value">${app.licenseNumber || "N/A"}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Specialization:</span>
              <span class="info-value">${formatSpecialization(
                app.specialization
              )}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Experience:</span>
              <span class="info-value">${app.yearsExperience || 0} years</span>
            </div>
            <div class="info-item">
              <span class="info-label">Education:</span>
              <span class="info-value">${app.education || "N/A"}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Applied:</span>
              <span class="info-value">${formatDate(
                app.registrationDate
              )}</span>
            </div>
          </div>
          ${
            app.certifications
              ? `
            <div class="application-section">
              <h5>Certifications:</h5>
              <p class="certifications-text">${app.certifications}</p>
            </div>
          `
              : ""
          }
          ${
            app.bio
              ? `
            <div class="application-section">
              <h5>Bio:</h5>
              <p class="bio-text">${app.bio}</p>
            </div>
          `
              : ""
          }
        </div>
        <div class="application-actions">
          <button 
            class="btn btn-secondary"
            onclick="viewApplicationDetails('${app._id}')"
          >
            <i class="fa-solid fa-eye"></i> View Details
          </button>
          <button 
            class="btn btn-success"
            onclick="approveApplication('${app._id}', '${app.firstName} ${
          app.lastName
        }')"
          >
            <i class="fa-solid fa-check"></i> Approve
          </button>
          <button 
            class="btn btn-danger"
            onclick="openRejectionModal('${app._id}', '${app.firstName} ${
          app.lastName
        }')"
          >
            <i class="fa-solid fa-times"></i> Reject
          </button>
        </div>
      </div>
    `
      )
      .join("");
  } catch (error) {
    console.error("Error loading pending applications:", error);
    container.innerHTML = `
      <div class="error-message">
        <i class="fa-solid fa-exclamation-triangle"></i>
        <p>Failed to load applications. Please try again.</p>
        <button class="btn btn-primary" onclick="loadPendingApplications()">
          Retry
        </button>
      </div>
    `;
  }
}

// Load approved therapists
async function loadApprovedTherapists() {
  const container = document.getElementById("approvedTherapistsContainer");

  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch("/api/admin/applications/approved", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load approved therapists");
    }

    const therapists = await response.json();

    if (therapists.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fa-solid fa-user-doctor"></i>
          </div>
          <h3>No Approved Therapists</h3>
          <p>There are currently no approved therapists on the platform.</p>
        </div>
      `;
      return;
    }

    // Display therapists
    container.innerHTML = therapists
      .map(
        (therapist) => `
      <div class="application-card approved">
        <div class="application-header">
          <div class="applicant-info">
            <div class="applicant-avatar">
              ${
                therapist.profilePicture
                  ? `<img src="${therapist.profilePicture}" alt="${therapist.firstName}">`
                  : `<i class="fa-solid fa-user-doctor"></i>`
              }
            </div>
            <div class="applicant-details">
              <h4 class="applicant-name">${therapist.firstName} ${
          therapist.lastName
        }</h4>
              <p class="applicant-email">${therapist.email}</p>
            </div>
          </div>
          <span class="status-badge status-approved">
            <i class="fa-solid fa-check-circle"></i> Approved
          </span>
        </div>
        <div class="application-body">
          <div class="application-info-grid">
            <div class="info-item">
              <span class="info-label">License:</span>
              <span class="info-value">${
                therapist.licenseNumber || "N/A"
              }</span>
            </div>
            <div class="info-item">
              <span class="info-label">Specialization:</span>
              <span class="info-value">${formatSpecialization(
                therapist.specialization
              )}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Experience:</span>
              <span class="info-value">${
                therapist.yearsExperience || 0
              } years</span>
            </div>
            <div class="info-item">
              <span class="info-label">Patients Helped:</span>
              <span class="info-value">${
                therapist.stats?.patientsHelped || 0
              }</span>
            </div>
            <div class="info-item">
              <span class="info-label">Approved:</span>
              <span class="info-value">${formatDate(
                therapist.registrationDate
              )}</span>
            </div>
          </div>
        </div>
        <div class="application-actions">
          <button 
            class="btn btn-secondary"
            onclick="viewApplicationDetails('${therapist._id}')"
          >
            <i class="fa-solid fa-eye"></i> View Full Profile
          </button>
        </div>
      </div>
    `
      )
      .join("");
  } catch (error) {
    console.error("Error loading approved therapists:", error);
    container.innerHTML = `
      <div class="error-message">
        <i class="fa-solid fa-exclamation-triangle"></i>
        <p>Failed to load approved therapists. Please try again.</p>
        <button class="btn btn-primary" onclick="loadApprovedTherapists()">
          Retry
        </button>
      </div>
    `;
  }
}

// Load rejected applications
async function loadRejectedApplications() {
  const container = document.getElementById("rejectedApplicationsContainer");

  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch("/api/admin/applications/rejected", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load rejected applications");
    }

    const applications = await response.json();

    if (applications.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fa-solid fa-times-circle"></i>
          </div>
          <h3>No Rejected Applications</h3>
          <p>There are no rejected therapist applications.</p>
        </div>
      `;
      return;
    }

    // Display rejected applications
    container.innerHTML = applications
      .map(
        (app) => `
      <div class="application-card rejected">
        <div class="application-header">
          <div class="applicant-info">
            <div class="applicant-avatar">
              <i class="fa-solid fa-user-doctor"></i>
            </div>
            <div class="applicant-details">
              <h4 class="applicant-name">${app.firstName} ${app.lastName}</h4>
              <p class="applicant-email">${app.email}</p>
            </div>
          </div>
          <span class="status-badge status-rejected">
            <i class="fa-solid fa-times-circle"></i> Rejected
          </span>
        </div>
        <div class="application-body">
          <div class="application-info-grid">
            <div class="info-item">
              <span class="info-label">License:</span>
              <span class="info-value">${app.licenseNumber || "N/A"}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Specialization:</span>
              <span class="info-value">${formatSpecialization(
                app.specialization
              )}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Applied:</span>
              <span class="info-value">${formatDate(
                app.registrationDate
              )}</span>
            </div>
          </div>
          <div class="rejection-reason">
            <h5><i class="fa-solid fa-info-circle"></i> Rejection Reason:</h5>
            <p>${app.rejectionReason || "No reason provided"}</p>
          </div>
        </div>
        <div class="application-actions">
          <button 
            class="btn btn-secondary"
            onclick="viewApplicationDetails('${app._id}')"
          >
            <i class="fa-solid fa-eye"></i> View Details
          </button>
        </div>
      </div>
    `
      )
      .join("");
  } catch (error) {
    console.error("Error loading rejected applications:", error);
    container.innerHTML = `
      <div class="error-message">
        <i class="fa-solid fa-exclamation-triangle"></i>
        <p>Failed to load rejected applications. Please try again.</p>
        <button class="btn btn-primary" onclick="loadRejectedApplications()">
          Retry
        </button>
      </div>
    `;
  }
}

// View application details in modal
async function viewApplicationDetails(applicationId) {
  const modal = document.getElementById("applicationModal");
  const modalBody = document.getElementById("applicationModalBody");

  modal.style.display = "flex";
  modalBody.innerHTML = `
    <div class="loading-message">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <p>Loading details...</p>
    </div>
  `;

  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(`/api/admin/applications/${applicationId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load application details");
    }

    const app = await response.json();

    modalBody.innerHTML = `
      <div class="application-details">
        <div class="detail-section">
          <h4>Personal Information</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <strong>Full Name:</strong>
              <span>${app.firstName} ${app.lastName}</span>
            </div>
            <div class="detail-item">
              <strong>Email:</strong>
              <span>${app.email}</span>
            </div>
            <div class="detail-item">
              <strong>Phone:</strong>
              <span>${app.phone || "Not provided"}</span>
            </div>
            <div class="detail-item">
              <strong>Location:</strong>
              <span>${app.location || "Not provided"}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4>Professional Information</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <strong>License Number:</strong>
              <span>${app.licenseNumber || "Not provided"}</span>
            </div>
            <div class="detail-item">
              <strong>Specialization:</strong>
              <span>${formatSpecialization(app.specialization)}</span>
            </div>
            <div class="detail-item">
              <strong>Years of Experience:</strong>
              <span>${app.yearsExperience || 0} years</span>
            </div>
            <div class="detail-item">
              <strong>Institution:</strong>
              <span>${app.institution || "Not provided"}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h4>Education</h4>
          <p>${app.education || "Not provided"}</p>
        </div>

        ${
          app.certifications
            ? `
          <div class="detail-section">
            <h4>Certifications</h4>
            <p>${app.certifications}</p>
          </div>
        `
            : ""
        }

        ${
          app.bio
            ? `
          <div class="detail-section">
            <h4>Biography</h4>
            <p>${app.bio}</p>
          </div>
        `
            : ""
        }

        <div class="detail-section">
          <h4>Application Status</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <strong>Status:</strong>
              <span class="status-badge status-${app.registrationStatus}">
                ${app.registrationStatus.toUpperCase()}
              </span>
            </div>
            <div class="detail-item">
              <strong>Application Date:</strong>
              <span>${formatDate(app.registrationDate)}</span>
            </div>
            ${
              app.rejectionReason
                ? `
              <div class="detail-item full-width">
                <strong>Rejection Reason:</strong>
                <span>${app.rejectionReason}</span>
              </div>
            `
                : ""
            }
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Error loading application details:", error);
    modalBody.innerHTML = `
      <div class="error-message">
        <i class="fa-solid fa-exclamation-triangle"></i>
        <p>Failed to load application details.</p>
      </div>
    `;
  }
}

// Close application modal
function closeApplicationModal() {
  document.getElementById("applicationModal").style.display = "none";
}

// Approve application
async function approveApplication(applicationId, applicantName) {
  if (
    !confirm(`Are you sure you want to approve ${applicantName}'s application?`)
  ) {
    return;
  }

  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(
      `/api/admin/applications/${applicationId}/approve`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to approve application");
    }

    showToast(
      `${applicantName}'s application approved successfully!`,
      "success"
    );

    // Reload data
    loadStatistics();
    loadPendingApplications();
  } catch (error) {
    console.error("Error approving application:", error);
    showToast(error.message || "Failed to approve application", "error");
  }
}

// Open rejection modal
function openRejectionModal(applicationId, applicantName) {
  currentApplicationId = applicationId;

  const modal = document.getElementById("rejectionModal");
  const textarea = document.getElementById("rejectionReason");

  textarea.value = "";
  modal.style.display = "flex";
}

// Close rejection modal
function closeRejectionModal() {
  document.getElementById("rejectionModal").style.display = "none";
  currentApplicationId = null;
}

// Confirm rejection
async function confirmRejection() {
  const reason = document.getElementById("rejectionReason").value.trim();

  if (!reason) {
    showToast("Please provide a rejection reason", "error");
    return;
  }

  const confirmBtn = document.getElementById("confirmRejectBtn");
  confirmBtn.disabled = true;
  confirmBtn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> Rejecting...';

  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(
      `/api/admin/applications/${currentApplicationId}/reject`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to reject application");
    }

    showToast("Application rejected successfully", "success");

    closeRejectionModal();

    // Reload data
    loadStatistics();
    loadPendingApplications();
  } catch (error) {
    console.error("Error rejecting application:", error);
    showToast(error.message || "Failed to reject application", "error");
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.innerHTML =
      '<i class="fa-solid fa-times"></i> Confirm Rejection';
  }
}

// Format specialization for display
function formatSpecialization(spec) {
  if (!spec) return "Not specified";

  const specializations = {
    "clinical-psychology": "Clinical Psychology",
    "counseling-psychology": "Counseling Psychology",
    psychiatry: "Psychiatry",
    "social-work": "Social Work",
    therapy: "Therapy",
    other: "Other",
  };

  return specializations[spec] || spec;
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  const options = { year: "numeric", month: "short", day: "numeric" };
  return date.toLocaleDateString("en-US", options);
}

// Override showSection to load data when switching sections
const originalShowSection = window.showSection;
window.showSection = function (sectionId) {
  if (originalShowSection) {
    originalShowSection(sectionId);
  }

  // Load data based on section
  if (sectionId === "pending") {
    loadPendingApplications();
  } else if (sectionId === "approved") {
    loadApprovedTherapists();
  } else if (sectionId === "rejected") {
    loadRejectedApplications();
  }
};

// Close modals when clicking outside
window.onclick = function (event) {
  const applicationModal = document.getElementById("applicationModal");
  const rejectionModal = document.getElementById("rejectionModal");

  if (event.target === applicationModal) {
    closeApplicationModal();
  }

  if (event.target === rejectionModal) {
    closeRejectionModal();
  }
};
