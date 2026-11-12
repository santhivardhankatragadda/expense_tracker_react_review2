/**
 * test/setup.js
 * ------------------------------------------------------------------
 * Gives the test environment a working `window.localStorage` so the real
 * storage.js code (the same code the browser runs) is what gets tested.
 * ------------------------------------------------------------------
 */
class MemoryStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    this.map.set(key, String(value));
  }
  removeItem(key) {
    this.map.delete(key);
  }
  clear() {
    this.map.clear();
  }
  key(index) {
    return Array.from(this.map.keys())[index] ?? null;
  }
  get length() {
    return this.map.size;
  }
}

const store = new MemoryStorage();

globalThis.window = globalThis.window || {};
globalThis.window.localStorage = store;

// jsdom users will already have these; keep them in sync when present.
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = store;
}

// A minimal hash-based location for components that read the URL.
if (!globalThis.window.location) {
  globalThis.window.location = { hash: '#/login' };
}
