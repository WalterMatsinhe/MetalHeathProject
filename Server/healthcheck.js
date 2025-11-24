const mongoose = require("mongoose");

/**
 * ============================================
 * HEALTH CHECK MODULE
 * ============================================
 * Provides liveness and readiness probes for monitoring
 * and zero-downtime deployment strategies
 */

// Health check state tracking
const healthState = {
  isReady: false,
  isAlive: true,
  startTime: Date.now(),
  mongoConnection: false,
  responseTime: 0,
  lastCheck: Date.now(),
  errorCount: 0,
  successCount: 0,
};

/**
 * Readiness probe - checks if system is ready to accept requests
 * Used by load balancers to route traffic only to ready instances
 */
function readinessProbe() {
  return {
    status: healthState.isReady ? "ready" : "not_ready",
    timestamp: new Date().toISOString(),
    mongoConnected: healthState.mongoConnection,
    uptime: Date.now() - healthState.startTime,
  };
}

/**
 * Liveness probe - checks if system is alive and responsive
 * Used to detect unresponsive instances that need restart
 */
function livenessProbe() {
  return {
    status: healthState.isAlive ? "alive" : "dead",
    timestamp: new Date().toISOString(),
    uptime: Date.now() - healthState.startTime,
    responseTime: healthState.responseTime,
    errorCount: healthState.errorCount,
    successCount: healthState.successCount,
  };
}

/**
 * Detailed health metrics for monitoring systems
 */
function getDetailedMetrics() {
  return {
    readiness: readinessProbe(),
    liveness: livenessProbe(),
    database: {
      connected: healthState.mongoConnection,
      connectionState:
        mongoose.connection.readyState === 1
          ? "connected"
          : mongoose.connection.readyState === 0
          ? "disconnected"
          : "connecting",
    },
    memory: process.memoryUsage(),
    uptime: process.uptime(),
  };
}

/**
 * Mark system as ready after successful initialization
 */
function markReady() {
  healthState.isReady = true;
  healthState.mongoConnection = true;
  console.log("✅ System marked as READY");
}

/**
 * Mark system as not ready during graceful shutdown or issues
 */
function markNotReady() {
  healthState.isReady = false;
  console.log("⚠️  System marked as NOT READY");
}

/**
 * Update MongoDB connection status
 */
function updateMongoStatus(connected) {
  healthState.mongoConnection = connected;
  if (connected && !healthState.isReady) {
    markReady();
  }
}

/**
 * Track response metrics
 */
function recordResponse(success = true, responseTime = 0) {
  healthState.responseTime = responseTime;
  healthState.lastCheck = Date.now();

  if (success) {
    healthState.successCount++;
  } else {
    healthState.errorCount++;
  }
}

/**
 * Reset health metrics (useful for testing)
 */
function reset() {
  healthState.isReady = false;
  healthState.isAlive = true;
  healthState.startTime = Date.now();
  healthState.mongoConnection = false;
  healthState.responseTime = 0;
  healthState.lastCheck = Date.now();
  healthState.errorCount = 0;
  healthState.successCount = 0;
}

module.exports = {
  readinessProbe,
  livenessProbe,
  getDetailedMetrics,
  markReady,
  markNotReady,
  updateMongoStatus,
  recordResponse,
  reset,
  healthState,
};
