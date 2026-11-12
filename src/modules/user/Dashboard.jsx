/**
 * Dashboard.jsx  (User Module)
 * ------------------------------------------------------------------
 * Summary of the signed-in user's money.
 * Every number here comes from finance.js so the dashboard, reports and
 * account pages can never disagree with each other.
 * ------------------------------------------------------------------
 */
import React, { useMemo } from 'react';
import { Card, StatCard, ProgressBar, Badge, EmptyState, BarChart, DonutChart, Icon } from '../../components/Shared.jsx';
import {
  formatINR,
  monthlySummary,
  categoryBreakdown,
  monthReport,
  currentMonthKey,
  monthlyExpenses,
  sortTransactions
} from '../../services/finance.js';

export default function Dashboard({ user, summary, budget, data, onNavigate }) {
  const thisMonth = currentMonthKey();
  const report = useMemo(() => monthReport(data.transactions, thisMonth), [data.transactions, thisMonth]);
  const chartData = useMemo(() => monthlySummary(data.transactions, 6), [data.transactions]);
  const expensesByCategory = useMemo(() => categoryBreakdown(data.transactions, 'expense'), [data.transactions]);
  const recent = useMemo(() => sortTransactions(data.transactions, 'date-desc').slice(0, 6), [data.transactions]);
  const monthSpent = useMemo(() => monthlyExpenses(data.transactions, thisMonth), [data.transactions, thisMonth]);

  const budgetTone = budget.level === 'over' ? 'orange' : budget.level === 'warning' ? 'amber' : 'teal';

  return (
    <div className="stack">
      <div className="hello-card">
        <div>
          <h2>Hello, {user?.name?.split(' ')[0] || 'there'}</h2>
          <p>Here is where your money stands today. Every figure updates automatically.</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('transactions')}>
          <Icon name="plus" size={16} /> Add transaction
        </button>
      </div>

      <div className="stat-grid">
        <StatCard
          label="Available Balance"
          value={formatINR(summary.availableBalance)}
          hint={`Opening ${formatINR(summary.openingBalance)} + income − expenses`}
          tone="teal"
          icon="wallet"
        />
        <StatCard label="Total Income" value={formatINR(summary.income)} hint="All income recorded" tone="green" icon="arrowDown" />
        <StatCard label="Total Expenses" value={formatINR(summary.expenses)} hint="All expenses recorded" tone="orange" icon="arrowUp" />
        <StatCard
          label="This Month"
          value={formatINR(report.savings)}
          hint={`Income ${formatINR(report.income)} · Spent ${formatINR(report.expenses)}`}
          tone={report.savings >= 0 ? 'violet' : 'red'}
          icon="report"
        />
      </div>

      <div className="grid-2">
        <Card
          title="Monthly Budget"
          subtitle={budget.hasBudget ? `${formatINR(monthSpent)} spent of ${formatINR(budget.limit)}` : 'No budget set for this month'}
          actions={<button className="btn btn-ghost btn-sm" onClick={() => onNavigate('budget')}>Manage</button>}
        >
          {budget.hasBudget ? (
            <>
              <ProgressBar percent={budget.percent} tone={budgetTone} label="Budget used" />
              <div className="mini-grid">
                <div>
                  <small>Remaining</small>
                  <strong className={budget.remaining < 0 ? 'text-red' : 'text-teal'}>{formatINR(budget.remaining)}</strong>
                </div>
                <div>
                  <small>Utilisation</small>
                  <strong>{budget.rawPercent}%</strong>
                </div>
              </div>
              {budget.exceeded && (
                <p className="alert alert-danger">
                  <Icon name="warning" size={16} /> Budget limit reached — you have spent {formatINR(Math.abs(budget.remaining))} more than planned.
                </p>
              )}
              {!budget.exceeded && budget.warning && (
                <p className="alert alert-warn">
                  <Icon name="warning" size={16} /> You have used {budget.rawPercent}% of this month's budget.
                </p>
              )}
            </>
          ) : (
            <EmptyState
              icon="budget"
              title="Set a monthly budget"
              message="A budget warns you before you overspend."
              action={<button className="btn btn-primary btn-sm" onClick={() => onNavigate('budget')}>Set budget</button>}
            />
          )}
        </Card>

        <Card title="Accounts" subtitle={`${summary.accounts.length} account${summary.accounts.length === 1 ? '' : 's'} · combined ${formatINR(summary.accountTotal)}`} >
          {summary.accounts.length === 0 ? (
            <EmptyState icon="bank" title="No accounts yet" message="Add an account to track balances." />
          ) : (
            <ul className="list">
              {summary.accounts.map((acc) => (
                <li key={acc.id} className="list-row">
                  <span className="list-icon"><Icon name="bank" size={16} /></span>
                  <div className="list-main">
                    <strong>{acc.name}</strong>
                    <small>{acc.type} · opening {formatINR(acc.openingBalance)}</small>
                  </div>
                  <span className="list-value">{formatINR(acc.balance)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Income vs Expenses" subtitle="Last 6 months">
        <BarChart data={chartData} />
      </Card>

      <div className="grid-2">
        <Card title="Spending Distribution" subtitle="All expenses by category">
          <DonutChart data={expensesByCategory} centerLabel="Expenses" centerValue={formatINR(summary.expenses)} />
        </Card>

        <Card
          title="Recent Transactions"
          subtitle="Latest activity"
          actions={<button className="btn btn-ghost btn-sm" onClick={() => onNavigate('transactions')}>View all</button>}
        >
          {recent.length === 0 ? (
            <EmptyState icon="transactions" title="No transactions yet" message="Your first income or expense will show up here." />
          ) : (
            <ul className="list">
              {recent.map((tx) => (
                <li key={tx.id} className="list-row">
                  <span className={`tx-dot ${tx.type}`} />
                  <div className="list-main">
                    <strong>{tx.description || tx.category}</strong>
                    <small>{tx.date} · {tx.category}</small>
                  </div>
                  <span className={`list-value ${tx.type === 'income' ? 'text-green' : 'text-orange'}`}>
                    {tx.type === 'income' ? '+' : '−'}{formatINR(tx.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {data.goals.length > 0 && (
        <Card title="Savings Goals" subtitle="Progress on your goals" actions={<button className="btn btn-ghost btn-sm" onClick={() => onNavigate('goals')}>Manage</button>}>
          <div className="goal-grid">
            {data.goals.slice(0, 3).map((goal) => {
              const contribs = Array.isArray(goal.contributions) ? goal.contributions : [];
              const saved = Number(goal.startingAmount || 0) + contribs.reduce((s, c) => s + Number(c.amount || 0), 0);
              const percent = Number(goal.targetAmount) > 0 ? Math.min((saved / Number(goal.targetAmount)) * 100, 100) : 0;
              return (
                <div key={goal.id} className="goal-mini">
                  <div className="goal-mini-head">
                    <strong>{goal.name}</strong>
                    <Badge tone={saved >= Number(goal.targetAmount) ? 'green' : 'teal'}>
                      {Math.round(percent)}%
                    </Badge>
                  </div>
                  <ProgressBar percent={percent} tone="violet" />
                  <small>{formatINR(saved)} of {formatINR(goal.targetAmount)}</small>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
