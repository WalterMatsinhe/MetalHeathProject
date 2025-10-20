// ============================================
// AUTHENTICATION AND FORMS
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  // Handle role selection change to show/hide therapist fields
  const roleSelect = document.getElementById("role");
  const therapistFields = document.getElementById("therapistFields");

  if (roleSelect && therapistFields) {
    roleSelect.addEventListener("change", function () {
      const submitButtonText = document.getElementById("submitButtonText");

      if (this.value === "therapist") {
        therapistFields.style.display = "block";
        if (submitButtonText) {
          submitButtonText.textContent = "Submit Application for Review";
        }

        // Make therapist fields required
        document.getElementById("licenseNumber").required = true;
        document.getElementById("specialization").required = true;
        document.getElementById("yearsExperience").required = true;
        document.getElementById("education").required = true;
      } else {
        therapistFields.style.display = "none";
        if (submitButtonText) {
          submitButtonText.textContent = "Register";
        }

        // Make therapist fields not required
        document.getElementById("licenseNumber").required = false;
        document.getElementById("specialization").required = false;
        document.getElementById("yearsExperience").required = false;
        document.getElementById("education").required = false;
      }
    });
  }

  // Registration form handler
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const formData = new FormData(registerForm);
      const data = Object.fromEntries(formData.entries());

      // Validate required fields
      if (!data.firstName || !data.firstName.trim()) {
        showToast("First name is required", "error");
        return;
      }

      if (!data.lastName || !data.lastName.trim()) {
        showToast("Last name is required", "error");
        return;
      }

      // Validate name format
      const namePattern = /^[a-zA-Z\s\-'\.]+$/;
      if (!namePattern.test(data.firstName.trim())) {
        showToast(
          "First name can only contain letters, spaces, hyphens, apostrophes, and periods",
          "error"
        );
        return;
      }

      if (!namePattern.test(data.lastName.trim())) {
        showToast(
          "Last name can only contain letters, spaces, hyphens, apostrophes, and periods",
          "error"
        );
        return;
      }

      // Validate name length
      if (data.firstName.trim().length > 50) {
        showToast("First name cannot be longer than 50 characters", "error");
        return;
      }

      if (data.lastName.trim().length > 50) {
        showToast("Last name cannot be longer than 50 characters", "error");
        return;
      }

      if (!data.email || !data.email.trim()) {
        showToast("Email is required", "error");
        return;
      }

      // Validate email format
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(data.email.trim())) {
        showToast("Please enter a valid email address", "error");
        return;
      }

      if (!data.password || data.password.length < 6) {
        showToast("Password must be at least 6 characters long", "error");
        return;
      }

      // Validate therapist-specific fields
      if (data.role === "therapist") {
        if (!data.licenseNumber || !data.licenseNumber.trim()) {
          showToast(
            "License number is required for therapist registration",
            "error"
          );
          return;
        }

        if (!data.specialization || data.specialization === "") {
          showToast("Please select a specialization", "error");
          return;
        }

        if (!data.yearsExperience || data.yearsExperience < 0) {
          showToast("Years of experience is required", "error");
          return;
        }

        if (!data.education || !data.education.trim()) {
          showToast(
            "Education and qualifications are required for therapist registration",
            "error"
          );
          return;
        }

        // Trim therapist fields
        data.licenseNumber = data.licenseNumber.trim();
        data.education = data.education.trim();
        if (data.institution) data.institution = data.institution.trim();
        if (data.certifications)
          data.certifications = data.certifications.trim();
      }

      // Trim whitespace from names and email
      data.firstName = data.firstName.trim();
      data.lastName = data.lastName.trim();
      data.email = data.email.trim().toLowerCase();

      try {
        const res = await fetch(registerForm.action, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await res.json();

        if (res.ok) {
          if (data.role === "therapist") {
            showToast(
              "Application submitted! Please wait for admin approval.",
              "success"
            );
            setTimeout(() => {
              window.location.href = "login.html";
            }, 2500);
          } else {
            showToast("Registration successful! Please login.", "success");
            setTimeout(() => {
              window.location.href = "login.html";
            }, 1200);
          }
        } else {
          showToast(result.message || "Registration failed", "error");
        }
      } catch (error) {
        console.error("Registration error:", error);
        showToast("Network error. Please try again.", "error");
      }
    });
  }

  // Login form handler
  const loginForm = document.querySelector(".login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const formData = new FormData(loginForm);
      const data = Object.fromEntries(formData.entries());
      const res = await fetch(loginForm.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok && result.user) {
        // Store JWT token for API requests
        if (result.token) {
          localStorage.setItem("authToken", result.token);
          console.log("Token stored:", result.token.substring(0, 20) + "...");
        }

        // Store user data for profile and sidebar
        if (result.user) {
          localStorage.setItem("userData", JSON.stringify(result.user));
          console.log("User data stored:", result.user);
        }

        // Set flag to show toast on dashboard
        localStorage.setItem("showLoginToast", "1");

        if (result.user.role === "admin") {
          window.location.href = "adminDashboard.html";
        } else if (result.user.role === "therapist") {
          window.location.href = "therapistDashboard.html";
        } else {
          window.location.href = "userDashboard.html";
        }
      } else {
        showToast(result.message || "Login failed", "error");
      }
    });
  }

  // Show login toast on dashboard if flag is set
  if (localStorage.getItem("showLoginToast")) {
    showToast("Login successful!", "success");
    localStorage.removeItem("showLoginToast");
  }

  // Contact form handler
  var contactForm = document.getElementById("contactForm");
  var submitBtn = document.getElementById("submitBtn");
  var formStatus = document.getElementById("formStatus");
  if (contactForm) {
    contactForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";
      formStatus.textContent = "";
      var formData = new FormData(contactForm);
      formData.append("access_key", "3254b0de-7d62-4d0d-b1d8-7f64fa6063e4");
      var object = {};
      formData.forEach((value, key) => {
        object[key] = value;
      });
      var json = JSON.stringify(object);
      try {
        var res = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: json,
        });
        var data = await res.json();
        if (data.success) {
          formStatus.style.color = "#05c19b";
          formStatus.textContent =
            "Message Sent! Thank you for your message. We will get back to you soon.";
          contactForm.reset();
        } else {
          formStatus.style.color = "red";
          formStatus.textContent = "Submission Failed. Please try again later.";
        }
      } catch (error) {
        formStatus.style.color = "red";
        formStatus.textContent = "Network error or invalid request.";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Send Message";
      }
    });
  }
});
