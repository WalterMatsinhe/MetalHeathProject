// ============================================
// AUTHENTICATION AND FORMS
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  // Registration form handler
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      const formData = new FormData(registerForm);
      const data = Object.fromEntries(formData.entries());
      const res = await fetch(registerForm.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok) {
        showToast("Registration successful! Please login.", "success");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 1200);
      } else {
        showToast(result.message || "Registration failed", "error");
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
        }
        // Set flag to show toast on dashboard
        localStorage.setItem("showLoginToast", "1");
        if (result.user.role === "therapist") {
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