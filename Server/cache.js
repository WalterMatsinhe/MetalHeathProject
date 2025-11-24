/**
 * ============================================
 * IN-MEMORY CACHE MODULE
 * ============================================
 * Provides Redis-like caching for frequently accessed data
 * Reduces database load and improves response times
 */

class Cache {
  constructor() {
    this.data = new Map();
    this.ttl = new Map(); // Time-to-live for each key
  }

  /**
   * Set a value in cache with optional TTL (in milliseconds)
   */
  set(key, value, ttlMs = null) {
    this.data.set(key, value);

    if (ttlMs) {
      // Clear existing timeout if any
      if (this.ttl.has(key)) {
        clearTimeout(this.ttl.get(key).timeoutId);
      }

      // Set new timeout to delete key
      const timeoutId = setTimeout(() => {
        this.data.delete(key);
        this.ttl.delete(key);
        console.log(`⏰ Cache expired: ${key}`);
      }, ttlMs);

      this.ttl.set(key, { timeoutId, expiresAt: Date.now() + ttlMs });
    }
  }

  /**
   * Get a value from cache
   */
  get(key) {
    return this.data.get(key) || null;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key) {
    return this.data.has(key);
  }

  /**
   * Delete a key from cache
   */
  delete(key) {
    if (this.ttl.has(key)) {
      clearTimeout(this.ttl.get(key).timeoutId);
      this.ttl.delete(key);
    }
    this.data.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear() {
    for (const [key] of this.ttl.entries()) {
      clearTimeout(this.ttl.get(key).timeoutId);
    }
    this.data.clear();
    this.ttl.clear();
    console.log("🗑️  Cache cleared");
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.data.size,
      keys: Array.from(this.data.keys()),
      memory: process.memoryUsage(),
    };
  }

  /**
   * Invalidate cache by pattern (useful for updates)
   */
  invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    const keysToDelete = [];

    for (const key of this.data.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.delete(key));
    console.log(
      `🔄 Invalidated ${keysToDelete.length} cache entries matching pattern: ${pattern}`
    );
  }
}

// Create singleton instance
const cache = new Cache();

// Predefined cache keys with default TTL (5 minutes = 300000ms)
const CACHE_KEYS = {
  THERAPISTS: "therapists:all",
  THERAPISTS_AVAILABLE: "therapists:available",
  USER_PROFILE: (userId) => `user:profile:${userId}`,
  CONVERSATION: (userId, therapistId) =>
    `conversation:${userId}:${therapistId}`,
  MOOD_ENTRIES: (userId) => `mood:entries:${userId}`,
};

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached therapists or fetch and cache them
 */
async function getCachedTherapists(fetchFn) {
  const cached = cache.get(CACHE_KEYS.THERAPISTS);
  if (cached) {
    console.log("📦 Returning therapists from cache");
    return cached;
  }

  console.log("🔄 Fetching therapists from database and caching...");
  const therapists = await fetchFn();
  cache.set(CACHE_KEYS.THERAPISTS, therapists, DEFAULT_TTL);
  return therapists;
}

/**
 * Get cached user profile or fetch and cache
 */
async function getCachedUserProfile(userId, fetchFn) {
  const key = CACHE_KEYS.USER_PROFILE(userId);
  const cached = cache.get(key);
  if (cached) {
    console.log(`📦 Returning user profile from cache: ${userId}`);
    return cached;
  }

  console.log(`🔄 Fetching user profile from database: ${userId}`);
  const profile = await fetchFn();
  cache.set(key, profile, DEFAULT_TTL);
  return profile;
}

/**
 * Invalidate specific user's cached data on update
 */
function invalidateUserCache(userId) {
  cache.invalidatePattern(`user:.*:${userId}`);
}

/**
 * Invalidate therapist cache when availability changes
 */
function invalidateTherapistCache() {
  cache.delete(CACHE_KEYS.THERAPISTS);
  cache.delete(CACHE_KEYS.THERAPISTS_AVAILABLE);
  console.log("🔄 Therapist cache invalidated");
}

module.exports = {
  cache,
  CACHE_KEYS,
  DEFAULT_TTL,
  getCachedTherapists,
  getCachedUserProfile,
  invalidateUserCache,
  invalidateTherapistCache,
};
