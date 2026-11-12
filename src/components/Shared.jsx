/**
 * Shared.jsx
 * ------------------------------------------------------------------
 * Reusable building blocks used by the Auth, User and Admin modules.
 * Keeping them here means the modules stay short and easy to explain:
 * a "Card" is written once, not five times.
 * ------------------------------------------------------------------
 */
import React, { useEffect } from 'react';

/* ================================================================== */
/* Icons – inline SVG so the app needs no icon library                */
/* ================================================================== */

const ICON_PATHS = {
  dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  wallet: 'M21 7H5a2 2 0 0 1 0-4h14v4m0 0a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5m16 6h-4a2 2 0 0 0 0 4h4',
  transactions: 'M4 7h13l-3-3m6 13H7l3 3M4 7v10M20 17V7',
  budget: 'M12 2a10 10 0 1 0 10 10h-10V2zm2 0v8h8a10 10 0 0 0-8-8z',
  goal: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2z',
  recurring: 'M21 12a9 9 0 1 1-3-6.7M21 4v5h-5',
  report: 'M3 20h18M7 16V9m5 7V5m5 11v-4',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm13 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14l5-5-5-5m5 5H9',
  plus: 'M12 5v14M5 12h14',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z',
  trash: 'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  eye: 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12zm11 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M17.9 17.9A10.7 10.7 0 0 1 12 19c-7 0-11-7-11-7a18.5 18.5 0 0 1 5.1-5.9m3-1A10.7 10.7 0 0 1 12 5c7 0 11 7 11 7a18.5 18.5 0 0 1-2.2 3.2M1 1l22 22',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  menu: 'M3 6h18M3 12h18M3 18h18',
  close: 'M18 6L6 18M6 6l12 12',
  check: 'M20 6L9 17l-5-5',
  warning: 'M12 9v4m0 4h.01M10.3 3.9L2.4 17a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2l-4.35-4.35',
  lock: 'M5 11h14v10H5V11zm3 0V7a4 4 0 0 1 8 0v4',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  arrowDown: 'M12 5v14M19 12l-7 7-7-7',
  bank: 'M3 21h18M4 10h16M5 10V6l7-3 7 3v4M9 21v-6h6v6',
  spinner: 'M12 2v4m0 12v4M2 12h4m12 0h4M5 5l3 3m8 8l3 3M5 19l3-3m8-8l3-3'
};

