// ============================================
// SIDEBAR AND USER INTERFACE
// ============================================

// Initialize sidebar profile
function initializeSidebarProfile() {
  const sidebarProfileImg = document.getElementById("sidebarProfileImage");
  const sidebarUserName = document.getElementById("sidebarUserName");

  // Set default image fallback immediately
  if (sidebarProfileImg) {
    sidebarProfileImg.onerror = function () {
      this.src =
        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9IiNGMEYwRjAiLz4KPGNpcmNsZSBjeD0iMzAiIGN5PSIyMyIgcj0iMTAiIGZpbGw9IiM5OTk5OTkiLz4KPHBhdGggZD0iTTEwIDUwQzEwIDQwIDIwIDMzIDMwIDMzUzUwIDQwIDUwIDUwIiBmaWxsPSIjOTk5OTk5Ii8+Cjwvc3ZnPgo=";
    };
  }

  // Fetch current user profile from API to ensure we have the correct logged-in user's info
  const token = sessionStorage.getItem("authToken");
  if (token) {
    fetch("/api/profile/", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((userData) => {
        if (userData) {
          console.log("Sidebar initialized with current user data:", userData);

          // Update sidebar with current logged-in user
          const fullName = `${userData.firstName || ""} ${
            userData.lastName || ""
          }`.trim();

          if (sidebarUserName) {
            sidebarUserName.textContent = fullName || "User";
          }

          const sidebarWelcomeMessage = document.getElementById(
            "sidebarWelcomeMessage"
          );
          if (sidebarWelcomeMessage) {
            const firstName = userData.firstName || "there";
            sidebarWelcomeMessage.textContent = `Welcome back, ${firstName}!`;
          }

          // Update profile image
          if (userData.profilePicture && sidebarProfileImg) {
            sidebarProfileImg.src = userData.profilePicture;
          }

          // Update sessionStorage with current user
          sessionStorage.setItem("userData", JSON.stringify(userData));
        }
      })
      .catch((error) => {
        console.error("Failed to fetch user profile for sidebar:", error);
        // Fallback to sessionStorage if API fails
        const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
        if (userData.firstName || userData.lastName) {
          const fullName = `${userData.firstName || ""} ${
            userData.lastName || ""
          }`.trim();

          if (sidebarUserName) {
            sidebarUserName.textContent = fullName;
          }

          const sidebarWelcomeMessage = document.getElementById(
            "sidebarWelcomeMessage"
          );
          if (sidebarWelcomeMessage) {
            const firstName = userData.firstName || "there";
            sidebarWelcomeMessage.textContent = `Welcome back, ${firstName}!`;
          }
        } else {
          if (sidebarUserName) {
            sidebarUserName.textContent = "User";
          }
        }
      });
  } else {
    // No token, use sessionStorage fallback
    const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
    if (userData.firstName || userData.lastName) {
      const fullName = `${userData.firstName || ""} ${
        userData.lastName || ""
      }`.trim();

      if (sidebarUserName) {
        sidebarUserName.textContent = fullName;
      }

      const sidebarWelcomeMessage = document.getElementById(
        "sidebarWelcomeMessage"
      );
      if (sidebarWelcomeMessage) {
        const firstName = userData.firstName || "there";
        sidebarWelcomeMessage.textContent = `Welcome back, ${firstName}!`;
      }
    } else {
      if (sidebarUserName) {
        sidebarUserName.textContent = "User";
      }
    }
  }

  // Add click handler to navigate to profile section
  if (sidebarProfileImg) {
    sidebarProfileImg.addEventListener("click", function () {
      if (typeof showSection === "function") {
        showSection("profile");
      }
    });
  }
}

// Function to manually sync main profile image to sidebar
function syncProfileToSidebar() {
  const mainProfileImg = document.getElementById("profileImage");
  const sidebarProfileImg = document.getElementById("sidebarProfileImage");

  if (mainProfileImg && sidebarProfileImg) {
    sidebarProfileImg.src = mainProfileImg.src;
    console.log("Profile image synced to sidebar");
    return "Images synced successfully";
  }
  return "Could not find profile images";
}

// Function to update sidebar profile image when main profile changes
function updateSidebarProfile(imageSrc, userName) {
  const sidebarProfileImg = document.getElementById("sidebarProfileImage");
  const sidebarUserName = document.getElementById("sidebarUserName");
  const sidebarWelcomeMessage = document.getElementById(
    "sidebarWelcomeMessage"
  );

  console.log("updateSidebarProfile called with:", {
    imageSrc: imageSrc ? "image provided" : "no image",
    userName: userName || "no username",
  });

  if (sidebarProfileImg && imageSrc) {
    sidebarProfileImg.src = imageSrc;
    console.log(
      "Sidebar profile image updated to:",
      imageSrc.substring(0, 50) + "..."
    );
  }

  if (sidebarUserName && userName) {
    sidebarUserName.textContent = userName;
    console.log("Sidebar username updated to:", userName);

    // Update welcome message with the user's first name
    if (sidebarWelcomeMessage) {
      const firstName = userName.split(" ")[0] || "there";
      sidebarWelcomeMessage.textContent = `Welcome back, ${firstName}!`;
    }
  }
}
