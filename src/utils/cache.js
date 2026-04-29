/**
 * Simple in-memory TTL cache
 */
const store = {};
let lastUpdated = null;

module.exports = {
  set(key, value, ttlSeconds = 1800) {
    store[key] = {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    };
    lastUpdated = new Date().toISOString();
  },
  get(key) {
    const entry = store[key];
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      delete store[key];
      return null;
    }
    return entry.value;
  },
  has(key) {
    return this.get(key) !== null;
  },
  getLastUpdated() {
    return lastUpdated;
  },
};
