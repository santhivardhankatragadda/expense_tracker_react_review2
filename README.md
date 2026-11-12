# 💰 Expense Tracker (React)

A complete, offline-first personal finance application built with **React + Vite** and
**Local Storage**. Track income and expenses, set monthly budgets, manage multiple
accounts, automate recurring bills, save towards goals, view reports — and manage all
registered users from a completely separate **Admin Module**.

> This is the React conversion of the original multi-page Expense Tracker project.
> The original module split (Authentication · User · Admin) is preserved, with a new
> **Security Module** added on top.

---

## 1. Introduction

Expense Tracker is a single-page React application for students and anyone who wants a
simple way to record money coming in and going out. There is **no backend, no database
and no Firebase**: everything is stored in the browser's Local Storage, so the project
runs from a single `npm run dev` command in VS Code and works completely offline.

---

## 2. Problem statement

Most people do not know where their money goes because tracking it means either:
- writing everything in a notebook (slow, no totals, no charts), or
- using a complex app that needs an internet connection, an account and a subscription.

**Problem:** students need a simple tool that records income and expenses, keeps an
accurate running balance, warns them before they overspend their monthly budget, and
lets an administrator monitor all registered users — without any server setup.

---

## 3. Objectives

1. Convert the original multi-page Expense Tracker into a React application using
   functional components and hooks.
2. Keep every original feature working — not just styled.
3. Guarantee correct financial calculations everywhere (`finance.js` is the single
   source of truth for money maths).
4. Store all data in Local Storage so nothing is lost on refresh.
5. Provide separate Authentication, User, Admin and Security modules.
6. Keep the code beginner-friendly so it can be explained in a viva to faculty.

---

## 4. Modules

| Module | Folder | Responsibility |
|---|---|---|
| **Authentication** | `src/modules/auth/` | Signup, login, logout, sessions, duplicate-email prevention, activation checks |
| **User** | `src/modules/user/` | Dashboard, transactions, budget, accounts, recurring, goals, reports |
| **Admin** | `src/modules/admin/` | Application-wide statistics, user management, transaction monitoring, CSV export |
| **Security** | `src/modules/security/` | Password hashing, input validation, session/role validation, route guards |
| **Services** | `src/services/` | `finance.js` (all calculations), `storage.js` (all Local Storage access) |
| **Components** | `src/components/` | `Shared.jsx` — reusable cards, sidebar, tables, modal, charts, CSV export |

---

## 5. Features

### Authentication
- Signup with name, email and password
- Login / logout
- Inline form validation with clear messages
- **Duplicate email prevention** (case-insensitive)
- **Password visibility toggle** on every password field
- Session handling with an 8-hour expiry, restored after refresh
- **Role-based navigation**: a user always lands on the user dashboard, the admin always
  lands in the admin module
- User pages and admin pages are protected by route guards
- Account **activation / deactivation** by the administrator

### User module
| # | Feature | Where |
|---|---|---|
| 1 | User dashboard with balance, income, expense and monthly cards | `Dashboard.jsx` |
| 2 | Transaction management: add, edit, delete, search, filter, sort | `Transactions.jsx` |
| 3 | Monthly budget with utilisation %, remaining amount and warnings | `Budget.jsx` |
| 4 | Multiple accounts, each with its own balance, plus transfers | `Accounts.jsx` |
| 5 | Recurring expenses (daily / weekly / monthly / yearly) | `Recurring.jsx` |
| 6 | Savings goals with contributions and history | `Goals.jsx` |
| 7 | Financial reports | `Reports.jsx` |
| 8 | Charts: income vs expenses, category-wise, spending distribution | SVG (no chart library) |
| 9 | CSV export (transactions and full monthly report) | `Shared.jsx` → `exportCSV` |

### Admin module
- Admin dashboard with total income, total expenses, net and user statistics
- User management: view every registered user and their transaction count
- **Activate / deactivate** users (data is never deleted)
- View **all transactions across all users** with search, type and month filters
- Admin CSV export (user list + all transactions)
- Read-only monitoring: an admin never edits or deletes a user's transactions, so an
  individual user's dashboard is never changed from the admin area

### Security module
See section 11 for an honest description of what this can and cannot protect.

---

## 6. Technologies

| Technology | Use |
|---|---|
| HTML | `index.html` single page |
| CSS | `src/styles.css` (plain CSS, no framework) |
| JavaScript (ES2020+) | All logic |
| **React 18** | Functional components + hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, custom hooks) |
| **Vite 5** | Dev server and production build |
| **Vitest** | Automated tests |
| **Web Crypto API** | PBKDF2-SHA-256 password hashing |
| **Local Storage** | All persistence (no backend, no Firebase, no database) |

