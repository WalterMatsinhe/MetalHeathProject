/**
 * Logger Utility
 * Controls logging based on NODE_ENV
 * Prevents sensitive info leakage in production
 */

const isDevelopment = process.env.NODE_ENV === "development";

const logger = {
  /**
   * Log info messages (only in development)
   */
  info: (message, data = null) => {
    if (isDevelopment) {
      console.log(`ℹ️  ${message}`, data || "");
    }
  },

  /**
   * Log success messages (always shown)
   */
  success: (message, data = null) => {
    console.log(`✅ ${message}`, data || "");
  },

  /**
   * Log warnings (always shown)
   */
  warn: (message, data = null) => {
    console.warn(`⚠️  ${message}`, data || "");
  },

  /**
   * Log errors (always shown)
   */
  error: (message, data = null) => {
    console.error(`❌ ${message}`, data || "");
  },

  /**
   * Log debug info (only in development, minimal output)
   */
  debug: (message, data = null) => {
    if (isDevelopment && process.env.DEBUG === "true") {
      console.debug(`🐛 ${message}`, data || "");
    }
  },

  /**
   * Display startup banner with formatted information
   */
  displayStartupBanner: (config) => {
    console.clear();
    console.log("\n" + "═".repeat(60));
    console.log("  🚀 MENTAL HEALTH PLATFORM - SERVER STARTED");
    console.log("═".repeat(60));
    console.log(`\n📊 Server Configuration:`);
    console.log(`   Port: ${config.port}`);
    console.log(`   Environment: ${config.env || "development"}`);
    console.log(
      `   Database: ${config.db ? "✅ Connected" : "❌ Disconnected"}`
    );
    console.log(`\n📍 Access Points:`);
    console.log(
      `   🌐 Application: \x1b[34mhttp://localhost:${config.port}\x1b[0m`
    );
    console.log(
      `   💬 WebSocket: \x1b[34mws://localhost:${config.port}\x1b[0m`
    );
    console.log(`\n🔍 Health Checks:`);
    console.log(
      `   📈 Metrics:   \x1b[34mhttp://localhost:${config.port}/health/metrics\x1b[0m`
    );
    console.log(
      `   ✓  Readiness: \x1b[34mhttp://localhost:${config.port}/health/ready\x1b[0m`
    );
    console.log(
      `   ♥️  Liveness:  \x1b[34mhttp://localhost:${config.port}/health/live\x1b[0m`
    );
    if (isDevelopment) {
      console.log(`\n🐛 Debug Mode: ENABLED`);
    }
    console.log("\n" + "═".repeat(60) + "\n");
  },

  /**
   * Display connection status
   */
  displayConnectionStatus: (status) => {
    console.log(`\n📡 Connection Status:`);
    status.forEach((item) => {
      const icon = item.connected ? "✅" : "❌";
      console.log(`   ${icon} ${item.name}: ${item.message}`);
    });
  },
};

module.exports = logger;
