/**
 * Input Validation Middleware
 * Provides schema validation and input sanitization
 */

/**
 * Validates request body against a schema
 * @param {Object} schema - Object with field names as keys and validation rules as values
 * @returns {Function} Middleware function
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    const errors = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      // Check required
      if (rules.required && (value === undefined || value === null || value === "")) {
        errors[field] = `${field} is required`;
        continue;
      }

      if (value === undefined || value === null) continue;

      // Check type
      if (rules.type) {
        const actualType = Array.isArray(value) ? "array" : typeof value;
        if (actualType !== rules.type) {
          errors[field] = `${field} must be a ${rules.type}`;
          continue;
        }
      }

      // Check minlength
      if (rules.minlength && value.length < rules.minlength) {
        errors[field] = `${field} must be at least ${rules.minlength} characters`;
      }

      // Check maxlength
      if (rules.maxlength && value.length > rules.maxlength) {
        errors[field] = `${field} cannot exceed ${rules.maxlength} characters`;
      }

      // Check enum
      if (rules.enum && !rules.enum.includes(value)) {
        errors[field] = `${field} must be one of: ${rules.enum.join(", ")}`;
      }

      // Check email
      if (rules.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors[field] = `${field} must be a valid email`;
        }
      }

      // Check pattern
      if (rules.pattern && !rules.pattern.test(value)) {
        errors[field] = `${field} contains invalid characters`;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    next();
  };
};

/**
 * Sanitize input to prevent XSS
 */
const sanitizeInput = (value) => {
  if (typeof value !== "string") return value;
  return value.trim().replace(/[<>]/g, "");
};

/**
 * Middleware to sanitize all string inputs in request body
 */
const sanitizeRequestBody = (req, res, next) => {
  for (const [key, value] of Object.entries(req.body)) {
    if (typeof value === "string") {
      req.body[key] = sanitizeInput(value);
    }
  }
  next();
};

module.exports = {
  validateRequest,
  sanitizeInput,
  sanitizeRequestBody,
};