export function Icon({ name, size = 18, className = '' }) {
  const path = ICON_PATHS[name] || ICON_PATHS.dashboard;
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

/* ================================================================== */
/* Brand                                                              */
/* ================================================================== */

export function Brand({ compact = false }) {
  return (
    <div className="brand">
      <span className="brand-mark">
        <Icon name="wallet" size={20} />
      </span>
      {!compact && (
        <span className="brand-text">
          Expense<span className="brand-accent">Tracker</span>
        </span>
      )}
    </div>
  );
}

/* ================================================================== */
/* Layout: sidebar + topbar                                           */
/* ================================================================== */

export function Sidebar({ items, active, onNavigate, role, userName, onLogout, open, onClose }) {
  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-head">
          <Brand />
          <button className="icon-btn sidebar-close" onClick={onClose} aria-label="Close menu">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="sidebar-role">
          <span className={`pill pill-${role === 'admin' ? 'violet' : 'teal'}`}>
            {role === 'admin' ? 'Admin Module' : 'User Module'}
          </span>
        </div>

        <nav className="sidebar-nav">
          {items.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${active === item.key ? 'active' : ''}`}
              onClick={() => {
                onNavigate(item.key);
                if (onClose) onClose();
              }}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-user">
            <span className="avatar">{(userName || 'U').charAt(0).toUpperCase()}</span>
            <div className="sidebar-user-meta">
              <strong>{userName || 'User'}</strong>
              <small>{role === 'admin' ? 'Administrator' : 'Member'}</small>
            </div>
          </div>
          <button className="btn btn-ghost btn-block" onClick={onLogout}>
            <Icon name="logout" size={16} /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}

export function Topbar({ title, subtitle, onMenu, right }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Open menu">
          <Icon name="menu" size={20} />
        </button>
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-sub">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="topbar-right">{right}</div>}
    </header>
  );
}

/* ================================================================== */
/* Cards & stats                                                      */
/* ================================================================== */

export function Card({ title, subtitle, actions, children, className = '', padded = true }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          <div>
            {title && <h2 className="card-title">{title}</h2>}
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className={padded ? 'card-body' : ''}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, tone = 'default', icon }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {icon && (
          <span className="stat-icon">
            <Icon name={icon} size={16} />
          </span>
        )}
      </div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export function Badge({ children, tone = 'gray' }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function EmptyState({ icon = 'wallet', title, message, action }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={26} />
      </span>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function ProgressBar({ percent = 0, tone = 'teal', label }) {
  const safe = Math.max(0, Math.min(Number(percent) || 0, 100));
  return (
    <div className="progress-wrap">
      {label && (
        <div className="progress-label">
          <span>{label}</span>
          <strong>{Math.round(Number(percent) || 0)}%</strong>
        </div>
      )}
      <div className="progress">
        <div className={`progress-fill tone-${tone}`} style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}

/* ================================================================== */
/* Form fields                                                        */
/* ================================================================== */

export function Field({ label, error, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function PasswordField({ label = 'Password', value, onChange, error, show, onToggle, placeholder = '••••••••', autoComplete = 'current-password' }) {
  return (
    <Field label={label} error={error}>
      <div className="input-with-btn">
        <input
          className={`input ${error ? 'input-error' : ''}`}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button type="button" className="icon-btn inside" onClick={onToggle} aria-label={show ? 'Hide password' : 'Show password'}>
          <Icon name={show ? 'eyeOff' : 'eye'} size={17} />
        </button>
      </div>
    </Field>
  );
}

/* ================================================================== */
/* Modal & confirm dialog                                             */
/* ================================================================== */

export function Modal({ title, subtitle, onClose, children, footer, wide = false }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <h3 className="modal-title">{title}</h3>
            {subtitle && <p className="modal-sub">{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title = 'Are you sure?', message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>{confirmLabel}</button>
        </>
      }
    >
      <p className="confirm-text">{message}</p>
    </Modal>
  );
}

/* ================================================================== */
/* Toasts                                                             */
/* ================================================================== */

export function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type || 'info'}`}>
          <span className="toast-icon">
            <Icon name={t.type === 'error' ? 'warning' : t.type === 'success' ? 'check' : 'shield'} size={16} />
          </span>
          <span className="toast-msg">{t.message}</span>
          <button className="icon-btn" onClick={() => onDismiss(t.id)} aria-label="Dismiss">
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/* Charts – plain SVG, no chart library needed                        */
/* ================================================================== */

export function BarChart({ data = [], keyA = 'income', keyB = 'expenses', labels = ['Income', 'Expenses'] }) {
  if (!data.length) {
    return <EmptyState icon="report" title="No chart data yet" message="Add a few transactions to see this chart." />;
  }

  const max = Math.max(
    1,
    ...data.map((d) => Math.max(Number(d[keyA]) || 0, Number(d[keyB]) || 0))
  );
  const barW = 26;
  const gap = 8;
  const groupW = Math.max(90, barW * 2 + gap + 50);
  const width = Math.max(340, data.length * groupW + 40);
  const height = 210;
  const plotH = 155;

  return (
    <div className="chart-scroll">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Income versus expenses chart"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1="30"
            x2={width - 10}
            y1={20 + plotH * f}
            y2={20 + plotH * f}
            stroke="#e6ecf3"
            strokeWidth="1"
          />
        ))}
        {data.map((d, i) => {
          const x = 40 + i * groupW;
          const hA = (Number(d[keyA]) || 0) / max * plotH;
          const hB = (Number(d[keyB]) || 0) / max * plotH;
          return (
            <g key={d.month || i}>
              <rect x={x} y={20 + plotH - hA} width={barW} height={Math.max(hA, 1)} rx="4" fill="#0d9488" />
              <rect x={x + barW + 4} y={20 + plotH - hB} width={barW} height={Math.max(hB, 1)} rx="4" fill="#f97316" />
              <text x={x + barW} y={height - 12} textAnchor="middle" fontSize="11" fill="#64748b">
                {shortMonth(d.label || d.month)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="chart-legend">
        <span><i className="dot" style={{ background: '#0d9488' }} /> {labels[0]}</span>
        <span><i className="dot" style={{ background: '#f97316' }} /> {labels[1]}</span>
      </div>
    </div>
  );
}

const PIE_COLORS = ['#0d9488', '#f97316', '#6366f1', '#ec4899', '#eab308', '#14b8a6', '#8b5cf6', '#ef4444', '#22c55e', '#3b82f6'];

export function DonutChart({ data = [], valueKey = 'amount', labelKey = 'category', centerLabel = 'Total', centerValue = '' }) {
  const items = (data || []).filter((d) => Number(d[valueKey]) > 0);
  if (!items.length) {
    return <EmptyState icon="report" title="Nothing to show yet" message="Category data will appear here." />;
  }

  const total = items.reduce((s, d) => s + Number(d[valueKey]), 0);
  const radius = 62;
  const stroke = 26;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="donut-wrap">
      <svg width="170" height="170" viewBox="0 0 170 170" role="img" aria-label="Spending distribution chart">
        <circle cx="85" cy="85" r={radius} fill="none" stroke="#eef2f7" strokeWidth={stroke} />
        {items.map((d, i) => {
          const fraction = Number(d[valueKey]) / total;
          const dash = fraction * circumference;
          const el = (
            <circle
              key={d[labelKey] || i}
              cx="85"
              cy="85"
              r={radius}
              fill="none"
              stroke={PIE_COLORS[i % PIE_COLORS.length]}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 85 85)"
            />
          );
          offset += dash;
          return el;
        })}
        <text x="85" y="80" textAnchor="middle" fontSize="11" fill="#64748b">{centerLabel}</text>
        <text x="85" y="98" textAnchor="middle" fontSize="16" fontWeight="700" fill="#0f172a">{centerValue}</text>
      </svg>
      <ul className="donut-legend">
        {items.map((d, i) => (
          <li key={d[labelKey] || i}>
            <i className="dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
            <span className="donut-name">{d[labelKey]}</span>
            <span className="donut-pct">{Math.round(d.percent || (Number(d[valueKey]) / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function shortMonth(label) {
  if (!label) return '';
  const [name, year] = String(label).split(' ');
  return `${String(name).slice(0, 3)}${year ? ` ${String(year).slice(2)}` : ''}`;
}

/* ================================================================== */
/* CSV export                                                         */
/* ================================================================== */

/**
 * Turns rows into a CSV file and downloads it.
 * Values starting with = + - @ are prefixed with ' to stop spreadsheet
 * formula injection, and quotes are escaped.
 */
export function exportCSV(filename, rows) {
  const safeRows = (rows || []).map((row) =>
    row.map((cell) => {
      const value = cell === null || cell === undefined ? '' : String(cell);
      const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;
      return `"${guarded.replace(/"/g, '""')}"`;
    })
  );
  const csv = safeRows.map((r) => r.join(',')).join('\r\n');

  // BOM keeps ₹ and other UTF-8 characters correct in Excel.
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return csv;
}
