/**
 * Guards.jsx  (Security Module – UI layer)
 * ------------------------------------------------------------------
 * Small wrapper components so no screen can be reached accidentally.
 *  - <RequireSession> blocks everything until a valid session exists.
 *  - <RequireRole role="admin"> blocks users from admin screens and
 *    admins from user screens.
 * These are convenience guards, not hard security: the data is local.
 * ------------------------------------------------------------------
 */
import React from 'react';
import { canAccess } from './security.js';

export function AccessDenied({ message }) {
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h2 className="auth-title">Access denied</h2>
        <p className="auth-sub">{message || 'You do not have permission to view this page.'}</p>
        <a className="btn btn-primary btn-block" href="#/login">
          Back to login
        </a>
      </div>
    </div>
  );
}

/**
 * Props:
 *  - session, users : current auth state
 *  - role           : 'user' | 'admin' | null
 *  - onInvalid(reason) : lets App clear a stale session
 *  - children
 */
export default function RequireRole({ session, users, role = null, onInvalid, children }) {
  const result = canAccess({ session, users, requiredRole: role });

  if (!result.allowed) {
    if (['no-session', 'expired', 'deactivated', 'unknown-user', 'role-mismatch'].includes(result.reason)) {
      if (typeof onInvalid === 'function') onInvalid(result.reason, result.user);
    }
    return (
      <AccessDenied
        message={
          result.reason === 'deactivated'
            ? 'This account has been deactivated by the administrator.'
            : result.reason === 'forbidden'
            ? `This page requires the ${role} role.`
            : 'Your session is no longer valid. Please log in again.'
        }
      />
    );
  }

  return <>{children}</>;
}
