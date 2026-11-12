/**
 * security.js  (Security Module)
 * ------------------------------------------------------------------
 * Front-end "best effort" protections for a Local-Storage-only app.
 *
 * WHAT THIS FILE DOES
 *  - Hashes passwords with the Web Crypto API (PBKDF2-SHA-256 + random
 *    salt) so the raw password is never written to Local Storage.
 *  - Validates every input before it is saved (email, password, amount...).
 *  - Provides a `sanitizeText` helper so user-provided text is rendered as
 *    text, not as HTML/script.
 *  - Provides session/role validation helpers used before any protected
 *    screen is shown.
 *
 * WHAT THIS FILE CANNOT DO (honest limitation)
 *  - Everything runs in the user's own browser. Anyone who opens DevTools
 *    can read Local Storage, edit it, or call these functions directly.
 *  - There is no server, so there is no real authentication boundary and
 *    no secret that the browser cannot see. Hashing only protects the
 *    password if a stored record is leaked; it does not make the app
 *    tamper-proof. Real security needs a backend that verifies credentials
 *    and enforces roles server-side.
 * ------------------------------------------------------------------
 */

/* ================================================================== */
/* 1. Password hashing (Web Crypto / PBKDF2)                          */
/* ================================================================== */

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH_BITS = 256;

function getCrypto() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    return globalThis.crypto;
  }
  return null;
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function randomSalt() {
  const cryptoObj = getCrypto();
  const bytes = new Uint8Array(16);
  if (cryptoObj && cryptoObj.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return toHex(bytes);
}

/**
 * Hashes a password and returns { algorithm, salt, iterations, hash }.
 * Falls back to a simple SHA-256 (still salted) when PBKDF2 is missing.
 */
export async function hashPassword(password, salt = randomSalt()) {
  const text = String(password ?? '');
  const cryptoObj = getCrypto();

  if (!cryptoObj) {
    // Very old browser / restricted environment. Not cryptographically
    // strong, but still better than storing the plain password.
    return {
      algorithm: 'fallback-sha256',
      salt,
      iterations: 0,
      hash: simpleHash(`${salt}:${text}`)
    };
  }

  const encoder = new TextEncoder();
  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    encoder.encode(text),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derived = await cryptoObj.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    KEY_LENGTH_BITS
  );

  return {
    algorithm: 'PBKDF2-SHA256',
    salt,
    iterations: PBKDF2_ITERATIONS,
    hash: toHex(derived)
  };
}

/** Compares a typed password with a stored hash record. */
export async function verifyPassword(password, record) {
  if (!record || !record.hash) return false;
  const result = await hashPassword(password, record.salt || '');
  return timingSafeEqual(result.hash, record.hash);
}

function timingSafeEqual(a, b) {
  const sa = String(a);
  const sb = String(b);
  if (sa.length !== sb.length) return false;
  let diff = 0;
  for (let i = 0; i < sa.length; i += 1) diff |= sa.charCodeAt(i) ^ sb.charCodeAt(i);
  return diff === 0;
}

/** Non-crypto checksum used only by the no-Web-Crypto fallback. */
function simpleHash(input) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
}

/* ================================================================== */
/* 2. Input validation                                                */
/* ================================================================== */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(email) {
  return EMAIL_RE.test(String(email || '').trim());
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/**
 * Password policy: 8+ characters, at least one letter and one number.
 * Returns { valid, message } so the form can show a friendly error.
 */
export function validatePassword(password) {
  const value = String(password ?? '');
  if (value.length < 8) return { valid: false, message: 'Password must be at least 8 characters long.' };
  if (!/[A-Za-z]/.test(value)) return { valid: false, message: 'Password must contain at least one letter.' };
  if (!/[0-9]/.test(value)) return { valid: false, message: 'Password must contain at least one number.' };
  return { valid: true, message: '' };
}

export function validateName(name) {
  const value = String(name || '').trim();
  if (value.length < 2) return { valid: false, message: 'Name must be at least 2 characters.' };
  if (value.length > 60) return { valid: false, message: 'Name must be under 60 characters.' };
  return { valid: true, message: '' };
}

export function validateAmount(value) {
  const n = Number(String(value).replace(/,/g, '').trim());
  if (!Number.isFinite(n)) return { valid: false, message: 'Enter a valid number.' };
  if (n <= 0) return { valid: false, message: 'Amount must be greater than zero.' };
  if (n > 100000000) return { valid: false, message: 'Amount looks too large.' };
  return { valid: true, message: '' };
}

export function validateDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) {
    return { valid: false, message: 'Choose a valid date.' };
  }
  return { valid: true, message: '' };
}

/** Full signup validation. Returns a map of field -> error message. */
export function validateSignup({ name, email, password, confirmPassword }) {
  const errors = {};
  const nameCheck = validateName(name);
  if (!nameCheck.valid) errors.name = nameCheck.message;
  if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  const passCheck = validatePassword(password);
  if (!passCheck.valid) errors.password = passCheck.message;
  if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  return { valid: Object.keys(errors).length === 0, errors };
}

/** Full login validation. */
export function validateLogin({ email, password }) {
  const errors = {};
  if (!isValidEmail(email)) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Enter your password.';
  return { valid: Object.keys(errors).length === 0, errors };
}

/* ================================================================== */
/* 3. Safe rendering                                                  */
/* ================================================================== */

/**
 * React already escapes text it renders through {value}. This helper is a
 * second layer for anything that might be inserted somewhere unsafe, and
 * it also trims/caps runaway input.
 */
export function sanitizeText(value, maxLength = 200) {
  return String(value ?? '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

/** Guards against prototype-pollution style keys when merging objects. */
export function isSafeKey(key) {
  return !['__proto__', 'constructor', 'prototype'].includes(key);
}

/* ================================================================== */
/* 4. Session & role validation                                       */
/* ================================================================== */

export const ROLES = { USER: 'user', ADMIN: 'admin' };

export function isAdminRole(role) {
  return role === ROLES.ADMIN;
}

export function isUserRole(role) {
  return role === ROLES.USER;
}

/**
 * Validates a stored session against the users list.
 * Returns { valid, reason, user } so callers can react precisely.
 */
export function validateSession(session, users, now = Date.now()) {
  if (!session || typeof session !== 'object') return { valid: false, reason: 'no-session', user: null };
  if (!session.userId) return { valid: false, reason: 'malformed', user: null };

  const user = (Array.isArray(users) ? users : []).find((u) => u && u.id === session.userId);
  if (!user) return { valid: false, reason: 'unknown-user', user: null };
  if (user.status === 'inactive') return { valid: false, reason: 'deactivated', user };
  if (session.role && session.role !== user.role) return { valid: false, reason: 'role-mismatch', user };
  if (session.expiresAt && Number(session.expiresAt) < now) return { valid: false, reason: 'expired', user };

  return { valid: true, reason: 'ok', user };
}

/**
 * Route guard used by App.jsx before rendering a screen.
 * `requiredRole` is 'user', 'admin', or null (any signed-in user).
 */
export function canAccess({ session, users, requiredRole = null }) {
  const { valid, reason, user } = validateSession(session, users);
  if (!valid) return { allowed: false, reason, user };
  if (requiredRole && user.role !== requiredRole) {
    return { allowed: false, reason: 'forbidden', user };
  }
  return { allowed: true, reason: 'ok', user };
}

/** Safe landing page for a role (prevents wrong navigation). */
export function homeRouteFor(role) {
  return isAdminRole(role) ? 'admin-dashboard' : 'user-dashboard';
}