No routing library, no state-management library, no chart library — only React, ReactDOM,
Vite and Vitest. Navigation uses a tiny hash router inside `App.jsx` so the code stays
easy to explain.

---

## 7. Folder structure

```
Expense-Tracker/
├── index.html                     # single HTML entry point
├── package.json
├── vite.config.js
├── README.md
├── src/
│   ├── main.jsx                   # mounts React into index.html
│   ├── App.jsx                    # hash router, session restore, role guards
│   ├── styles.css                 # the whole design system
│   ├── components/
│   │   └── Shared.jsx             # Card, StatCard, Sidebar, Topbar, Modal,
│   │                              # ProgressBar, BarChart, DonutChart, exportCSV …
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── AuthModule.jsx     # login + signup screens
│   │   │   ├── authService.js     # signup / login / logout / sessions
│   │   │   └── authHelpers.js
│   │   ├── user/
│   │   │   ├── UserModule.jsx     # layout + page switching
│   │   │   ├── useUserData.js     # custom hook: load, save, all actions
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Transactions.jsx
│   │   │   ├── TransactionForm.jsx
│   │   │   ├── Budget.jsx
│   │   │   ├── Accounts.jsx
│   │   │   ├── Recurring.jsx
│   │   │   ├── Goals.jsx
│   │   │   └── Reports.jsx
│   │   ├── admin/
│   │   │   └── AdminModule.jsx    # admin dashboard, users, all transactions
│   │   └── security/
│   │       ├── security.js        # hashing, validation, session/role checks
│   │       └── Guards.jsx         # <RequireRole> wrapper
│   └── services/
│       ├── finance.js             # ALL financial calculations + tests' target
│       └── storage.js             # ALL Local Storage access (safe JSON parsing)
└── test/
    ├── setup.js                   # gives the tests a working localStorage
    ├── finance.test.js            # 46 calculation tests
    └── auth.test.js               # 24 authentication / security tests
```

> The original `login.html`, `signup.html`, `admin/*.html` and `user/*.html` pages are
> no longer needed: each one is now a React component inside its module, and one
> `index.html` hosts the whole app. The `css/` and `js/` logic now lives in
> `styles.css`, `services/` and the module folders.

---

## 8. Installation

Requires **Node.js 18+** (20 recommended) and npm.

```bash
# 1. Extract the ZIP, then open the folder in VS Code
# 2. Open a terminal (Terminal → New Terminal) and run:
npm install
```

`package-lock.json` is included, so `npm ci` also works.

---

## 9. Running the project in VS Code

```bash
npm run dev
```

Then open the URL printed in the terminal — **http://localhost:5173**

Other commands:

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run all automated tests once |
| `npm run test:watch` | Re-run tests while you edit |

---

## 10. Admin credentials

| Field | Value |
|---|---|
| Email | `admin@expense.com` |
| Password | `Admin@123` |

- The admin account is created automatically the first time the app starts.
- The login screen has a **“Fill admin credentials”** button for convenience.
- **No public signup creates another admin** — every signup creates a `user` account.
  This keeps the admin module genuinely separate.
- The admin's own row cannot be deactivated from the admin panel.

### User instructions
1. Open the app → **Sign up** with a name, a valid email and a password of at least
   8 characters containing a letter and a number.
2. You are logged in immediately with a starter **Cash** account at ₹0.
3. **Transactions** → *Add* → choose Income or Expense, amount, category, date, account.
4. **Budget** → set a monthly limit (e.g. ₹15,000) and watch the utilisation bar and
   warnings. Set `0` to remove the budget.
5. **Accounts** → add a bank/UPI account with an opening balance, and use
   *Transfer between accounts* to move money.
6. **Recurring** → add rent/subscriptions; due expenses are created automatically and
   never duplicated.
7. **Goals** → create a goal, record contributions and check the progress and history.
8. **Reports** → charts, category tables, monthly summary and CSV export.
9. **Logout** from the sidebar. Your data stays saved in this browser.

---

## 11. Financial calculation explanation

Every calculation lives in `src/services/finance.js`. Nothing else in the project does
money maths, so the dashboard, accounts, budget, reports and charts can never disagree.

### The golden rule

```
Available Balance = Opening Balance + Total Income − Total Expenses
```

`Opening Balance` is the sum of every account's opening balance.

Example from the project brief:

