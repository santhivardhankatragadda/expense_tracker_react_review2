# Test report — Expense Tracker (React)

Executed on this machine with Node v20.20.2, Vite 5.4.21, Vitest 2.1.9, Chromium (headless).

## 1. Install
```
npm install   ->  added 202 packages, 0 vulnerabilities
```

## 2. Automated unit tests — `npm test`
```
 ✓ test/finance.test.js (46 tests)
 ✓ test/auth.test.js    (24 tests)

 Test Files  2 passed (2)
      Tests  70 passed (70)
```

## 3. Production build — `npm run build`
```
✓ 50 modules transformed.
dist/index.html                   0.53 kB
dist/assets/index-*.css          19.87 kB
dist/assets/index-*.js          240.99 kB
✓ built in 1.23s
```

## 4. End-to-end browser test (real Chromium, 49 checks) — 49/49 passed

Covers: boot, password visibility toggle, invalid-login error, signup validation,
signup -> auto login, add income, add expense, edit expense, delete expense,
dashboard/account agreement, persistence after refresh, budget save + 90% warning,
goal creation + contribution (not counted as income), multiple accounts + transfer
(combined balance unchanged), recurring generation without duplicates, reports and
SVG charts, user CSV export, transaction CSV export, route protection (user cannot open
an admin page by URL), logout redirect, login restores data, admin module statistics,
admin user list, admin transaction monitoring, admin CSV export, admin deactivation,
blocked login for a deactivated user, and zero console errors.

### The required calculation walkthrough (verified through the UI)
| Step | Action | Available balance |
|---|---|---|
| 1 | Start at ₹0 | ₹0.00 ✔ |
| 2 | Add ₹25,000 income | ₹25,000.00 ✔ |
| 3 | Add ₹5,000 expense | ₹20,000.00 ✔ |
| 4 | Edit expense to ₹3,000 | ₹22,000.00 ✔ |
| 5 | Delete the expense | ₹25,000.00 ✔ |

Dashboard "Available Balance" and the Cash account balance both reported the same
figure at every step.
