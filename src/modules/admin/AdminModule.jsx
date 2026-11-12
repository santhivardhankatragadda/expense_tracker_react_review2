/**
 * AdminModule.jsx  (Admin Module)
 * ------------------------------------------------------------------
 * A completely separate area for the administrator:
 *   - Dashboard statistics (users, income, expenses)
 *   - User management (view, search, activate / deactivate)
 *   - All transactions across every user (monitoring, filters)
 *   - CSV exports
 *
 * Admin screens only READ user data. They never edit or delete a user's
 * transactions, so an individual user's dashboard is never altered from
 * here. Deactivating a user blocks their login but keeps their data.
 * ------------------------------------------------------------------
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Sidebar, Topbar, Card, StatCard, Badge, EmptyState, Icon, ToastStack, ConfirmDialog, BarChart, DonutChart, exportCSV } from '../../components/Shared.jsx';
import { getUsers, saveUsers, getAllUserDataSnapshot } from '../../services/storage.js';
import {
  totals,
  categoryBreakdown,
  monthlySummary,
  monthLabel,
  availableMonths,
  formatINR,
  sortTransactions,
  monthKey
} from '../../services/finance.js';
import { ROLES } from '../security/security.js';

const NAV = [
  { key: 'admin-dashboard', label: 'Admin Dashboard', icon: 'dashboard' },
  { key: 'admin-users', label: 'User Management', icon: 'users' },
  { key: 'admin-transactions', label: 'All Transactions', icon: 'transactions' }
];

const TITLES = {
  'admin-dashboard': ['Admin Dashboard', 'Application-wide statistics (all users combined)'],
  'admin-users': ['User Management', 'View registered users and control account status'],
  'admin-transactions': ['All Transactions', 'Monitor transactions from every user']
};

export default function AdminModule({ user, route, onNavigate, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [snapshotVersion, setSnapshotVersion] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [pendingToggle, setPendingToggle] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');

  const page = NAV.some((n) => n.key === route) ? route : 'admin-dashboard';

  function notify(message, type = 'info') {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  }

  // Re-read Local Storage whenever the page or version changes, so admin
  // numbers always reflect the latest saved user data.
  const snapshot = useMemo(() => {
    const users = getUsers();
    const rows = getAllUserDataSnapshot();
    return { users, rows, version: snapshotVersion };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, snapshotVersion]);

  const [title, subtitle] = TITLES[page] || TITLES['admin-dashboard'];

  const allTransactions = useMemo(
    () =>
      snapshot.rows.flatMap(({ user: u, data }) =>
        data.transactions.map((tx) => ({
          ...tx,
          userEmail: u.email,
          userName: u.name,
          userId: u.id,
          accountName: data.accounts.find((a) => a.id === tx.accountId)?.name || '—'
        }))
      ),
    [snapshot]
  );

  const appTotals = useMemo(() => totals(allTransactions), [allTransactions]);

  const registeredUsers = snapshot.users.filter((u) => u.role === ROLES.USER);
  const activeUsers = registeredUsers.filter((u) => u.status === 'active');
  const inactiveUsers = registeredUsers.filter((u) => u.status !== 'active');

  const months = useMemo(() => availableMonths(allTransactions), [allTransactions]);

  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sortTransactions(
      allTransactions.filter((tx) => {
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (monthFilter !== 'all' && monthKey(tx.date) !== monthFilter) return false;
        if (term) {
          const hay = `${tx.userEmail} ${tx.userName} ${tx.category} ${tx.description}`.toLowerCase();
          if (!hay.includes(term)) return false;
        }
        return true;
      }),
      'date-desc'
    );
  }, [allTransactions, search, typeFilter, monthFilter]);

  const filteredTotals = useMemo(() => totals(filteredTransactions), [filteredTransactions]);

  const topUsers = useMemo(() => {
    return snapshot.rows
      .filter(({ user: u }) => u.role === ROLES.USER)
      .map(({ user: u, data }) => {
        const t = totals(data.transactions);
        return { ...u, income: t.income, expenses: t.expenses, count: t.count };
      })
      .sort((a, b) => b.expenses - a.expenses);
  }, [snapshot]);

  /** Activate / deactivate. Financial data is never touched. */
  function applyStatusChange() {
    const target = pendingToggle;
    if (!target) return;
    if (target.id === user.id) {
      notify('You cannot deactivate your own admin account.', 'error');
      setPendingToggle(null);
      return;
    }
    const nextStatus = target.status === 'active' ? 'inactive' : 'active';
    const users = getUsers().map((u) => (u.id === target.id ? { ...u, status: nextStatus } : u));
    saveUsers(users);
    setSnapshotVersion((v) => v + 1);
    setPendingToggle(null);
    notify(`${target.name} is now ${nextStatus === 'active' ? 'active' : 'deactivated'}.`, 'success');
  }

  function exportUsers() {
    const rows = [
      ['Name', 'Email', 'Role', 'Status', 'Registered on', 'Transactions', 'Income', 'Expenses'],
      ...snapshot.users.map((u) => {
        const data = snapshot.rows.find((r) => r.user.id === u.id)?.data;
        const t = totals(data ? data.transactions : []);
        return [u.name, u.email, u.role, u.status, (u.createdAt || '').slice(0, 10), t.count, t.income, t.expenses];
      })
    ];
    exportCSV(`admin_users_${new Date().toISOString().slice(0, 10)}.csv`, rows);
    notify('User list exported.', 'success');
  }

  function exportAllTransactions() {
    const rows = [
      ['Date', 'User', 'Email', 'Type', 'Category', 'Description', 'Account', 'Amount (INR)'],
      ...filteredTransactions.map((tx) => [
        tx.date, tx.userName, tx.userEmail, tx.type, tx.category, tx.description || '', tx.accountName, tx.amount
      ]),
      [],
      ['Filtered income', filteredTotals.income],
      ['Filtered expenses', filteredTotals.expenses]
    ];
    exportCSV(`admin_transactions_${new Date().toISOString().slice(0, 10)}.csv`, rows);
    notify('Transaction export created.', 'success');
  }

  return (
    <div className="app-shell">
      <Sidebar
        items={NAV}
        active={page}
        role="admin"
        userName={user.name}
        onNavigate={onNavigate}
        onLogout={onLogout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main">
        <Topbar
          title={title}
          subtitle={subtitle}
          onMenu={() => setSidebarOpen(true)}
          right={<Badge tone="violet"><Icon name="shield" size={13} /> Admin</Badge>}
        />

        <div className="content">
          {page === 'admin-dashboard' && (
            <div className="stack">
              <div className="stat-grid">
                <StatCard label="Registered users" value={String(registeredUsers.length)} hint={`${activeUsers.length} active · ${inactiveUsers.length} inactive`} tone="violet" icon="users" />
                <StatCard label="Total income (all users)" value={formatINR(appTotals.income)} hint={`${appTotals.count} transaction${appTotals.count === 1 ? '' : 's'}`} tone="green" icon="arrowDown" />
                <StatCard label="Total expenses (all users)" value={formatINR(appTotals.expenses)} hint="Never counted as income" tone="orange" icon="arrowUp" />
                <StatCard label="App net balance" value={formatINR(appTotals.net)} hint="Income − expenses across users" tone="teal" icon="wallet" />
              </div>

              <div className="grid-2">
                <Card title="Income vs Expenses" subtitle="Last 6 months, all users">
                  <BarChart data={monthlySummary(allTransactions, 6)} />
                </Card>
                <Card title="Expense distribution" subtitle="All users, by category">
                  <DonutChart data={categoryBreakdown(allTransactions, 'expense')} centerLabel="Expenses" centerValue={formatINR(appTotals.expenses)} />
                </Card>
              </div>

              <Card
                title="Most active users"
                subtitle="Ranked by total expenses"
                actions={<button className="btn btn-ghost btn-sm" onClick={exportUsers}><Icon name="download" size={15} /> Export users</button>}
              >
                {topUsers.length === 0 ? (
                  <EmptyState icon="users" title="No users registered yet" message="Users who sign up will appear here." />
                ) : (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Email</th>
                          <th>Status</th>
                          <th className="right">Transactions</th>
                          <th className="right">Income</th>
                          <th className="right">Expenses</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topUsers.map((u) => (
                          <tr key={u.id}>
                            <td className="strong">{u.name}</td>
                            <td className="muted">{u.email}</td>
                            <td><Badge tone={u.status === 'active' ? 'green' : 'gray'}>{u.status}</Badge></td>
                            <td className="right">{u.count}</td>
                            <td className="right text-green">{formatINR(u.income)}</td>
                            <td className="right text-orange">{formatINR(u.expenses)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {page === 'admin-users' && (
            <div className="stack">
              <div className="stat-grid stat-grid-4">
                <StatCard label="Total users" value={String(registeredUsers.length)} tone="violet" hint="Registered accounts" />
                <StatCard label="Active" value={String(activeUsers.length)} tone="green" hint="Can log in" />
                <StatCard label="Deactivated" value={String(inactiveUsers.length)} tone="orange" hint="Blocked from logging in" />
                <StatCard label="Admins" value={String(snapshot.users.filter((u) => u.role === ROLES.ADMIN).length)} tone="teal" hint="Separate admin module" />
              </div>

              <Card
                title="Registered users"
                subtitle="Activating or deactivating never deletes a user's financial data"
                actions={<button className="btn btn-ghost btn-sm" onClick={exportUsers}><Icon name="download" size={15} /> Export CSV</button>}
              >
                {snapshot.users.length === 0 ? (
                  <EmptyState icon="users" title="No users" message="No accounts are registered yet." />
                ) : (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Registered</th>
                          <th className="right">Txns</th>
                          <th>Status</th>
                          <th className="right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {snapshot.users.map((u) => {
                          const data = snapshot.rows.find((r) => r.user.id === u.id)?.data;
                          const count = data ? data.transactions.length : 0;
                          const isSelf = u.id === user.id;
                          return (
                            <tr key={u.id}>
                              <td className="strong">{u.name}{isSelf && <span className="muted small"> (you)</span>}</td>
                              <td className="muted">{u.email}</td>
                              <td><Badge tone={u.role === ROLES.ADMIN ? 'violet' : 'teal'}>{u.role}</Badge></td>
                              <td className="nowrap muted">{(u.createdAt || '').slice(0, 10) || '—'}</td>
                              <td className="right">{count}</td>
                              <td><Badge tone={u.status === 'active' ? 'green' : 'gray'}>{u.status}</Badge></td>
                              <td className="right">
                                <button
                                  className={`btn btn-sm ${u.status === 'active' ? 'btn-danger-ghost' : 'btn-primary'}`}
                                  disabled={isSelf}
                                  title={isSelf ? 'You cannot change your own status' : ''}
                                  onClick={() => setPendingToggle(u)}
                                >
                                  {u.status === 'active' ? 'Deactivate' : 'Activate'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {page === 'admin-transactions' && (
            <div className="stack">
              <div className="stat-grid stat-grid-4">
                <StatCard label="Transactions (filtered)" value={String(filteredTotals.count)} tone="violet" hint="Across all users" />
                <StatCard label="Income (filtered)" value={formatINR(filteredTotals.income)} tone="green" hint="Read-only monitoring" />
                <StatCard label="Expenses (filtered)" value={formatINR(filteredTotals.expenses)} tone="orange" hint="Read-only monitoring" />
                <StatCard label="Net (filtered)" value={formatINR(filteredTotals.net)} tone="teal" hint="Income − expenses" />
              </div>

              <Card
                title="All transactions"
                subtitle="Monitoring only — an admin never edits a user's transactions"
                actions={<button className="btn btn-ghost btn-sm" onClick={exportAllTransactions}><Icon name="download" size={15} /> Export CSV</button>}
              >
                <div className="toolbar">
                  <div className="search-box">
                    <Icon name="search" size={16} />
                    <input className="input search-input" type="search" placeholder="Search user, email, category…" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Type filter">
                    <option value="all">All types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                  <select className="input" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} aria-label="Month filter">
                    <option value="all">All months</option>
                    {months.map((m) => (
                      <option key={m} value={m}>{monthLabel(m)}</option>
                    ))}
                  </select>
                </div>

                {filteredTransactions.length === 0 ? (
                  <EmptyState icon="transactions" title="No transactions to show" message="No transactions match the current filters." />
                ) : (
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>User</th>
                          <th>Type</th>
                          <th>Category</th>
                          <th>Description</th>
                          <th>Account</th>
                          <th className="right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.slice(0, 300).map((tx) => (
                          <tr key={`${tx.userId}-${tx.id}`}>
                            <td className="nowrap">{tx.date}</td>
                            <td>
                              <div className="strong">{tx.userName}</div>
                              <div className="muted small">{tx.userEmail}</div>
                            </td>
                            <td><Badge tone={tx.type === 'income' ? 'green' : 'orange'}>{tx.type}</Badge></td>
                            <td>{tx.category}</td>
                            <td className="muted">{tx.description || '—'}</td>
                            <td className="muted">{tx.accountName}</td>
                            <td className={`right strong ${tx.type === 'income' ? 'text-green' : 'text-orange'}`}>
                              {tx.type === 'income' ? '+' : '−'}{formatINR(tx.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {filteredTransactions.length > 300 && (
                  <p className="muted small">Showing the first 300 rows. Export the CSV for the full list.</p>
                )}
              </Card>
            </div>
          )}
        </div>

        <footer className="app-footer">
          <span>Expense Tracker · Admin Module</span>
          <span className="muted">Aggregated from Local Storage · read-only</span>
        </footer>
      </main>

      {pendingToggle && (
        <ConfirmDialog
          title={pendingToggle.status === 'active' ? 'Deactivate user?' : 'Activate user?'}
          message={
            pendingToggle.status === 'active'
              ? `${pendingToggle.name} will no longer be able to log in. Their transactions, budget and goals are kept safely.`
              : `${pendingToggle.name} will be able to log in again.`
          }
          confirmLabel={pendingToggle.status === 'active' ? 'Deactivate' : 'Activate'}
          onConfirm={applyStatusChange}
          onCancel={() => setPendingToggle(null)}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
