/**
 * storage.js
 * ------------------------------------------------------------------
 * Every Local Storage operation in the project goes through this file.
 *
 * Why a wrapper?
 *  - JSON.parse can throw on corrupted data. If that happens the whole
 *    app would crash on load, so we always parse inside try/catch.
 *  - Tests run in Node.js where `localStorage` does not exist, so we fall
 *    back to an in-memory object. Nothing else in the app needs to know.
 *  - Storage keys are kept in one place so they never drift apart.
 * ------------------------------------------------------------------
 */

export const KEYS = {
  USERS: 'et_users',
  SESSION: 'et_session',
  seedFlag: 'et_seed_v2',
  userData: (userId) => `et_userdata_${userId}`
};

/* ------------------------------------------------------------------ */
/* A tiny memory fallback so the app/tests never crash without storage */
/* ------------------------------------------------------------------ */
const memoryStore = new Map();

function getStore() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // A quick write test: private-mode browsers can throw on setItem.
      const probe = '__et_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return window.localStorage;
    }
  } catch (err) {
    // fall through to memory store
  }
  return {
    getItem: (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
    setItem: (key, value) => memoryStore.set(key, String(value)),
    removeItem: (key) => memoryStore.delete(key),
    key: (index) => Array.from(memoryStore.keys())[index] ?? null,
    get length() {
      return memoryStore.size;
    }
  };
}

/* ------------------------------------------------------------------ */
/* Safe primitives                                                     */
/* ------------------------------------------------------------------ */

/** Read + parse a key. Returns `fallback` when missing or corrupted. */
export function readJSON(key, fallback = null) {
  try {
    const raw = getStore().getItem(key);
    if (raw === null || raw === undefined || raw === '') return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null || parsed === undefined ? fallback : parsed;
  } catch (err) {
    console.warn(`storage: could not read "${key}" – using fallback.`, err);
    return fallback;
  }
}

/** Stringify + write a key. Returns true on success. */
export function writeJSON(key, value) {
  try {
    getStore().setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    // Most common cause: quota exceeded
    console.error(`storage: could not write "${key}".`, err);
    return false;
  }
}

export function removeKey(key) {
  try {
    getStore().removeItem(key);
    return true;
  } catch (err) {
    console.error(`storage: could not remove "${key}".`, err);
    return false;
  }
}

export function storageAvailable() {
  try {
    const probe = '__et_probe__';
    getStore().setItem(probe, '1');
    getStore().removeItem(probe);
    return true;
  } catch (err) {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Users & session                                                     */
/* ------------------------------------------------------------------ */

export function getUsers() {
  const users = readJSON(KEYS.USERS, []);
  return Array.isArray(users) ? users : [];
}

export function saveUsers(users) {
  return writeJSON(KEYS.USERS, Array.isArray(users) ? users : []);
}

export function getSession() {
  const session = readJSON(KEYS.SESSION, null);
  if (!session || typeof session !== 'object') return null;
  return session;
}

export function saveSession(session) {
  return writeJSON(KEYS.SESSION, session);
}

export function clearSession() {
  return removeKey(KEYS.SESSION);
}

/* ------------------------------------------------------------------ */
/* Per-user financial data                                             */
/* ------------------------------------------------------------------ */

/** Shape of a brand-new user's data set. */
export function emptyUserData() {
  return {
    transactions: [],
    accounts: [],
    budget: { monthlyLimit: 0 },
    goals: [],
    recurring: []
  };
}

/**
 * Reads one user's financial data. Missing/invalid sections are repaired
 * with empty values so the UI can never be handed `undefined`.
 */
export function getUserData(userId) {
  if (!userId) return emptyUserData();
  const raw = readJSON(KEYS.userData(userId), null);
  const base = emptyUserData();
  if (!raw || typeof raw !== 'object') return base;

  return {
    transactions: Array.isArray(raw.transactions) ? raw.transactions : base.transactions,
    accounts: Array.isArray(raw.accounts) ? raw.accounts : base.accounts,
    budget:
      raw.budget && typeof raw.budget === 'object'
        ? { monthlyLimit: Number(raw.budget.monthlyLimit) || 0 }
        : base.budget,
    goals: Array.isArray(raw.goals) ? raw.goals : base.goals,
    recurring: Array.isArray(raw.recurring) ? raw.recurring : base.recurring
  };
}

export function saveUserData(userId, data) {
  if (!userId) return false;
  return writeJSON(KEYS.userData(userId), data);
}

/** Used by the admin module. Never used to delete data silently. */
export function removeUserData(userId) {
  if (!userId) return false;
  return removeKey(KEYS.userData(userId));
}

/* ------------------------------------------------------------------ */
/* Admin aggregate view (read-only helper)                             */
/* ------------------------------------------------------------------ */

export function getAllUserDataSnapshot() {
  return getUsers().map((user) => ({
    user,
    data: getUserData(user.id)
  }));
}
