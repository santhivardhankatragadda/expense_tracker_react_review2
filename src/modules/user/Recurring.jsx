/**
 * Recurring.jsx  (User Module)
 * ------------------------------------------------------------------
 * Recurring expenses (daily / weekly / monthly / yearly).
 *
 * How it works: each rule stores the NEXT date it should fire on. When
 * the app loads, processRecurring() creates a real expense transaction
 * for every due date, then moves nextDate forward.
 *
 * Duplicate protection: a transaction records the id of the rule that
 * created it (recurringId) and its date, so the same rule can never create
 * two transactions for the same day — even after a refresh.
 * ------------------------------------------------------------------
 */
import React, { useMemo, useState } from 'react';
import { Card, Modal, ConfirmDialog, Badge, EmptyState, Icon } from '../../components/Shared.jsx';
import {
  formatINR,
  toAmount,
  todayISO,
  nextOccurrence,
  generateRecurringTransactions,
  FREQUENCIES,
  EXPENSE_CATEGORIES
} from '../../services/finance.js';
import { validateAmount, sanitizeText } from '../security/security.js';

export default function Recurring({ data, addRecurring, toggleRecurring, deleteRecurring, notify }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'Bills',
    frequency: 'monthly',
    startDate: todayISO(),
    accountId: data.accounts[0]?.id || ''
  });
  const [errors, setErrors] = useState({});
  const [pendingDelete, setPendingDelete] = useState(null);

  const monthlyCommitment = useMemo(
    () =>
      data.recurring
        .filter((r) => r.active)
        .reduce((sum, r) => {
          const amt = Number(r.amount) || 0;
          if (r.frequency === 'daily') return sum + amt * 30;
          if (r.frequency === 'weekly') return sum + amt * 4;
          if (r.frequency === 'yearly') return sum + amt / 12;
          return sum + amt;
        }, 0),
    [data.recurring]
  );

  function submit(e) {
    e.preventDefault();
    const found = {};
    if (!form.description.trim()) found.description = 'Description is required.';
    const amountCheck = validateAmount(form.amount);
    if (!amountCheck.valid) found.amount = amountCheck.message;
    if (!form.startDate) found.startDate = 'Choose a start date.';
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    addRecurring({
      description: sanitizeText(form.description, 80),
      amount: toAmount(form.amount),
      category: form.category,
      frequency: form.frequency,
      startDate: form.startDate,
      accountId: form.accountId
    });
    setShowForm(false);
    setForm({ description: '', amount: '', category: 'Bills', frequency: 'monthly', startDate: todayISO(), accountId: data.accounts[0]?.id || '' });
    notify('Recurring expense created.', 'success');
  }

  /** Shows exactly what the NEXT run will create (no state is changed). */
  function previewNext(rule) {
    const { created } = generateRecurringTransactions(rule, data.transactions, todayISO());
    return created.length;
  }

  return (
    <div className="stack">
      <div className="stat-grid stat-grid-4">
        <div className="stat-card tone-teal">
          <span className="stat-label">Active rules</span>
          <div className="stat-value">{data.recurring.filter((r) => r.active).length}</div>
          <span className="stat-hint">Auto-created expenses</span>
        </div>
        <div className="stat-card tone-violet">
          <span className="stat-label">Approx. monthly commitment</span>
          <div className="stat-value">{formatINR(monthlyCommitment)}</div>
          <span className="stat-hint">Normalised to a month</span>
        </div>
        <div className="stat-card tone-green">
          <span className="stat-label">Generated so far</span>
          <div className="stat-value">{data.transactions.filter((t) => t.recurringId).length}</div>
          <span className="stat-hint">Transactions from rules</span>
        </div>
        <div className="stat-card tone-orange">
          <span className="stat-label">Due now</span>
          <div className="stat-value">{data.recurring.filter((r) => r.active && r.nextDate <= todayISO()).length}</div>
          <span className="stat-hint">Created on next load</span>
        </div>
      </div>

      <Card
        title="Recurring expenses"
        subtitle="Rent, subscriptions, EMIs — added automatically when due. Never duplicated for the same date."
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => { setErrors({}); setShowForm(true); }}>
            <Icon name="plus" size={15} /> Add rule
          </button>
        }
      >
        {data.recurring.length === 0 ? (
          <EmptyState icon="recurring" title="No recurring expenses" message="Add a rule and the app will create the expense automatically each period." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Frequency</th>
                  <th>Next date</th>
                  <th className="right">Amount</th>
                  <th>Status</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.recurring.map((rule) => (
                  <tr key={rule.id}>
                    <td className="strong">{rule.description}</td>
                    <td className="muted">{rule.category}</td>
                    <td className="capitalize">{rule.frequency}</td>
                    <td className="nowrap">{rule.nextDate}</td>
                    <td className="right strong text-orange">−{formatINR(rule.amount)}</td>
                    <td>
                      <Badge tone={rule.active ? 'green' : 'gray'}>{rule.active ? 'Active' : 'Paused'}</Badge>
                    </td>
                    <td className="right">
                      <button className="btn btn-ghost btn-sm" onClick={() => { toggleRecurring(rule.id); notify(rule.active ? 'Rule paused.' : 'Rule resumed.', 'info'); }}>
                        {rule.active ? 'Pause' : 'Resume'}
                      </button>
                      <button className="icon-btn danger" title="Delete rule" onClick={() => setPendingDelete(rule)}>
                        <Icon name="trash" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="How recurring expenses behave" subtitle="Explained in plain words">
        <ul className="bullet-list">
          <li><strong>Daily</strong> rules add an expense every day, <strong>weekly</strong> every 7 days, <strong>monthly</strong> on the same date each month and <strong>yearly</strong> once a year.</li>
          <li>When you open the app, any date that has passed is filled in automatically — so nothing is missed.</li>
          <li>The same rule can never create a second transaction for a date it already covered ({previewNext({ id: 'x', amount: 1, active: true, nextDate: '2999-01-01', frequency: 'daily' })} future entries pending), which prevents duplicates after a refresh.</li>
          <li>Pausing a rule stops new transactions but keeps the old ones, because that money really was spent.</li>
        </ul>
      </Card>

      {showForm && (
        <Modal title="Add recurring expense" subtitle="The app will create this expense automatically in the future." onClose={() => setShowForm(false)}>
          <form className="form-grid" onSubmit={submit}>
            <label className="field span-2">
              <span className="field-label">Description</span>
              <input
                className={`input ${errors.description ? 'input-error' : ''}`}
                type="text"
                maxLength={80}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Netflix subscription"
                autoFocus
              />
              {errors.description && <span className="field-error">{errors.description}</span>}
            </label>

            <label className="field">
              <span className="field-label">Amount (₹)</span>
              <input
                className={`input ${errors.amount ? 'input-error' : ''}`}
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
              {errors.amount && <span className="field-error">{errors.amount}</span>}
            </label>

            <label className="field">
              <span className="field-label">Category</span>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">Frequency</span>
              <select className="input" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">First occurrence</span>
              <input
                className={`input ${errors.startDate ? 'input-error' : ''}`}
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
              {errors.startDate && <span className="field-error">{errors.startDate}</span>}
            </label>

            <label className="field span-2">
              <span className="field-label">Account</span>
              <select className="input" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
                {data.accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>

            <p className="field-hint span-2">
              Next run: {nextOccurrence(form.startDate, form.frequency)} after the first occurrence on {form.startDate}.
            </p>

            <div className="form-actions span-2">
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Add rule</button>
            </div>
          </form>
        </Modal>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete recurring rule?"
          message="The rule will stop creating new expenses. Transactions it already created are kept, because that money was actually spent."
          onConfirm={() => {
            deleteRecurring(pendingDelete.id);
            setPendingDelete(null);
            notify('Recurring rule deleted. Existing transactions kept.', 'success');
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
