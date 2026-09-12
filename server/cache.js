/**
 * Cache module for Concept Drift
 * In-memory LRU cache to store generated concept neighbors and graph edges.
 */

export class SimpleCache {
  constructor(maxSize = 2000) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  normalizeKey(key) {
    return String(key).trim().toLowerCase();
  }

  get(key) {
    const k = this.normalizeKey(key);
    if (!this.cache.has(k)) return null;
    const value = this.cache.get(k);
    // Refresh LRU position
    this.cache.delete(k);
    this.cache.set(k, value);
    return value;
  }

  set(key, value) {
    const k = this.normalizeKey(key);
    if (this.cache.has(k)) {
      this.cache.delete(k);
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(k, value);
  }

  has(key) {
    return this.cache.has(this.normalizeKey(key));
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

export const conceptCache = new SimpleCache(2000);
export const pathCache = new SimpleCache(500);
