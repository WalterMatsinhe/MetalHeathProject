const rateLimit = require("express-rate-limit");

// General API rate limiter - 500 requests per 15 minutes (very generous for development)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for:
    // 1. Health check endpoints
    // 2. Static files (css, js, images, etc)
    // 3. Root path
    if (req.path.startsWith("/health/")) return true;
    if (req.path === "/" || req.path.startsWith("/assets")) return true;
    if (
      /\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/.test(req.path)
    )
      return true;
    return false;
  },
});

// Notifications rate limiter - 120 requests per minute (very generous for rapid updates)
const notificationsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: "Too many notification requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Don't rate limit if it's a successful response or health check
    if (req.path.startsWith("/health/")) return true;
    return false;
  },
});

// Login rate limiter - 10 attempts per 15 minutes (more generous)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts, please try again after 15 minutes.",
  skipSuccessfulRequests: false,
  keyGenerator: (req) => req.body.email || req.ip,
});

// Register rate limiter - 3 registrations per hour
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: "Too many registration attempts, please try again after an hour.",
  keyGenerator: (req) => req.body.email || req.ip,
});

// Chat rate limiter - 30 messages per minute
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: "Too many chat messages, please slow down.",
});

// Upload rate limiter - 10 uploads per hour
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Too many uploads, please try again later.",
});

// Report rate limiter - 5 reports per day
const reportLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5,
  message: "Too many reports submitted, please try again tomorrow.",
});

module.exports = {
  apiLimiter,
  notificationsLimiter,
  loginLimiter,
  registerLimiter,
  chatLimiter,
  uploadLimiter,
  reportLimiter,
};
