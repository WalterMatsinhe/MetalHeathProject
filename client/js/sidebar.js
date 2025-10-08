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

  // Try to get user data from localStorage
  const userData = JSON.parse(localStorage.getItem("userData") || "{}");
  console.log(
    "InitializeSidebarProfile - userData from localStorage:",
    userData
  );

  // Update user name and welcome message if available
  const sidebarWelcomeMessage = document.getElementById(
    "sidebarWelcomeMessage"
  );

  if (userData.firstName || userData.lastName) {
    const fullName = `${userData.firstName || ""} ${
      userData.lastName || ""
    }`.trim();

    if (sidebarUserName) {
      sidebarUserName.textContent = fullName;
    }

    // Update welcome message with real name
    if (sidebarWelcomeMessage) {
      const firstName = userData.firstName || fullName.split(" ")[0] || "there";
      sidebarWelcomeMessage.textContent = `Welcome back, ${firstName}!`;
    }
  } else {
    // Fallback if no name is available
    if (sidebarUserName) {
      sidebarUserName.textContent = "User";
    }
    if (sidebarWelcomeMessage) {
      sidebarWelcomeMessage.textContent = "Welcome back!";
    }
  }

  // PRIORITY 1: Load saved profile image from localStorage
  if (userData.profileImage && sidebarProfileImg) {
    console.log("Loading image from localStorage for sidebar");
    sidebarProfileImg.src = userData.profileImage;

    // Also update main profile image if it exists and doesn't have the same image
    const mainProfileImg = document.getElementById("profileImage");
    if (mainProfileImg && mainProfileImg.src !== userData.profileImage) {
      mainProfileImg.src = userData.profileImage;
      console.log("Synced main profile image with localStorage data");
    }
  } else if (sidebarProfileImg) {
    // PRIORITY 2: Check if main profile image has a custom image
    const mainProfileImg = document.getElementById("profileImage");
    if (mainProfileImg && mainProfileImg.src) {
      // Copy any image from main profile to sidebar (including uploaded images)
      console.log("Loading image from main profile for sidebar");
      sidebarProfileImg.src = mainProfileImg.src;
      // Save to localStorage for future use if it's not a default image
      if (
        !mainProfileImg.src.includes("default-avatar.svg") &&
        !mainProfileImg.src.includes("data:image/svg+xml")
      ) {
        const updatedUserData = JSON.parse(
          localStorage.getItem("userData") || "{}"
        );
        updatedUserData.profileImage = mainProfileImg.src;
        localStorage.setItem("userData", JSON.stringify(updatedUserData));
        console.log("Saved main profile image to localStorage");
      }
    } else {
      console.log("No custom image found, using default");
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
