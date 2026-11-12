/**
 * Reports.jsx  (User Module)
 * ------------------------------------------------------------------
 * Financial reports and charts:
 *   1. Income vs Expenses (bar chart, last 6 months)
 *   2. Category-wise expenses (table + donut)
 *   3. Spending distribution (donut)
 *   4. Monthly financial summary (table + CSV export)
 *
 * Every figure is derived from the transaction list, so a single edit
 * anywhere in the app is reflected here immediately.
 * ------------------------------------------------------------------
 */
import React, { useMemo, useState } from 'react';
import { Card, StatCard, BarChart, DonutChart, EmptyState, Icon, exportCSV } from '../../components/Shared.jsx';
import {
  monthlySummary,
  monthReport,
  categoryBreakdown,
  availableMonths,
  currentMonthKey,
  monthLabel,
  formatINR
} from '../../services/finance.js';

export default function Reports({ data, summary, notify }) {
  const months = useMemo(() => {
    const list = availableMonths(data.transactions);
    const thisMonth = currentMonthKey();
    return list.includes(thisMonth) ? list : [thisMonth, ...list];
  }, [data.transactions]);

  const [month, setMonth] = useState(months[0] || currentMonthKey());

  const sixMonths = useMemo(() => monthlySummary(data.transactions, 6), [data.transactions]);
  const selected = useMemo(() => monthReport(data.transactions, month), [data.transactions, month]);
  const monthTx = useMemo(
    () => data.transactions.filter((tx) => tx.date.startsWith(month)),
    [data.transactions, month]
  );
  const expenseCats = useMemo(() => categoryBreakdown(monthTx, 'expense'), [monthTx]);
  const incomeCats = useMemo(() => categoryBreakdown(monthTx, 'income'), [monthTx]);
  const allExpenseCats = useMemo(() => categoryBreakdown(data.transactions, 'expense'), [data.transactions]);

  function exportReport() {
    const rows = [
      [`Expense Tracker report — ${monthLabel(month)}`],
      [],
      ['Summary'],
      ['Total income', selected.income],
      ['Total expenses', selected.expenses],
      ['Net savings', selected.savings],
      ['Savings rate (%)', selected.savingsRate],
      [],
      ['Income by category', 'Amount (INR)'],
      ...incomeCats.map((c) => [c.category, c.amount]),
      [],
      ['Expenses by category', 'Amount (INR)', 'Share (%)'],
      ...expenseCats.map((c) => [c.category, c.amount, c.percent]),
      [],
      ['Monthly summary'],
      ['Month', 'Income', 'Expenses', 'Savings'],
      ...sixMonths.map((m) => [m.label, m.income, m.expenses, m.savings])
    ];
    exportCSV(`report_${month}_${new Date().toISOString().slice(0, 10)}.csv`, rows);
    notify('Report CSV exported.', 'success');
  }

  return (
    <div className="stack">
      <div className="stat-grid stat-grid-4">
        <StatCard label="Income this month" value={formatINR(selected.income)} tone="green" icon="arrowDown" hint={monthLabel(month)} />
        <StatCard label="Expenses this month" value={formatINR(selected.expenses)} tone="orange" icon="arrowUp" hint={`${selected.count} transaction${selected.count === 1 ? '' : 's'}`} />
        <StatCard label="Net savings" value={formatINR(selected.savings)} tone={selected.savings >= 0 ? 'violet' : 'red'} icon="wallet" hint={`Savings rate ${selected.savingsRate}%`} />
        <StatCard label="Available balance" value={formatINR(summary.availableBalance)} tone="teal" icon="bank" hint="All time, all accounts" />
      </div>

      <Card
        title="Reports"
        subtitle="Charts and tables update automatically with your financial data"
        actions={
          <>
            <select className="input" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Report month">
              {months.map((m) => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={exportReport}>
              <Icon name="download" size={15} /> Export CSV
            </button>
          </>
        }
      >
        <h3 className="section-label">1. Income vs Expenses — last 6 months</h3>
        <BarChart data={sixMonths} />
      </Card>

      <div className="grid-2">
        <Card title="2. Category-wise expenses" subtitle={`${monthLabel(month)} · expenses only`}>
          {expenseCats.length === 0 ? (
            <EmptyState icon="report" title="No expenses this month" message="Choose another month or add expenses." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th className="right">Amount</th>
                    <th className="right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseCats.map((c) => (
                    <tr key={c.category}>
                      <td>{c.category}</td>
                      <td className="right strong">{formatINR(c.amount)}</td>
                      <td className="right muted">{c.percent}%</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td>Total expenses</td>
                    <td className="right strong">{formatINR(selected.expenses)}</td>
                    <td className="right">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="3. Spending distribution" subtitle="All-time expenses by category">
          <DonutChart data={allExpenseCats} centerLabel="Total" centerValue={formatINR(summary.expenses)} />
        </Card>
      </div>

      <Card title="4. Monthly financial summary" subtitle="Income, expenses and savings per month">
        {sixMonths.length === 0 ? (
          <EmptyState icon="report" title="No data yet" message="Add transactions to build the monthly summary." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="right">Income</th>
                  <th className="right">Expenses</th>
                  <th className="right">Savings</th>
                  <th className="right">Savings rate</th>
                </tr>
              </thead>
              <tbody>
                {sixMonths.map((m) => (
                  <tr key={m.month}>
                    <td>{m.label}</td>
                    <td className="right text-green">{formatINR(m.income)}</td>
                    <td className="right text-orange">{formatINR(m.expenses)}</td>
                    <td className={`right strong ${m.savings >= 0 ? 'text-teal' : 'text-red'}`}>{formatINR(m.savings)}</td>
                    <td className="right muted">{m.savingsRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Income by category" subtitle={`${monthLabel(month)}`}>
        {incomeCats.length === 0 ? (
          <p className="muted">No income recorded for this month.</p>
        ) : (
          <ul className="list">
            {incomeCats.map((c) => (
              <li key={c.category} className="list-row">
                <span className="list-icon"><Icon name="arrowDown" size={15} /></span>
                <div className="list-main"><strong>{c.category}</strong><small>{c.percent}% of income</small></div>
                <span className="list-value text-green">{formatINR(c.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
