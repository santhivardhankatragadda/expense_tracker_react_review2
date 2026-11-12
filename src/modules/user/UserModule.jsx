/**
 * UserModule.jsx  (User Module – container)
 * ------------------------------------------------------------------
 * Owns the user layout (sidebar + topbar) and switches between the six
 * user pages. All data comes from useUserData, so every page shares one
 * single source of truth for balances, budgets and goals.
 * ------------------------------------------------------------------
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Sidebar, Topbar, ToastStack, Icon } from '../../components/Shared.jsx';
import useUserData from './useUserData.js';
import Dashboard from './Dashboard.jsx';
import Transactions from './Transactions.jsx';
import Budget from './Budget.jsx';
import Accounts from './Accounts.jsx';
import Recurring from './Recurring.jsx';
import Goals from './Goals.jsx';
import Reports from './Reports.jsx';
import { formatINR } from '../../services/finance.js';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'transactions', label: 'Transactions', icon: 'transactions' },
  { key: 'budget', label: 'Budget', icon: 'budget' },
  { key: 'accounts', label: 'Accounts', icon: 'bank' },
  { key: 'recurring', label: 'Recurring', icon: 'recurring' },
  { key: 'goals', label: 'Savings Goals', icon: 'goal' },
  { key: 'reports', label: 'Reports', icon: 'report' }
];

const TITLES = {
  dashboard: ['Dashboard', 'Your money at a glance'],
  transactions: ['Transactions', 'Record, edit, search and filter every transaction'],
  budget: ['Budget', 'Set a monthly limit and watch your utilisation'],
  accounts: ['Accounts', 'Multiple accounts, each with its own balance'],
  recurring: ['Recurring Expenses', 'Automatic daily, weekly, monthly and yearly expenses'],
  goals: ['Savings Goals', 'Track progress towards what you are saving for'],
  reports: ['Reports', 'Income vs expenses, categories and monthly summary']
};

export default function UserModule({ user, route, onNavigate, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const userData = useUserData(user.id);

  const page = NAV.some((n) => n.key === route) ? route : 'dashboard';

  const notify = (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  };

  useEffect(() => {
    if (userData.recurringNotice) {
      notify(userData.recurringNotice, 'info');
      userData.clearRecurringNotice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData.recurringNotice]);

  const [title, subtitle] = TITLES[page] || TITLES.dashboard;

  const shared = useMemo(
    () => ({
      data: userData.data,
      summary: userData.summary,
      budget: userData.budget,
      notify
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userData.data, userData.summary, userData.budget]
  );

  return (
    <div className="app-shell">
      <Sidebar
        items={NAV}
        active={page}
        role="user"
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
          right={
            <div className="balance-chip">
              <span>Available</span>
              <strong>{formatINR(userData.summary.availableBalance)}</strong>
            </div>
          }
        />

        <div className="content">
          {page === 'dashboard' && <Dashboard user={user} {...shared} onNavigate={onNavigate} />}

          {page === 'transactions' && (
            <Transactions
              {...shared}
              addTransaction={userData.addTransaction}
              editTransaction={userData.editTransaction}
              removeTransaction={userData.removeTransaction}
            />
          )}

          {page === 'budget' && <Budget {...shared} setBudget={userData.setBudget} />}

          {page === 'accounts' && (
            <Accounts
              {...shared}
              addAccount={userData.addAccount}
              editAccount={userData.editAccount}
              removeAccount={userData.removeAccount}
              addTransaction={userData.addTransaction}
            />
          )}

          {page === 'recurring' && (
            <Recurring
              {...shared}
              addRecurring={userData.addRecurring}
              toggleRecurring={userData.toggleRecurring}
              deleteRecurring={userData.deleteRecurring}
            />
          )}

          {page === 'goals' && (
            <Goals
              {...shared}
              createGoal={userData.createGoal}
              contributeToGoal={userData.contributeToGoal}
              deleteGoal={userData.deleteGoal}
            />
          )}

          {page === 'reports' && <Reports {...shared} />}
        </div>

        <footer className="app-footer">
          <span>Expense Tracker · User Module</span>
          <span className="muted">Data stored in your browser's Local Storage</span>
        </footer>
      </main>

      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
