// ============================================
// VALIDATION UTILITIES - CONSOLIDATED
// ============================================

const Validators = {
  PATTERNS: {
    name: /^[a-zA-Z\s\-'\.]+$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },

  MAX_LENGTHS: {
    firstName: 50,
    lastName: 50,
    password: 255,
    bio: 1000,
  },

  MIN_LENGTHS: {
    password: 6,
  },

  // Validate name field
  validateName(name, fieldName = "Name") {
    if (!name?.trim()) {
      return { valid: false, error: `${fieldName} is required` };
    }
    if (!this.PATTERNS.name.test(name.trim())) {
      return {
        valid: false,
        error: `${fieldName} can only contain letters, spaces, hyphens, apostrophes, and periods`,
      };
    }
    if (name.trim().length > this.MAX_LENGTHS.firstName) {
      return {
        valid: false,
        error: `${fieldName} cannot exceed ${this.MAX_LENGTHS.firstName} characters`,
      };
    }
    return { valid: true };
  },

  // Validate email
  validateEmail(email) {
    if (!email?.trim()) {
      return { valid: false, error: "Email is required" };
    }
    if (!this.PATTERNS.email.test(email.trim())) {
      return { valid: false, error: "Please enter a valid email address" };
    }
    return { valid: true };
  },

  // Validate password
  validatePassword(password) {
    if (!password || password.length < this.MIN_LENGTHS.password) {
      return {
        valid: false,
        error: `Password must be at least ${this.MIN_LENGTHS.password} characters`,
      };
    }
    return { valid: true };
  },

  // Validate registration form
  validateRegistrationForm(data) {
    const errors = [];

    // First name
    const firstNameCheck = this.validateName(data.firstName, "First name");
    if (!firstNameCheck.valid) errors.push(firstNameCheck.error);

    // Last name
    const lastNameCheck = this.validateName(data.lastName, "Last name");
    if (!lastNameCheck.valid) errors.push(lastNameCheck.error);

    // Email
    const emailCheck = this.validateEmail(data.email);
    if (!emailCheck.valid) errors.push(emailCheck.error);

    // Password
    const passwordCheck = this.validatePassword(data.password);
    if (!passwordCheck.valid) errors.push(passwordCheck.error);

    // Therapist-specific validations
    if (data.role === "therapist") {
      if (!data.licenseNumber?.trim()) {
        errors.push("License number is required for therapist registration");
      }
      if (!data.specialization) {
        errors.push("Please select a specialization");
      }
      if (!data.yearsExperience || data.yearsExperience < 0) {
        errors.push("Years of experience is required");
      }
      if (!data.education?.trim()) {
        errors.push("Education and qualifications are required");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  // Sanitize form data
  sanitizeRegistrationData(data) {
    return {
      ...data,
      firstName: data.firstName?.trim() || "",
      lastName: data.lastName?.trim() || "",
      email: data.email?.trim().toLowerCase() || "",
      licenseNumber: data.licenseNumber?.trim() || "",
      education: data.education?.trim() || "",
      institution: data.institution?.trim() || "",
      certifications: data.certifications?.trim() || "",
    };
  },
};

