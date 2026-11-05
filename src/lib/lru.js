// Bounded cache, least-recently-used out first, with an optional time-to-live.
// A Map keeps insertion order, so re-inserting on every hit makes the first key the least used:
// get / set / evict are all O(1), and memory never exceeds `limit` entries.
export class LruCache {
  constructor(limit, ttlMs = Infinity, now = Date.now) {
    this.limit = limit;
    this.ttlMs = ttlMs;
    this.now = now;
    this.map = new Map(); // key -> { value, at }
  }

  get(key) {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    this.map.delete(key);
    if (this.now() - hit.at > this.ttlMs) return undefined; // expired: drop it
    this.map.set(key, hit); // most recently used goes to the back
    return hit.value;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  set(key, value) {
    this.map.delete(key);
    this.map.set(key, { value, at: this.now() });
    if (this.map.size > this.limit) this.map.delete(this.map.keys().next().value);
    return this;
  }

  delete(key) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }

  get size() {
    return this.map.size;
  }
}
