/**
 * authService.js  (Authentication Module – logic)
 * ------------------------------------------------------------------
 * Signup / login / logout, duplicate-email prevention, activation checks
 * and session handling. UI lives in AuthModule.jsx; this file only does
 * the data work so it is easy to explain (and easy to test).
 * ------------------------------------------------------------------
 */
import { getUsers, saveUsers, getSession, saveSession, clearSession, getUserData, saveUserData, emptyUserData } from '../../services/storage.js';
import {
  hashPassword,
  verifyPassword,
  normalizeEmail,
  validateSignup,
  validateLogin,
  makeIdSafe
} from './authHelpers.js';
import { ROLES, validateSession } from '../security/security.js';
import { makeAccount, defaultAccounts } from '../../services/finance.js';

export const SESSION_HOURS = 8;
export const DEFAULT_ADMIN = { email: 'admin@expense.com', password: 'Admin@123' };

/** Creates the built-in admin account on first run (never overwrites). */
export async function seedAdmin() {
  const users = getUsers();
  const exists = users.some((u) => u.role === ROLES.ADMIN);
  if (exists) return users;

  const hashed = await hashPassword(DEFAULT_ADMIN.password);
  const admin = {
    id: makeIdSafe('admin'),
    name: 'Administrator',
    email: DEFAULT_ADMIN.email,
    role: ROLES.ADMIN,
    status: 'active',
    password: hashed,
    createdAt: new Date().toISOString()
  };

  const next = [admin, ...users];
  saveUsers(next);
  return next;
}

/** Public view of a user record (never leaks the password hash to the UI). */
export function publicUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

/**
 * Creates a new user account.
 * Returns { ok, message, user }.
 */
export async function signup({ name, email, password, confirmPassword }) {
  const check = validateSignup({ name, email, password, confirmPassword });
  if (!check.valid) return { ok: false, message: 'Please fix the highlighted fields.', errors: check.errors };

  const cleanEmail = normalizeEmail(email);
  const users = getUsers();

  // Duplicate email prevention (case-insensitive)
  if (users.some((u) => normalizeEmail(u.email) === cleanEmail)) {
    return { ok: false, message: 'An account with this email already exists.', errors: { email: 'Email already registered.' } };
  }

  const hashed = await hashPassword(password);
  const user = {
    id: makeIdSafe('user'),
    name: String(name).trim(),
    email: cleanEmail,
    role: ROLES.USER,
    status: 'active',
    password: hashed,
    createdAt: new Date().toISOString()
  };

  saveUsers([...users, user]);

  // Give every new user a starter account so balances work immediately.
  const data = emptyUserData();
  data.accounts = defaultAccounts();
  saveUserData(user.id, data);

  return { ok: true, message: 'Account created. You can log in now.', user: publicUser(user) };
}

/**
 * Verifies credentials and stores a session.
 * Returns { ok, message, user, role }.
 */
export async function login({ email, password }) {
  const check = validateLogin({ email, password });
  if (!check.valid) return { ok: false, message: 'Please fix the highlighted fields.', errors: check.errors };

  const cleanEmail = normalizeEmail(email);
  const users = getUsers();
  const user = users.find((u) => normalizeEmail(u.email) === cleanEmail);

  // Same generic message for "no such user" and "wrong password" so the
  // form does not reveal which emails are registered.
  if (!user) return { ok: false, message: 'Invalid email or password.' };

  const ok = await verifyPassword(password, user.password);
  if (!ok) return { ok: false, message: 'Invalid email or password.' };

  if (user.status === 'inactive') {
    return { ok: false, message: 'This account is deactivated. Please contact the administrator.' };
  }

  const session = {
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    loginAt: Date.now(),
    expiresAt: Date.now() + SESSION_HOURS * 60 * 60 * 1000
  };
  saveSession(session);

  return { ok: true, message: `Welcome back, ${user.name}!`, user: publicUser(user), role: user.role };
}

export function logout() {
  clearSession();
}

/** Reads the session and re-validates it against the users list. */
export function currentSession() {
  const session = getSession();
  if (!session) return null;
  const { valid, user } = validateSession(session, getUsers());
  if (!valid) {
    clearSession();
    return null;
  }
  return { session, user: publicUser(user) };
}

/** Re-reads the signed-in user (used after an admin changes their status). */
export function getCurrentUser() {
  const info = currentSession();
  return info ? info.user : null;
}

/** New users get one starter account only if they have none at all. */
export function ensureStarterAccount(userId) {
  const data = getUserData(userId);
  if (data.accounts.length === 0) {
    data.accounts = [makeAccount({ name: 'Cash', openingBalance: 0, type: 'Cash' })];
    saveUserData(userId, data);
  }
  return data;
}
