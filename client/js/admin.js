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

  // Initialize admin profile picture upload
  initializeAdminProfilePictureUpload();

  // Load admin profile from database
  setTimeout(() => {
    loadAdminProfile();
  }, 100);
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

  // Sidebar image will be updated when loadAdminProfile() fetches fresh data from database
  return true;
}

// Load dashboard statistics
async function loadStatistics() {
  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch("http://localhost:5000/api/admin/statistics", {
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
    const response = await fetch(
      "http://localhost:5000/api/admin/applications/pending",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

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

    // Display applications in table format
    container.innerHTML = `
      <div class="table-container">
        <table class="applications-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Email</th>
              <th>License</th>
              <th>Specialization</th>
              <th>Experience</th>
              <th>Applied Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${applications
              .map(
                (app) => `
              <tr>
                <td>
                  <div class="table-user-info">
                    <div class="table-avatar">
                      <i class="fa-solid fa-user-doctor"></i>
                    </div>
                    <span class="table-user-name">${app.firstName} ${
                  app.lastName
                }</span>
                  </div>
                </td>
                <td>${app.email}</td>
                <td>${app.licenseNumber || "N/A"}</td>
                <td>${formatSpecialization(app.specialization)}</td>
                <td>${app.yearsExperience || 0} years</td>
                <td>${formatDate(app.registrationDate)}</td>
                <td>
                  <span class="status-badge status-pending">
                    <i class="fa-solid fa-clock"></i> Pending
                  </span>
                </td>
                <td>
                  <div class="table-actions">
                    <button 
                      class="btn-icon btn-icon-view"
                      onclick="viewApplicationDetails('${app._id}')"
                      title="View Details"
                    >
                      <i class="fa-solid fa-eye"></i>
                    </button>
                    <button 
                      class="btn-icon btn-icon-approve"
                      onclick="approveApplication('${app._id}', '${
                  app.firstName
                } ${app.lastName}')"
                      title="Approve"
                    >
                      <i class="fa-solid fa-check"></i>
                    </button>
                    <button 
                      class="btn-icon btn-icon-reject"
                      onclick="openRejectionModal('${app._id}', '${
                  app.firstName
                } ${app.lastName}')"
                      title="Reject"
                    >
                      <i class="fa-solid fa-times"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
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
    const response = await fetch(
      "http://localhost:5000/api/admin/applications/approved",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

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

    // Display therapists in table format
    container.innerHTML = `
      <div class="table-container">
        <table class="applications-table">
          <thead>
            <tr>
              <th>Therapist</th>
              <th>Email</th>
              <th>License</th>
              <th>Specialization</th>
              <th>Experience</th>
              <th>Patients Helped</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${therapists
              .map(
                (therapist) => `
              <tr>
                <td>
                  <div class="table-user-info">
                    <div class="table-avatar">
                      ${
                        therapist.profilePicture
                          ? `<img src="${therapist.profilePicture}" alt="${therapist.firstName}">`
                          : `<i class="fa-solid fa-user-doctor"></i>`
                      }
                    </div>
                    <span class="table-user-name">${therapist.firstName} ${
                  therapist.lastName
                }</span>
                  </div>
                </td>
                <td>${therapist.email}</td>
                <td>${therapist.licenseNumber || "N/A"}</td>
                <td>${formatSpecialization(therapist.specialization)}</td>
                <td>${therapist.yearsExperience || 0} years</td>
                <td>${therapist.stats?.patientsHelped || 0}</td>
                <td>
                  <span class="status-badge status-approved">
                    <i class="fa-solid fa-check-circle"></i> Active
                  </span>
                </td>
                <td>
                  <div class="table-actions">
                    <button 
                      class="btn-icon btn-icon-view"
                      onclick="viewApplicationDetails('${therapist._id}')"
                      title="View Profile"
                    >
                      <i class="fa-solid fa-eye"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
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
    const response = await fetch(
      "http://localhost:5000/api/admin/applications/rejected",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

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

    // Display rejected applications in table format
    container.innerHTML = `
      <div class="table-container">
        <table class="applications-table">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Email</th>
              <th>License</th>
              <th>Specialization</th>
              <th>Applied Date</th>
              <th>Rejection Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${applications
              .map(
                (app) => `
              <tr>
                <td>
                  <div class="table-user-info">
                    <div class="table-avatar">
                      <i class="fa-solid fa-user-doctor"></i>
                    </div>
                    <span class="table-user-name">${app.firstName} ${
                  app.lastName
                }</span>
                  </div>
                </td>
                <td>${app.email}</td>
                <td>${app.licenseNumber || "N/A"}</td>
                <td>${formatSpecialization(app.specialization)}</td>
                <td>${formatDate(app.registrationDate)}</td>
                <td>
                  <div class="rejection-reason-cell">
                    ${
                      app.rejectionReason
                        ? app.rejectionReason.length > 50
                          ? app.rejectionReason.substring(0, 50) + "..."
                          : app.rejectionReason
                        : "No reason provided"
                    }
                  </div>
                </td>
                <td>
                  <span class="status-badge status-rejected">
                    <i class="fa-solid fa-times-circle"></i> Rejected
                  </span>
                </td>
                <td>
                  <div class="table-actions">
                    <button 
                      class="btn-icon btn-icon-view"
                      onclick="viewApplicationDetails('${app._id}')"
                      title="View Details"
                    >
                      <i class="fa-solid fa-eye"></i>
                    </button>
                  </div>
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
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
    const response = await fetch(
      `http://localhost:5000/api/admin/applications/${applicationId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

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
      `http://localhost:5000/api/admin/applications/${applicationId}/approve`,
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

  console.log("Confirming rejection for application:", currentApplicationId);
  console.log("Rejection reason:", reason);

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
    console.log("Sending rejection request...");

    const response = await fetch(
      `http://localhost:5000/api/admin/applications/${currentApplicationId}/reject`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      }
    );

    console.log("Rejection response status:", response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error("Rejection error:", error);
      throw new Error(error.message || "Failed to reject application");
    }

    const result = await response.json();
    console.log("Rejection successful:", result);

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

// Load all users
async function loadAllUsers() {
  const container = document.querySelector("#users .users-container");

  if (!container) {
    console.error("Users container not found");
    return;
  }

  container.innerHTML = `
    <div class="loading-message">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <p>Loading users...</p>
    </div>
  `;

  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch("http://localhost:5000/api/admin/users/all", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to load users");
    }

    const users = await response.json();

    if (users.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i class="fa-solid fa-users"></i>
          </div>
          <h3>No Users</h3>
          <p>There are currently no registered users on the platform.</p>
        </div>
      `;
      return;
    }

    // Display users in table format
    container.innerHTML = `
      <div class="table-container">
        <table class="applications-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Registered Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users
              .map(
                (user) => `
              <tr>
                <td>
                  <div class="table-user-info">
                    <div class="table-avatar">
                      ${getRoleIcon(user.role)}
                    </div>
                    <span class="table-user-name">${user.firstName} ${
                  user.lastName
                }</span>
                  </div>
                </td>
                <td>${user.email}</td>
                <td>
                  <span class="role-badge role-${user.role}">
                    ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </td>
                <td>
                  ${
                    user.role === "therapist"
                      ? `<span class="status-badge status-${
                          user.registrationStatus
                        }">
                      ${getStatusIcon(user.registrationStatus)} ${
                          user.registrationStatus.charAt(0).toUpperCase() +
                          user.registrationStatus.slice(1)
                        }
                    </span>`
                      : `<span class="status-badge status-approved">
                      <i class="fa-solid fa-check-circle"></i> Active
                    </span>`
                  }
                </td>
                <td>${formatDate(user.createdAt || user.registrationDate)}</td>
                <td>
                  <div class="table-actions">
                    <button 
                      class="btn-icon btn-icon-view"
                      onclick="viewUserDetails('${user._id}')"
                      title="View Details"
                    >
                      <i class="fa-solid fa-eye"></i>
                    </button>
                    ${
                      user.role !== "admin"
                        ? `
                    <button 
                      class="btn-icon btn-icon-reject"
                      onclick="deleteUser('${user._id}', '${user.firstName} ${user.lastName}')"
                      title="Delete User"
                    >
                      <i class="fa-solid fa-trash"></i>
                    </button>
                    `
                        : ""
                    }
                  </div>
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error("Error loading users:", error);
    container.innerHTML = `
      <div class="error-message">
        <i class="fa-solid fa-exclamation-triangle"></i>
        <p>Failed to load users. Please try again.</p>
        <button class="btn btn-primary" onclick="loadAllUsers()">
          Retry
        </button>
      </div>
    `;
  }
}

// Get role icon
function getRoleIcon(role) {
  const icons = {
    user: '<i class="fa-solid fa-user"></i>',
    therapist: '<i class="fa-solid fa-user-doctor"></i>',
    admin: '<i class="fa-solid fa-shield"></i>',
  };
  return icons[role] || '<i class="fa-solid fa-user"></i>';
}

// Get status icon
function getStatusIcon(status) {
  const icons = {
    pending: '<i class="fa-solid fa-clock"></i>',
    approved: '<i class="fa-solid fa-check-circle"></i>',
    rejected: '<i class="fa-solid fa-times-circle"></i>',
  };
  return icons[status] || "";
}

// View user details
async function viewUserDetails(userId) {
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
    const response = await fetch(
      `http://localhost:5000/api/admin/applications/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to load user details");
    }

    const user = await response.json();

    modalBody.innerHTML = `
      <div class="application-details">
        <div class="detail-section">
          <h4>Personal Information</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <strong>Full Name:</strong>
              <span>${user.firstName} ${user.lastName}</span>
            </div>
            <div class="detail-item">
              <strong>Email:</strong>
              <span>${user.email}</span>
            </div>
            <div class="detail-item">
              <strong>Role:</strong>
              <span class="role-badge role-${user.role}">
                ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
            </div>
            <div class="detail-item">
              <strong>Registered:</strong>
              <span>${formatDate(
                user.createdAt || user.registrationDate
              )}</span>
            </div>
          </div>
        </div>

        ${
          user.role === "therapist"
            ? `
          <div class="detail-section">
            <h4>Professional Information</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <strong>License Number:</strong>
                <span>${user.licenseNumber || "Not provided"}</span>
              </div>
              <div class="detail-item">
                <strong>Specialization:</strong>
                <span>${formatSpecialization(user.specialization)}</span>
              </div>
              <div class="detail-item">
                <strong>Years of Experience:</strong>
                <span>${user.yearsExperience || 0} years</span>
              </div>
              <div class="detail-item">
                <strong>Status:</strong>
                <span class="status-badge status-${user.registrationStatus}">
                  ${user.registrationStatus.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          ${
            user.education
              ? `
            <div class="detail-section">
              <h4>Education</h4>
              <p>${user.education}</p>
            </div>
          `
              : ""
          }

          ${
            user.certifications
              ? `
            <div class="detail-section">
              <h4>Certifications</h4>
              <p>${user.certifications}</p>
            </div>
          `
              : ""
          }

          ${
            user.bio
              ? `
            <div class="detail-section">
              <h4>Biography</h4>
              <p>${user.bio}</p>
            </div>
          `
              : ""
          }
        `
            : ""
        }

        ${
          user.role === "user"
            ? `
          <div class="detail-section">
            <h4>User Information</h4>
            <p>This is a regular user account with access to mental health resources and therapist connections.</p>
          </div>
        `
            : ""
        }
      </div>
    `;
  } catch (error) {
    console.error("Error loading user details:", error);
    modalBody.innerHTML = `
      <div class="error-message">
        <i class="fa-solid fa-exclamation-triangle"></i>
        <p>Failed to load user details.</p>
      </div>
    `;
  }
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
  } else if (sectionId === "users") {
    loadAllUsers();
  } else if (sectionId === "profile") {
    loadAdminProfile();
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

// Delete user function
async function deleteUser(userId, userName) {
  if (
    !confirm(
      `Are you sure you want to delete ${userName}?\n\nThis action cannot be undone and will permanently remove all user data including:\n- User profile\n- Mood entries\n- Goals\n- Messages\n- All associated data`
    )
  ) {
    return;
  }

  // Double confirmation for safety
  if (
    !confirm(
      `FINAL CONFIRMATION: Delete ${userName}?\n\nType YES in your mind and click OK to proceed.`
    )
  ) {
    return;
  }

  try {
    const token = localStorage.getItem("authToken");
    const response = await fetch(
      `http://localhost:5000/api/admin/users/${userId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete user");
    }

    showToast(`${userName} has been deleted successfully`, "success");

    // Reload users list and statistics
    loadAllUsers();
    loadStatistics();
  } catch (error) {
    console.error("Error deleting user:", error);
    showToast(error.message || "Failed to delete user", "error");
  }
}

// Load admin profile
async function loadAdminProfile() {
  const container = document.getElementById("profileContent");

  if (!container) {
    console.error("Profile container not found");
    return;
  }

  try {
    // Fetch fresh data from database instead of using only localStorage
    let userData = null;
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/profile/", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        userData = await response.json();
        // Update localStorage with fresh data from database
        localStorage.setItem("userData", JSON.stringify(userData));
        console.log("Profile loaded from database", userData);
      } else {
        throw new Error("Failed to fetch from API");
      }
    } catch (error) {
      console.warn("Could not fetch from API, using localStorage:", error);
      userData = JSON.parse(localStorage.getItem("userData") || "{}");
    }

    container.innerHTML = `
      <div class="profile-card-admin">
        <div class="profile-header-section">
          <div class="profile-picture-wrapper" style="position: relative; display: inline-block;">
            <img 
              id="adminProfileImage"
              src="${
                userData.profilePicture ||
                "../assets/profile-pictures/default-admin-avatar.svg"
              }" 
              alt="Admin Profile" 
              class="profile-picture-large"
              onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjYwIiBjeT0iNjAiIHI9IjYwIiBmaWxsPSIjRkY2NzAwIi8+CjxjaXJjbGUgY3g9IjYwIiBjeT0iNDYiIHI9IjIwIiBmaWxsPSIjRkZGIi8+CjxwYXRoIGQ9Ik0zMCAxMDBDMzAgODAgNDAgNjYgNjAgNjZTOTAgODAgOTAgMTAwIiBmaWxsPSIjRkZGIi8+Cjwvc3ZnPgo='"
            />
            <button 
              type="button" 
              class="profile-picture-edit-btn"
              onclick="document.getElementById('adminProfilePictureInput').click()"
              title="Change Profile Picture"
            >
              <i class="fa-solid fa-camera"></i>
            </button>
          </div>
          <div class="profile-info-section">
            <h3 class="profile-name-admin">${userData.firstName || "Admin"} ${
      userData.lastName || "User"
    }</h3>
            <p class="profile-email-admin">${
              userData.email || "Not available"
            }</p>
            <p class="profile-role-admin">
              <span class="role-badge role-admin">
                <i class="fa-solid fa-shield"></i> Administrator
              </span>
            </p>
          </div>
        </div>

        <div class="profile-details-section">
          <div class="detail-group">
            <h4 class="detail-group-title">Account Information</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <strong>User ID:</strong>
                <span>${userData.id || userData._id || "N/A"}</span>
              </div>
              <div class="detail-item">
                <strong>Email:</strong>
                <span>${userData.email || "Not available"}</span>
              </div>
              <div class="detail-item">
                <strong>Role:</strong>
                <span class="role-badge role-admin">Admin</span>
              </div>
              <div class="detail-item">
                <strong>Account Status:</strong>
                <span class="status-badge status-approved">
                  <i class="fa-solid fa-check-circle"></i> Active
                </span>
              </div>
              <div class="detail-item">
                <strong>Access Level:</strong>
                <span>Full Administrator</span>
              </div>
              <div class="detail-item">
                <strong>Account Type:</strong>
                <span>System Admin</span>
              </div>
            </div>
          </div>

          <div class="detail-group">
            <div class="detail-group-header">
              <h4 class="detail-group-title">Personal Information</h4>
              <button 
                type="button" 
                class="btn-icon btn-edit-profile"
                onclick="toggleAdminProfileEdit()"
                title="Edit Profile"
              >
                <i class="fa-solid fa-edit"></i> Edit
              </button>
            </div>
            <div id="personalInfoDisplay" class="detail-grid">
              <div class="detail-item">
                <strong>Full Name:</strong>
                <span>${userData.firstName || ""} ${
      userData.lastName || ""
    }</span>
              </div>
              <div class="detail-item">
                <strong>Phone:</strong>
                <span>${userData.phone || "Not provided"}</span>
              </div>
              <div class="detail-item">
                <strong>Address:</strong>
                <span>${userData.address || "Not provided"}</span>
              </div>
            </div>
            <form id="personalInfoForm" class="personal-info-form" style="display: none;">
              <div class="edit-form-container">
                <div class="form-row">
                  <div class="form-group">
                    <label>First Name:</label>
                    <input 
                      type="text" 
                      id="adminFirstName" 
                      placeholder="First Name"
                      value="${userData.firstName || ""}"
                      class="form-input"
                    />
                  </div>
                  <div class="form-group">
                    <label>Last Name:</label>
                    <input 
                      type="text" 
                      id="adminLastName" 
                      placeholder="Last Name"
                      value="${userData.lastName || ""}"
                      class="form-input"
                    />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Phone:</label>
                    <input 
                      type="tel" 
                      id="adminPhone" 
                      placeholder="Phone Number"
                      value="${userData.phone || ""}"
                      class="form-input"
                    />
                  </div>
                  <div class="form-group">
                    <label>Address:</label>
                    <input 
                      type="text" 
                      id="adminAddress" 
                      placeholder="Address"
                      value="${userData.address || ""}"
                      class="form-input"
                    />
                  </div>
                </div>
                <div class="form-actions">
                  <button 
                    type="button" 
                    class="btn btn-success"
                    onclick="saveAdminPersonalInfo()"
                  >
                    <i class="fa-solid fa-save"></i> Save Changes
                  </button>
                  <button 
                    type="button" 
                    class="btn btn-secondary"
                    onclick="toggleAdminProfileEdit()"
                  >
                    <i class="fa-solid fa-times"></i> Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div class="detail-group">
            <h4 class="detail-group-title">Permissions</h4>
            <div class="permissions-list">
              <div class="permission-item">
                <i class="fa-solid fa-check-circle permission-granted"></i>
                <span>Manage therapist applications</span>
              </div>
              <div class="permission-item">
                <i class="fa-solid fa-check-circle permission-granted"></i>
                <span>View all users and therapists</span>
              </div>
              <div class="permission-item">
                <i class="fa-solid fa-check-circle permission-granted"></i>
                <span>Delete user accounts</span>
              </div>
              <div class="permission-item">
                <i class="fa-solid fa-check-circle permission-granted"></i>
                <span>View platform statistics</span>
              </div>
              <div class="permission-item">
                <i class="fa-solid fa-check-circle permission-granted"></i>
                <span>Approve/Reject therapist applications</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Update sidebar with fresh profile data
    const sidebarUserName = document.getElementById("sidebarUserName");
    if (sidebarUserName && userData.firstName) {
      sidebarUserName.textContent = `${userData.firstName} ${userData.lastName}`;
    }

    const sidebarProfileImage = document.getElementById("sidebarProfileImage");
    if (sidebarProfileImage && userData.profilePicture) {
      sidebarProfileImage.src = userData.profilePicture;
      console.log("Sidebar image updated:", userData.profilePicture);
    }
  } catch (error) {
    console.error("Error loading admin profile:", error);
    container.innerHTML = `
      <div class="error-message">
        <i class="fa-solid fa-exclamation-triangle"></i>
        <p>Failed to load profile. Please try again.</p>
        <button class="btn btn-primary" onclick="loadAdminProfile()">
          Retry
        </button>
      </div>
    `;
  }
}

// ============================================
// ADMIN PROFILE PICTURE UPLOAD FUNCTIONALITY
// ============================================

// Initialize admin profile picture upload
function initializeAdminProfilePictureUpload() {
  const fileInput = document.getElementById("adminProfilePictureInput");

  if (!fileInput) return;

  // Handle file selection
  fileInput.addEventListener("change", async function (e) {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showToast("Please select a valid image file", "error");
      fileInput.value = "";
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast("Please select an image smaller than 5MB", "error");
      fileInput.value = "";
      return;
    }

    // Upload immediately
    await uploadAdminProfilePicture(file);
    fileInput.value = "";
  });
}

// Upload admin profile picture
async function uploadAdminProfilePicture(file) {
  if (!file) {
    showToast("Please select a file first", "error");
    return;
  }

  try {
    // Show loading state on the image
    const profileImg = document.getElementById("adminProfileImage");
    if (profileImg) {
      profileImg.style.opacity = "0.5";
    }

    showToast("Uploading profile picture...", "info");

    // Upload file
    const token = localStorage.getItem("authToken");
    const formData = new FormData();
    formData.append("profilePicture", file);

    const response = await fetch("/api/profile/picture", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to upload image");
    }

    const result = await response.json();

    // Update profile image
    if (profileImg) {
      profileImg.src = result.profilePictureUrl;
      profileImg.style.opacity = "1";
    }

    // Update sidebar profile image
    const sidebarImg = document.getElementById("sidebarProfileImage");
    if (sidebarImg) {
      sidebarImg.src = result.profilePictureUrl;
    }

    // Update localStorage
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    userData.profilePicture = result.profilePictureUrl;
    localStorage.setItem("userData", JSON.stringify(userData));

    showToast("Profile picture updated successfully!", "success");
  } catch (error) {
    console.error("Upload error:", error);
    showToast(error.message || "Failed to upload profile picture", "error");

    // Restore opacity on error
    const profileImg = document.getElementById("adminProfileImage");
    if (profileImg) {
      profileImg.style.opacity = "1";
    }
  }
}

// Cancel admin profile picture upload (kept for compatibility)
function cancelAdminProfilePictureUpload() {
  const fileInput = document.getElementById("adminProfilePictureInput");
  fileInput.value = "";
}

// ============================================
// ADMIN PERSONAL INFORMATION EDIT FUNCTIONALITY
// ============================================

// Toggle between view and edit mode
function toggleAdminProfileEdit() {
  const displayDiv = document.getElementById("personalInfoDisplay");
  const formDiv = document.getElementById("personalInfoForm");

  if (displayDiv && formDiv) {
    if (displayDiv.style.display === "none") {
      // Switch to display mode
      displayDiv.style.display = "grid";
      formDiv.style.display = "none";
    } else {
      // Switch to edit mode
      displayDiv.style.display = "none";
      formDiv.style.display = "grid";
    }
  }
}

// Save admin personal information
async function saveAdminPersonalInfo() {
  try {
    const firstName = document.getElementById("adminFirstName").value.trim();
    const lastName = document.getElementById("adminLastName").value.trim();
    const phone = document.getElementById("adminPhone").value.trim();
    const address = document.getElementById("adminAddress").value.trim();

    // Validate required fields
    if (!firstName || !lastName) {
      showToast("First name and last name are required", "error");
      return;
    }

    showToast("Saving personal information...", "info");

    const token = localStorage.getItem("authToken");
    const response = await fetch("http://localhost:5000/api/profile/", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName,
        lastName,
        phone,
        address,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update profile");
    }

    const result = await response.json();

    // Update localStorage
    const userData = JSON.parse(localStorage.getItem("userData") || "{}");
    userData.firstName = firstName;
    userData.lastName = lastName;
    userData.phone = phone;
    userData.address = address;
    localStorage.setItem("userData", JSON.stringify(userData));

    // Update sidebar with new name
    const sidebarName = document.getElementById("sidebarUserName");
    if (sidebarName) {
      sidebarName.textContent = `${firstName} ${lastName}`;
    }

    showToast("Personal information updated successfully!", "success");

    // Reload profile to reflect changes
    loadAdminProfile();
  } catch (error) {
    console.error("Save error:", error);
    showToast(error.message || "Failed to save personal information", "error");
  }
}
