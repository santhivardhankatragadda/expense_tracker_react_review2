/**
 * Budget.jsx  (User Module)
 * ------------------------------------------------------------------
 * Monthly budget: set a limit, see expenses for the month, remaining
 * amount, utilisation %, and a warning near/over the limit.
 * The expense figure is recalculated from transactions on every render,
 * so editing or deleting an expense instantly changes this page.
 * ------------------------------------------------------------------
 */
import React, { useMemo, useState } from 'react';
import { Card, StatCard, ProgressBar, Icon, EmptyState } from '../../components/Shared.jsx';
import {
  budgetStatus,
  monthlyExpenses,
  monthlyIncome,
  availableMonths,
  currentMonthKey,
  monthLabel,
  formatINR,
  toAmount,
  categoryBreakdown
} from '../../services/finance.js';
import { validateAmount } from '../security/security.js';

export default function Budget({ data, budget, setBudget, notify }) {
  const thisMonth = currentMonthKey();
  const [month, setMonth] = useState(thisMonth);
  const [limitInput, setLimitInput] = useState(String(data.budget.monthlyLimit || ''));
  const [error, setError] = useState('');

  const months = useMemo(() => {
    const list = availableMonths(data.transactions);
    return list.includes(thisMonth) ? list : [thisMonth, ...list];
  }, [data.transactions, thisMonth]);

  const view = useMemo(
    () => (month === thisMonth ? budget : budgetStatus(data.budget, data.transactions, month)),
    [budget, data.budget, data.transactions, month, thisMonth]
  );
  const spent = useMemo(() => monthlyExpenses(data.transactions, month), [data.transactions, month]);
  const earned = useMemo(() => monthlyIncome(data.transactions, month), [data.transactions, month]);
  const byCategory = useMemo(
    () => categoryBreakdown(data.transactions.filter((t) => t.date.startsWith(month)), 'expense'),
    [data.transactions, month]
  );

  function save(e) {
    e.preventDefault();
    if (limitInput === '' || Number(limitInput) === 0) {
      setError('');
      setBudget(0);
      notify('Monthly budget removed.', 'info');
      return;
    }
    const check = validateAmount(limitInput);
    if (!check.valid) {
      setError(check.message);
      return;
    }
    setError('');
    setBudget(toAmount(limitInput));
    notify(`Monthly budget set to ${formatINR(limitInput)}.`, 'success');
  }

  const tone = view.level === 'over' ? 'orange' : view.level === 'warning' ? 'amber' : 'teal';

  return (
    <div className="stack">
      <div className="stat-grid stat-grid-4">
        <StatCard label="Monthly Budget" value={view.hasBudget ? formatINR(view.limit) : 'Not set'} hint={monthLabel(month)} tone="violet" icon="budget" />
        <StatCard label="Spent this month" value={formatINR(spent)} hint="Expenses only" tone="orange" icon="arrowUp" />
        <StatCard
          label="Remaining"
          value={view.hasBudget ? formatINR(view.remaining) : '—'}
          hint={view.remaining < 0 ? 'Over budget' : 'Left to spend'}
          tone={view.remaining < 0 ? 'red' : 'green'}
          icon="wallet"
        />
        <StatCard
          label="Utilisation"
          value={view.hasBudget ? `${view.rawPercent}%` : '—'}
          hint={`Income this month ${formatINR(earned)}`}
          tone={tone === 'teal' ? 'teal' : tone === 'amber' ? 'amber' : 'orange'}
          icon="report"
        />
      </div>

      <div className="grid-2">
        <Card title="Set monthly budget" subtitle="Applies to every month until you change it">
          <form className="stack-sm" onSubmit={save}>
            <label className="field">
              <span className="field-label">Budget limit for a month (₹)</span>
              <input
                className={`input ${error ? 'input-error' : ''}`}
                type="number"
                min="0"
                step="100"
                value={limitInput}
                onChange={(e) => setLimitInput(e.target.value)}
                placeholder="e.g. 15000"
              />
              {error ? <span className="field-error">{error}</span> : <span className="field-hint">Set 0 to remove the budget.</span>}
            </label>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Save budget</button>
            </div>
          </form>

          <hr className="rule" />

          <div className="field">
            <span className="field-label">View a specific month</span>
            <select className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
              {months.map((m) => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
          </div>
        </Card>

        <Card title={`Budget health — ${monthLabel(month)}`} subtitle="Updates automatically when expenses change">
          {view.hasBudget ? (
            <>
              <ProgressBar percent={view.percent} tone={tone} label="Budget used" />
              <div className="mini-grid">
                <div><small>Limit</small><strong>{formatINR(view.limit)}</strong></div>
                <div><small>Spent</small><strong>{formatINR(view.spent)}</strong></div>
                <div><small>Remaining</small><strong className={view.remaining < 0 ? 'text-red' : 'text-teal'}>{formatINR(view.remaining)}</strong></div>
              </div>
              {view.exceeded ? (
                <p className="alert alert-danger">
                  <Icon name="warning" size={16} /> Limit reached. You have overspent by {formatINR(Math.abs(view.remaining))}.
                </p>
              ) : view.warning ? (
                <p className="alert alert-warn">
                  <Icon name="warning" size={16} /> Warning: {view.rawPercent}% of the budget is already used.
                </p>
              ) : (
                <p className="alert alert-ok">
                  <Icon name="check" size={16} /> You are within budget. {formatINR(view.remaining)} still available.
                </p>
              )}
            </>
          ) : (
            <EmptyState icon="budget" title="No budget set" message="Enter a limit on the left to start tracking utilisation." />
          )}
        </Card>
      </div>

      <Card title={`Expenses by category — ${monthLabel(month)}`} subtitle="Which category is using the budget">
        {byCategory.length === 0 ? (
          <EmptyState icon="report" title="No expenses this month" message="Nothing recorded for the selected month." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="right">Spent</th>
                  <th className="right">Share</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.map((row) => (
                  <tr key={row.category}>
                    <td>{row.category}</td>
                    <td className="right strong">{formatINR(row.amount)}</td>
                    <td className="right muted">{row.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
