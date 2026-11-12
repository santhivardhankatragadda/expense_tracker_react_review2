/**
 * auth.test.js
 * ------------------------------------------------------------------
 * Tests for the Authentication and Security modules: validation rules,
 * password hashing/verification, duplicate email prevention, session and
 * role validation.
 * Run with:  npm test
 * ------------------------------------------------------------------
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  validatePassword,
  validateSignup,
  validateLogin,
  isValidEmail,
  normalizeEmail,
  sanitizeText,
  validateSession,
  canAccess,
  homeRouteFor
} from '../src/modules/security/security.js';
import { signup, login, logout, seedAdmin, currentSession, DEFAULT_ADMIN } from '../src/modules/auth/authService.js';
import { getUsers, getSession, clearSession, KEYS } from '../src/services/storage.js';

// A clean slate before every test.
beforeEach(() => {
  clearSession();
  window.localStorage.clear();
});

describe('input validation', () => {
  it('accepts good emails and rejects bad ones', () => {
    expect(isValidEmail('student@college.edu')).toBe(true);
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('no-at-sign.com')).toBe(false);
    expect(isValidEmail('two@@dots.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('normalises email casing and spaces', () => {
    expect(normalizeEmail('  Student@College.EDU ')).toBe('student@college.edu');
  });

  it('enforces the password policy', () => {
    expect(validatePassword('short1').valid).toBe(false);
    expect(validatePassword('onlyletters').valid).toBe(false);
    expect(validatePassword('12345678').valid).toBe(false);
    expect(validatePassword('GoodPass1').valid).toBe(true);
  });

  it('validates a complete signup form', () => {
    const bad = validateSignup({ name: 'A', email: 'x', password: 'abc', confirmPassword: 'abcd' });
    expect(bad.valid).toBe(false);
    expect(Object.keys(bad.errors)).toEqual(['name', 'email', 'password', 'confirmPassword']);

    const good = validateSignup({ name: 'Asha Rao', email: 'asha@college.edu', password: 'Passw0rd1', confirmPassword: 'Passw0rd1' });
    expect(good.valid).toBe(true);
  });

  it('validates a login form', () => {
    expect(validateLogin({ email: 'bad', password: '' }).valid).toBe(false);
    expect(validateLogin({ email: 'a@b.com', password: 'x' }).valid).toBe(true);
  });

  it('strips angle brackets from user text', () => {
    expect(sanitizeText('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
    expect(sanitizeText('  Coffee  ')).toBe('Coffee');
  });
});

describe('password hashing', () => {
  it('hashes with PBKDF2 and a random salt, never storing the raw password', async () => {
    const a = await hashPassword('MySecret123');
    const b = await hashPassword('MySecret123');
    expect(a.algorithm).toBe('PBKDF2-SHA256');
    expect(a.hash).not.toContain('MySecret123');
    expect(a.hash).toHaveLength(64); // 256 bits as hex
    expect(a.salt).not.toBe(b.salt); // different salt every time
    expect(a.hash).not.toBe(b.hash); // so the same password hashes differently
  });

  it('verifies the correct password and rejects a wrong one', async () => {
    const record = await hashPassword('MySecret123');
    expect(await verifyPassword('MySecret123', record)).toBe(true);
    expect(await verifyPassword('MySecret124', record)).toBe(false);
    expect(await verifyPassword('MySecret123', null)).toBe(false);
  });
});

describe('signup, login and logout', () => {
  it('creates a user and blocks a duplicate email', async () => {
    const first = await signup({ name: 'Asha Rao', email: 'asha@college.edu', password: 'Passw0rd1', confirmPassword: 'Passw0rd1' });
    expect(first.ok).toBe(true);

    // Same email, different case and padding -> still a duplicate.
    const dup = await signup({ name: 'Other', email: '  ASHA@college.edu ', password: 'Passw0rd1', confirmPassword: 'Passw0rd1' });
    expect(dup.ok).toBe(false);
    expect(dup.message).toMatch(/already exists/i);
    expect(getUsers().filter((u) => u.role === 'user')).toHaveLength(1);
  });

  it('rejects a signup with mismatched passwords', async () => {
    const res = await signup({ name: 'Bob Lee', email: 'bob@college.edu', password: 'Passw0rd1', confirmPassword: 'Other1234' });
    expect(res.ok).toBe(false);
    expect(res.errors.confirmPassword).toMatch(/match/i);
  });

  it('logs in with correct credentials and rejects wrong ones', async () => {
    await signup({ name: 'Asha Rao', email: 'asha@college.edu', password: 'Passw0rd1', confirmPassword: 'Passw0rd1' });

    const bad = await login({ email: 'asha@college.edu', password: 'WrongPass1' });
    expect(bad.ok).toBe(false);
    expect(bad.message).toBe('Invalid email or password.');

    const unknown = await login({ email: 'nobody@college.edu', password: 'Passw0rd1' });
    expect(unknown.ok).toBe(false);
    expect(unknown.message).toBe('Invalid email or password.');

    const good = await login({ email: 'asha@college.edu', password: 'Passw0rd1' });
    expect(good.ok).toBe(true);
    expect(good.role).toBe('user');
    expect(getSession()).toBeTruthy();
  });

  it('never returns the password hash in the public user object', async () => {
    const res = await signup({ name: 'Cara', email: 'cara@college.edu', password: 'Passw0rd1', confirmPassword: 'Passw0rd1' });
    expect(res.user.password).toBeUndefined();
    expect(res.user.email).toBe('cara@college.edu');
  });

  it('stores the password as a hash, not as plain text', async () => {
    await signup({ name: 'Dan', email: 'dan@college.edu', password: 'Passw0rd1', confirmPassword: 'Passw0rd1' });
    const stored = JSON.stringify(getUsers());
    expect(stored).not.toContain('Passw0rd1');
    expect(stored).toContain('PBKDF2');
  });

  it('clears the session on logout', async () => {
    await signup({ name: 'Eve', email: 'eve@college.edu', password: 'Passw0rd1', confirmPassword: 'Passw0rd1' });
    await login({ email: 'eve@college.edu', password: 'Passw0rd1' });
    expect(currentSession()).toBeTruthy();
    logout();
    expect(getSession()).toBeNull();
    expect(currentSession()).toBeNull();
  });

  it('blocks a deactivated user from logging in', async () => {
    const created = await signup({ name: 'Fay', email: 'fay@college.edu', password: 'Passw0rd1', confirmPassword: 'Passw0rd1' });
    const users = getUsers().map((u) => (u.id === created.user.id ? { ...u, status: 'inactive' } : u));
    window.localStorage.setItem(KEYS.USERS, JSON.stringify(users));

    const res = await login({ email: 'fay@college.edu', password: 'Passw0rd1' });
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/deactivated/i);
  });
});

describe('admin seeding and roles', () => {
  it('creates the built-in admin account once', async () => {
    await seedAdmin();
    const admins = getUsers().filter((u) => u.role === 'admin');
    expect(admins).toHaveLength(1);
    expect(admins[0].email).toBe(DEFAULT_ADMIN.email);

    await seedAdmin(); // second call must not duplicate
    expect(getUsers().filter((u) => u.role === 'admin')).toHaveLength(1);
  });

  it('logs the admin in and assigns the admin role', async () => {
    await seedAdmin();
    const res = await login({ email: DEFAULT_ADMIN.email, password: DEFAULT_ADMIN.password });
    expect(res.ok).toBe(true);
    expect(res.role).toBe('admin');
  });

  it('sends each role to its own home page', () => {
    expect(homeRouteFor('admin')).toBe('admin-dashboard');
    expect(homeRouteFor('user')).toBe('user-dashboard');
  });
});

describe('session and role guards', () => {
  const users = [
    { id: 'u1', email: 'u@x.com', role: 'user', status: 'active' },
    { id: 'a1', email: 'a@x.com', role: 'admin', status: 'active' },
    { id: 'u2', email: 'off@x.com', role: 'user', status: 'inactive' }
  ];

  it('rejects a missing or malformed session', () => {
    expect(canAccess({ session: null, users }).allowed).toBe(false);
    expect(validateSession({}, users).reason).toBe('malformed');
    expect(validateSession({ userId: 'nope' }, users).reason).toBe('unknown-user');
  });

  it('rejects an expired session', () => {
    const session = { userId: 'u1', role: 'user', expiresAt: Date.now() - 1000 };
    expect(validateSession(session, users).reason).toBe('expired');
  });

  it('rejects a deactivated user', () => {
    const session = { userId: 'u2', role: 'user' };
    expect(validateSession(session, users).reason).toBe('deactivated');
  });

  it('rejects a role mismatch (tampered session)', () => {
    const session = { userId: 'u1', role: 'admin' };
    expect(validateSession(session, users).reason).toBe('role-mismatch');
  });

  it('allows a user page for a user and blocks admin pages', () => {
    const session = { userId: 'u1', role: 'user' };
    expect(canAccess({ session, users, requiredRole: 'user' }).allowed).toBe(true);
    expect(canAccess({ session, users, requiredRole: 'admin' }).allowed).toBe(false);
    expect(canAccess({ session, users, requiredRole: 'admin' }).reason).toBe('forbidden');
  });

  it('allows the admin module only for the admin role', () => {
    const adminSession = { userId: 'a1', role: 'admin' };
    expect(canAccess({ session: adminSession, users, requiredRole: 'admin' }).allowed).toBe(true);
    expect(canAccess({ session: adminSession, users, requiredRole: 'user' }).allowed).toBe(false);
  });
});
