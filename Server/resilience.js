const rateLimit = require("express-rate-limit");

/**
 * ============================================
 * RESILIENCE & RATE LIMITING MIDDLEWARE
 * ============================================
 * Provides protection against abuse, DDoS, and service overload
 */

/**
 * General API rate limiter
 * Limits: 100 requests per 15 minutes per IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health checks and static files
    return req.path.startsWith("/health/") || req.path.startsWith("/assets/");
  },
});

/**
 * Auth endpoints rate limiter (stricter)
 * Limits: 5 attempts per 15 minutes
 * Prevents brute force attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: "Too many login attempts, please try again after 15 minutes.",
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false, // Count failed attempts
});

/**
 * Socket connection rate limiter
 * Prevents socket spam and connection flooding
 */
const socketConnectionLimiter = {
  clients: new Map(),

  /**
   * Check if client can connect
   * Limit: 10 connections per minute per IP
   */
  canConnect(clientId) {
    const now = Date.now();
    const WINDOW = 60 * 1000; // 1 minute
    const MAX_CONNECTIONS = 10;

    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, []);
    }

    const timestamps = this.clients.get(clientId);

    // Remove old timestamps outside the window
    const recentTimestamps = timestamps.filter((ts) => now - ts < WINDOW);

    if (recentTimestamps.length >= MAX_CONNECTIONS) {
      console.warn(`⚠️  Connection rate limit exceeded for: ${clientId}`);
      return false;
    }

    recentTimestamps.push(now);
    this.clients.set(clientId, recentTimestamps);
    return true;
  },

  /**
   * Clean up old entries to prevent memory leak
   */
  cleanup() {
    const now = Date.now();
    const WINDOW = 60 * 1000;

    for (const [clientId, timestamps] of this.clients.entries()) {
      const recentTimestamps = timestamps.filter((ts) => now - ts < WINDOW);

      if (recentTimestamps.length === 0) {
        this.clients.delete(clientId);
      } else {
        this.clients.set(clientId, recentTimestamps);
      }
    }
  },
};

/**
 * Simple Circuit Breaker Pattern
 * Prevents cascading failures by stopping requests to failing services
 */
class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.state = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;

    // Configuration
    this.failureThreshold = options.failureThreshold || 5; // Open after 5 failures
    this.successThreshold = options.successThreshold || 2; // Close after 2 successes
    this.timeout = options.timeout || 60 * 1000; // 60 seconds before attempting recovery
  }

  /**
   * Check if request should be allowed
   */
  canExecute() {
    if (this.state === "CLOSED") {
      return true;
    }

    if (this.state === "OPEN") {
      // Check if timeout has passed to try recovery
      if (Date.now() - this.lastFailureTime > this.timeout) {
        console.log(`🔄 Circuit breaker ${this.name} entering HALF_OPEN state`);
        this.state = "HALF_OPEN";
        this.successCount = 0;
        return true;
      }
      return false;
    }

    if (this.state === "HALF_OPEN") {
      return true; // Allow test requests
    }

    return false;
  }

  /**
   * Record successful request
   */
  recordSuccess() {
    if (this.state === "HALF_OPEN") {
      this.successCount++;

      if (this.successCount >= this.successThreshold) {
        console.log(`✅ Circuit breaker ${this.name} CLOSED (recovered)`);
        this.state = "CLOSED";
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else if (this.state === "CLOSED") {
      // Reset failure count on success
      if (this.failureCount > 0) {
        this.failureCount = 0;
      }
    }
  }

  /**
   * Record failed request
   */
  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === "CLOSED" && this.failureCount >= this.failureThreshold) {
      console.warn(
        `⚠️  Circuit breaker ${this.name} OPEN after ${this.failureCount} failures`
      );
      this.state = "OPEN";
      this.failureCount = 0;
    } else if (this.state === "HALF_OPEN") {
      console.warn(
        `⚠️  Circuit breaker ${this.name} reopened (recovery failed)`
      );
      this.state = "OPEN";
      this.successCount = 0;
    }
  }

  /**
   * Get circuit breaker status
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
    };
  }
}

/**
 * Database circuit breaker instance
 */
const dbCircuitBreaker = new CircuitBreaker("MongoDB", {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30 * 1000, // 30 seconds
});

/**
 * Middleware to handle circuit breaker for database operations
 */
function circuitBreakerMiddleware(req, res, next) {
  if (!dbCircuitBreaker.canExecute()) {
    return res.status(503).json({
      message: "Service temporarily unavailable. Please try again later.",
      retryAfter: 30,
    });
  }

  // Store original res.json to intercept responses
  const originalJson = res.json.bind(res);

  res.json = function (data) {
    // Record response status
    if (res.statusCode >= 500) {
      dbCircuitBreaker.recordFailure();
    } else {
      dbCircuitBreaker.recordSuccess();
    }

    return originalJson(data);
  };

  next();
}

/**
 * Cleanup job for socket connection limiter
 * Run every 5 minutes
 */
setInterval(() => {
  socketConnectionLimiter.cleanup();
  console.log("🧹 Socket connection limiter cleanup completed");
}, 5 * 60 * 1000);

module.exports = {
  apiLimiter,
  authLimiter,
  socketConnectionLimiter,
  CircuitBreaker,
  dbCircuitBreaker,
  circuitBreakerMiddleware,
};