| Step | Action | Income | Expenses | Opening | Available Balance |
|---|---|---|---|---|---|
| 1 | Start | 0 | 0 | 0 | **₹0** |
| 2 | Add ₹25,000 income | 25,000 | 0 | 0 | **₹25,000** |
| 3 | Add ₹5,000 expense | 25,000 | 5,000 | 0 | **₹20,000** |
| 4 | Edit that expense to ₹3,000 | 25,000 | 3,000 | 0 | **₹22,000** |
| 5 | Delete the expense | 25,000 | 0 | 0 | **₹25,000** |

This exact sequence is an automated test — see `test/finance.test.js` →
`REQUIRED SCENARIO: available balance walkthrough`.

### Transactions
- `totals(transactions)` adds only `type === 'income'` to income and only
  `type === 'expense'` to expenses. **An expense can never be counted as income.**
- **Edit:** the transaction object is replaced by id, so subtracting happens exactly once
  with the new amount — the old effect is replaced, not added again.
- **Delete:** the object is removed from the array, so its effect disappears with it. The
  confirmation dialog shows the exact reversal (`+₹3,000` back to the balance).
- Changing a transaction from *expense* to *income* flips its sign once, because the
  calculation always reads the current `type`.
- Invalid or zero amounts are ignored by `totals()`, so bad data cannot corrupt a balance.

### Multiple accounts
- Each account's balance = its opening balance + income on it − expenses on it
  (`accountBalance`).
- The combined balance always equals `Opening Balance + Income − Expenses`, which is the
  same number shown on the dashboard (`balanceSummary.accountTotal === availableBalance`).
- **Transfers** are stored as two linked entries (money out of account A, money into
  account B) carrying `isTransfer: true`. `totals()` skips flagged entries, so a transfer
  is **never** income and **never** an expense, and the combined balance never changes —
  while the two individual account balances do move.

### Budget
- `monthlyExpenses(transactions, month)` sums expenses whose date starts with that month.
- `remaining = limit − spent`, `utilisation % = spent ÷ limit × 100`
- Warning at **≥ 80 %**, “limit reached” at **> 100 %** (the bar is capped at 100 % for
  display, the percentage itself is not).
- Everything is derived from the transaction list, so editing or deleting an expense
  immediately changes these figures.

### Savings goals
- `saved = startingAmount + sum(contributions)`
- `remaining = max(target − saved, 0)`, `progress % = saved ÷ target × 100`
- **A contribution is not a new income transaction.** It is only recorded inside the
  goal, so Total Income and the available balance are never inflated by saving money.

### Recurring expenses
- Each rule stores `nextDate`. On load, `processRecurring()` creates a real expense for
  every date up to today, then moves `nextDate` forward (daily = +1 day, weekly = +7 days,
  monthly = same day next month with month-end clamping, yearly = +1 year).
- **Duplicate prevention:** each generated transaction stores `recurringId` + `date`, and
  a date already covered by that rule is skipped — so refreshing the page ten times still
  creates exactly one transaction per period.
- Pausing a rule stops future transactions but keeps the ones already created, because
  that money really was spent.

### Reports and charts
- Income vs expenses per month (`monthReport`, `monthlySummary`)
- Category-wise expenses with share % (`categoryBreakdown`), sorted by amount
- Spending distribution (donut) — transfers excluded
- Monthly financial summary with savings and savings rate
- All charts are plain inline SVG fed directly from these functions, so they update
  automatically with the data.

---

## 12. Local Storage explanation

All persistence goes through `src/services/storage.js`.

| Key | Contents |
|---|---|
| `et_users` | Array of user records (name, email, role, status, password **hash**) |
| `et_session` | The active session (user id, role, login time, expiry) |
| `et_userdata_<userId>` | That user's `{ transactions, accounts, budget, goals, recurring }` |

Design decisions:
- **One data key per user**, so individual users' financial data is completely separate.
- Every read uses `readJSON()` with `try/catch`, so corrupted or hand-edited data can never
  crash the app — it falls back to safe defaults and repairs missing sections.
- Writes are wrapped too, so a full quota shows a console error instead of breaking the UI.
- Data is **only** removed when the user explicitly deletes something. Deactivating a user
  or deleting a recurring rule never erases existing financial records.
- The browser's Local Storage is per-origin: `http://localhost:5173` keeps its own data.

To reset everything during a demo: DevTools → Application → Local Storage → clear, then
refresh.

---

## 13. Security limitations (please read)

The Security module adds sensible front-end protections:

- Passwords are **never stored in plain text** — PBKDF2-SHA-256 with a random 16-byte salt
  and 100,000 iterations via the Web Crypto API (`hashPassword` / `verifyPassword`).
