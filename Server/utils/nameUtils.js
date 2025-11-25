/**
 * User Name Utilities
 *
 * This module provides utility functions for working with user names.
 * Consolidates logic for handling firstName and lastName fields.
 */

/**
 * Get full name from user object
 * @param {Object} user - User object with firstName and lastName properties
 * @param {string} [fallback='Unknown User'] - Fallback if no name components exist
 * @returns {string} The full name
 */
function getFullName(user, fallback = "Unknown User") {
  if (!user) return fallback;

  const firstName = user.firstName?.trim() || "";
  const lastName = user.lastName?.trim() || "";

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }

  if (firstName) return firstName;
  if (lastName) return lastName;

  return fallback;
}

/**
 * Format user display info with name, email, and optional role
 * @param {Object} user - User object
 * @param {boolean} [includeRole=false] - Whether to include role in display
 * @returns {string} Formatted display string
 */
function formatUserDisplay(user, includeRole = false) {
  const fullName = getFullName(user);
  const email = user.email || "No email";

  if (includeRole && user.role) {
    return `${fullName} (${user.role}) - ${email}`;
  }

  return `${fullName} - ${email}`;
}

/**
 * Get first name or full name fallback
 * @param {Object} user - User object
 * @returns {string} First name or full name
 */
function getFirstNameOrFull(user) {
  if (user?.firstName?.trim()) {
    return user.firstName.trim();
  }
  return getFullName(user);
}

/**
 * Validate name components
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {Object} Validation result { isValid: boolean, errors: string[] }
 */
function validateNameComponents(firstName, lastName) {
  const errors = [];

  if (!firstName || !firstName.trim()) {
    errors.push("First name is required");
  } else if (firstName.length > 50) {
    errors.push("First name cannot exceed 50 characters");
  } else if (!/^[a-zA-Z\s\-'\.]+$/.test(firstName)) {
    errors.push("First name contains invalid characters");
  }

  if (!lastName || !lastName.trim()) {
    errors.push("Last name is required");
  } else if (lastName.length > 50) {
    errors.push("Last name cannot exceed 50 characters");
  } else if (!/^[a-zA-Z\s\-'\.]+$/.test(lastName)) {
    errors.push("Last name contains invalid characters");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize and normalize name components
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {Object} Sanitized { firstName, lastName }
 */
function sanitizeNameComponents(firstName, lastName) {
  return {
    firstName: (firstName || "").trim(),
    lastName: (lastName || "").trim(),
  };
}

module.exports = {
  getFullName,
  formatUserDisplay,
  getFirstNameOrFull,
  validateNameComponents,
  sanitizeNameComponents,
};
