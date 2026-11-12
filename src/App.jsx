/**
 * App.jsx
 * ------------------------------------------------------------------
 * The main React component. It does four things:
 *   1. Seeds the built-in admin account on first run.
 *   2. Keeps the session in React state and restores it after a refresh.
 *   3. Reads the current "page" from the URL hash (#/login, #/transactions…)
 *      and renders the right module.
 *   4. Guards every protected page with the Security module, so role-based
 *      navigation cannot be bypassed by typing a URL.
 * ------------------------------------------------------------------
 */
import React, { useCallback, useEffect, useState } from 'react';
import AuthModule from './modules/auth/AuthModule.jsx';
import UserModule from './modules/user/UserModule.jsx';
import AdminModule from './modules/admin/AdminModule.jsx';
import RequireRole from './modules/security/Guards.jsx';
import { seedAdmin, logout, currentSession } from './modules/auth/authService.js';
import { getUsers } from './services/storage.js';
import { homeRouteFor, ROLES } from './modules/security/security.js';

const USER_ROUTES = ['user-dashboard', 'transactions', 'budget', 'accounts', 'recurring', 'goals', 'reports'];
const ADMIN_ROUTES = ['admin-dashboard', 'admin-users', 'admin-transactions'];
const AUTH_ROUTES = ['login', 'signup'];

/** "#/transactions" -> "transactions" (defaults to "login") */
function readRoute() {
  const raw = typeof window !== 'undefined' ? window.location.hash.replace(/^#\/?/, '') : '';
  return raw || 'login';
}

function setRoute(route) {
  if (typeof window === 'undefined') return;
  const next = `#/${route}`;
  if (window.location.hash !== next) window.location.hash = next;
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [route, setRouteState] = useState(readRoute());
  const [user, setUser] = useState(null);
  const [notice, setNotice] = useState('');

  /* ---------------------------------------------------------------- */
  /* Start-up: create the admin account once, then restore a session   */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      await seedAdmin();
      if (cancelled) return;

      const restored = currentSession();
      if (restored) {
        setUser(restored.user);
        // Send the user to their role's home page if they opened a bare URL.
        const current = readRoute();
        if (AUTH_ROUTES.includes(current)) {
          setRoute(homeRouteFor(restored.user.role));
          setRouteState(homeRouteFor(restored.user.role));
        }
      }
      setBooting(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Keep route state in sync with the URL hash                        */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const onHashChange = () => setRouteState(readRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((next) => {
    setRoute(next);
    setRouteState(next);
  }, []);

  /* ---------------------------------------------------------------- */
  /* Auth actions                                                      */
  /* ---------------------------------------------------------------- */
  const handleAuthed = (signedInUser) => {
    setUser(signedInUser);
    navigate(homeRouteFor(signedInUser.role));
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setRoute('login');
    setRouteState('login');
  };

  /** Called by the security guard when a session is stale or invalid. */
  const handleInvalidSession = (reason) => {
    if (reason === 'deactivated') {
      setNotice('Your account was deactivated by the administrator, so you were logged out.');
    }
    logout();
    setUser(null);
    setRoute('login');
    setRouteState('login');
  };

  /* ---------------------------------------------------------------- */
  /* Boot screen                                                       */
  /* ---------------------------------------------------------------- */
  if (booting) {
    return (
      <div className="boot">
        <div className="boot-inner">
          <div className="boot-spinner" />
          <p>Starting Expense Tracker…</p>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Not signed in                                                     */
  /* ---------------------------------------------------------------- */
  if (!user) {
    if (USER_ROUTES.includes(route) || ADMIN_ROUTES.includes(route)) {
      return (
        <AuthModule
          mode="login"
          onAuthed={handleAuthed}
          onSwitch={(m) => navigate(m === 'signup' ? 'signup' : 'login')}
        />
      );
    }

    return (
      <>
        {notice && (
          <div className="notice-bar" role="status">
            {notice}
            <button className="icon-btn" onClick={() => setNotice('')} aria-label="Dismiss">×</button>
          </div>
        )}
        <AuthModule
          mode={route === 'signup' ? 'signup' : 'login'}
          onAuthed={handleAuthed}
          onSwitch={(m) => navigate(m === 'signup' ? 'signup' : 'login')}
        />
      </>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Signed in                                                         */
  /* ---------------------------------------------------------------- */
  const users = getUsers();
  const isAdmin = user.role === ROLES.ADMIN;

  // An admin who lands on a user page (or vice versa) is corrected instead
  // of being shown the wrong module.
  if (isAdmin && USER_ROUTES.includes(route)) {
    navigate('admin-dashboard');
  }
  if (!isAdmin && ADMIN_ROUTES.includes(route)) {
    navigate('user-dashboard');
  }

  if (isAdmin) {
    return (
      <RequireRole session={currentSession()?.session} users={users} role={ROLES.ADMIN} onInvalid={handleInvalidSession}>
        <AdminModule
          user={user}
          route={ADMIN_ROUTES.includes(route) ? route : 'admin-dashboard'}
          onNavigate={navigate}
          onLogout={handleLogout}
        />
      </RequireRole>
    );
  }

  return (
    <RequireRole session={currentSession()?.session} users={users} role={ROLES.USER} onInvalid={handleInvalidSession}>
      <UserModule
        user={user}
        route={USER_ROUTES.includes(route) ? route : 'user-dashboard'}
        onNavigate={navigate}
        onLogout={handleLogout}
      />
    </RequireRole>
  );
}