- Login validation, strict email/password rules and duplicate-email prevention.
- Sessions carry a role and an expiry and are re-validated on load (`validateSession`).
- Route guards (`<RequireRole>`) block user ↔ admin page access, and a tampered session
  role is rejected (`role-mismatch`).
- User-provided text is escaped by React and additionally passed through `sanitizeText`;
  CSV export guards against spreadsheet formula injection.
- Deactivated users are logged out and cannot log in again.

**However — and this is important for the viva — Local Storage cannot provide real
security.** Anyone using the app can open DevTools and read or edit every stored value,
call these functions directly, or simply grant themselves the admin role. There is no
server, so there is no trusted place to check a password and no secret the browser cannot
see. Password hashing here protects a leaked copy of the data; it does **not** make the
app tamper-proof.

Real security requires a backend that verifies credentials, issues server-side sessions
and enforces roles on every request. This project is therefore a **teaching/demo
application**, not a system for storing real financial data.

---

## 14. Testing

```bash
npm test
```

```
 ✓ test/finance.test.js (46 tests)
 ✓ test/auth.test.js    (24 tests)
 Test Files  2 passed (2)
      Tests  70 passed (70)
```

`finance.test.js` covers:
- numeric helpers, rounding, invalid input
- income/expense totals (expenses never counted as income)
- **the exact required scenario**: 0 → +25,000 → −5,000 → edit to 3,000 → delete
- opening balances, per-account balances, combined balance equality, transfers
- edit/delete effects, type flips, immutability, invalid amounts
- search, filter and sort
- budget remaining / utilisation / warning / exceeded / recalculation
- savings goals, contributions, completion, “not income”
- recurring date maths, generation, and **duplicate prevention**
- month reports, category breakdown, monthly summary

`auth.test.js` covers:
- email/password validation, duplicate email (case-insensitive), matching passwords
- PBKDF2 hashing (salted, different every time), verification, wrong password
- login success/failure, deactivated user blocked, plain password never stored
- admin seeding, role assignment, logout clearing the session
- session expiry, role-mismatch, deactivated session, and the user/admin guards

Verified manually in a real browser (Chromium, automated end-to-end run — 49/49 checks
passed): signup, login, logout, redirects after logout, add / edit / delete transactions,
the full balance walkthrough, dashboard ↔ account agreement, persistence after refresh,
budget warning at 90 %, goal contributions, transfers, recurring generation without
duplicates, reports and charts, CSV downloads for user and admin, admin statistics, admin
deactivation, and blocked login for a deactivated user — with **no console errors**.

### Build check
```bash
npm run build     # ✓ built successfully, output in dist/
```

---

## 15. CSV export explanation

`exportCSV(filename, rows)` in `Shared.jsx`:

1. Converts each row (an array of cells) into properly quoted CSV — `"` is escaped as `""`.
2. Prefixes any cell starting with `=`, `+`, `-` or `@` with `'` so spreadsheet software
   cannot execute it as a formula.
3. Prepends a UTF-8 BOM so the ₹ symbol and Indian number formats open correctly in Excel.
4. Creates a `Blob`, a temporary object URL and an invisible download link, clicks it, then
   cleans up.

Exports available:
- **Transactions** (user): every *filtered* row plus filtered income / expense / net totals.
- **Reports** (user): the selected month's summary, income and expense categories, and the
  6-month summary.
- **Users** (admin): name, email, role, status, registration date, transaction count, income
  and expenses.
- **All transactions** (admin): every filtered transaction with its owner, plus totals.

---

## 16. Screenshots

| Screen | Preview |
|---|---|
| Login | `docs/login.png` |
| User dashboard | `docs/dashboard.png` |
| Transactions | `docs/transactions.png` |
| Budget | `docs/budget.png` |
| Accounts | `docs/accounts.png` |
| Savings goals | `docs/goals.png` |
| Reports & charts | `docs/reports.png` |
| Admin dashboard | `docs/admin.png` |
| Admin user management | `docs/admin-users.png` |
| Mobile layout | `docs/mobile.png` |

A full record of every test that was actually executed is in `docs/TEST-REPORT.md`.

---

## 17. Project notes

- Designed to be read top-to-bottom: `finance.js` → `storage.js` → `Shared.jsx` →
  modules → `App.jsx`.
- Beginner-friendly React only: components, props, `useState`, `useEffect`, `useMemo`,
  and one custom hook (`useUserData`) — no context, reducers or external state libraries.
- Responsive: desktop sidebar becomes a slide-in drawer on tablets and phones.
- Works fully offline after `npm install`.

*Built as a B.Tech SDC project submission.*
