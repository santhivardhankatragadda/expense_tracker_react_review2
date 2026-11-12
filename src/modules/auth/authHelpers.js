/**
 * authHelpers.js
 * Small re-export bridge so the auth module and the security module stay
 * loosely coupled (the auth module only imports from this one file).
 */
export {
  hashPassword,
  verifyPassword,
  normalizeEmail,
  isValidEmail,
  validatePassword,
  validateSignup,
  validateLogin
} from '../security/security.js';

import { makeId } from '../../services/finance.js';

/** Unique id for a new user/admin record. */
export function makeIdSafe(prefix = 'user') {
  return makeId(prefix);
}
