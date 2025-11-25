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
      let data = Object.fromEntries(formData.entries());

      // Validate using consolidated validator
      const validation = Validators.validateRegistrationForm(data);
      if (!validation.valid) {
        validation.errors.forEach((error) => showToast(error, "error"));
        return;
      }

      // Sanitize data
      data = Validators.sanitizeRegistrationData(data);

      try {
        const res = await fetch(registerForm.action, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await res.json();

        if (res.ok) {
          showToast(
            data.role === "therapist"
              ? "Application submitted! Please wait for admin approval."
              : "Registration successful! Please login.",
            "success"
          );
          setTimeout(() => (window.location.href = "login.html"), 1500);
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
