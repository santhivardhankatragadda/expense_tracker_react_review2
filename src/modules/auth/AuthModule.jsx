/**
 * AuthModule.jsx  (Authentication Module – UI)
 * ------------------------------------------------------------------
 * Login and Signup screens with:
 *  - inline validation with clear messages
 *  - duplicate email prevention
 *  - password visibility toggle
 *  - role-based redirect after login (user -> dashboard, admin -> admin)
 * ------------------------------------------------------------------
 */
import React, { useState } from 'react';
import { Brand, Icon } from '../../components/Shared.jsx';
import { signup, login } from './authService.js';
import { validateSignup, validateLogin } from '../security/security.js';

const DEMO_HINT = { email: 'admin@expense.com', password: 'Admin@123' };

export default function AuthModule({ mode, onAuthed, onSwitch }) {
  const isLogin = mode !== 'signup';
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setMessage('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');

    // Instant client-side validation before any hashing work.
    const check = isLogin
      ? validateLogin({ email: form.email, password: form.password })
      : validateSignup(form);
    if (!check.valid) {
      setErrors(check.errors);
      return;
    }

    setBusy(true);
    try {
      if (isLogin) {
        const result = await login({ email: form.email, password: form.password });
        if (!result.ok) {
          setMessage(result.message);
          if (result.errors) setErrors(result.errors);
          return;
        }
        onAuthed(result.user);
      } else {
        const result = await signup(form);
        if (!result.ok) {
          setMessage(result.message);
          if (result.errors) setErrors(result.errors);
          return;
        }
        // Sign the new user in straight away.
        const loginResult = await login({ email: form.email, password: form.password });
        if (loginResult.ok) onAuthed(loginResult.user);
        else onSwitch('login');
      }
    } catch (err) {
      setMessage('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function fillDemo() {
    setForm({ ...form, email: DEMO_HINT.email, password: DEMO_HINT.password });
    setErrors({});
    setMessage('');
  }

  return (
    <div className="auth-wrap">
      <div className="auth-split">
        <aside className="auth-hero">
          <Brand />
          <h1>Take control of every rupee.</h1>
          <p>
            Track income and expenses, set monthly budgets, manage multiple accounts, automate
            recurring bills and save towards goals — all in one place.
          </p>
          <ul className="hero-list">
            <li><Icon name="check" size={15} /> Automatic balance and budget recalculation</li>
            <li><Icon name="check" size={15} /> Charts, reports and CSV export</li>
            <li><Icon name="check" size={15} /> Separate admin module with user management</li>
            <li><Icon name="check" size={15} /> Works offline — data stays in your browser</li>
          </ul>
        </aside>

        <div className="auth-card">
          <div className="auth-card-head">
            <h2 className="auth-title">{isLogin ? 'Welcome back' : 'Create your account'}</h2>
            <p className="auth-sub">
              {isLogin ? 'Log in to see your dashboard.' : 'Sign up free — it takes a few seconds.'}
            </p>
          </div>

          {message && (
            <p className="alert alert-danger">
              <Icon name="warning" size={16} /> {message}
            </p>
          )}

          <form className="stack-sm" onSubmit={handleSubmit} noValidate>
            {!isLogin && (
              <label className="field">
                <span className="field-label">Full name</span>
                <input
                  className={`input ${errors.name ? 'input-error' : ''}`}
                  type="text"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
                {errors.name && <span className="field-error">{errors.name}</span>}
              </label>
            )}

            <label className="field">
              <span className="field-label">Email address</span>
              <input
                className={`input ${errors.email ? 'input-error' : ''}`}
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </label>

            <label className="field">
              <span className="field-label">Password</span>
              <div className="input-with-btn">
                <input
                  className={`input ${errors.password ? 'input-error' : ''}`}
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="••••••••"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button type="button" className="icon-btn inside" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={17} />
                </button>
              </div>
              {errors.password ? (
                <span className="field-error">{errors.password}</span>
              ) : (
                !isLogin && <span className="field-hint">At least 8 characters, with a letter and a number.</span>
              )}
            </label>

            {!isLogin && (
              <label className="field">
                <span className="field-label">Confirm password</span>
                <div className="input-with-btn">
                  <input
                    className={`input ${errors.confirmPassword ? 'input-error' : ''}`}
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(e) => update('confirmPassword', e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />
                  <button type="button" className="icon-btn inside" onClick={() => setShowConfirm((s) => !s)} aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                    <Icon name={showConfirm ? 'eyeOff' : 'eye'} size={17} />
                  </button>
                </div>
                {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
              </label>
            )}

            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? 'Please wait…' : isLogin ? 'Log in' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch">
            {isLogin ? "Don't have an account? " : 'Already registered? '}
            <button type="button" className="link-btn" onClick={() => onSwitch(isLogin ? 'signup' : 'login')}>
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>

          {isLogin && (
            <div className="demo-box">
              <div className="demo-head"><Icon name="shield" size={14} /> Demo admin access</div>
              <div className="demo-row"><span>Email</span><code>{DEMO_HINT.email}</code></div>
              <div className="demo-row"><span>Password</span><code>{DEMO_HINT.password}</code></div>
              <button type="button" className="btn btn-ghost btn-sm btn-block" onClick={fillDemo}>
                Fill admin credentials
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
