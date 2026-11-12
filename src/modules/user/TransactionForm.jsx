/**
 * TransactionForm.jsx
 * ------------------------------------------------------------------
 * The one form used to ADD and to EDIT a transaction. Reusing a single
 * component guarantees both paths validate and calculate identically.
 * ------------------------------------------------------------------
 */
import React, { useEffect, useState } from 'react';
import { Field } from '../../components/Shared.jsx';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, todayISO, toAmount } from '../../services/finance.js';
import { validateAmount } from '../security/security.js';

const EMPTY = {
  type: 'expense',
  amount: '',
  category: 'Food',
  date: todayISO(),
  description: '',
  accountId: ''
};

export default function TransactionForm({ initial, accounts = [], onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initial) {
      setForm({
        type: initial.type || 'expense',
        amount: String(initial.amount ?? ''),
        category: initial.category || 'Other',
        date: initial.date || todayISO(),
        description: initial.description || '',
        accountId: initial.accountId || (accounts[0] ? accounts[0].id : '')
      });
    } else {
      setForm({ ...EMPTY, accountId: accounts[0] ? accounts[0].id : '' });
    }
    setErrors({});
  }, [initial, accounts]);

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function update(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Switching type also fixes the category list.
      if (field === 'type') {
        const list = value === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
        if (!list.includes(prev.category)) next.category = list[0];
      }
      return next;
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const found = {};
    const amountCheck = validateAmount(form.amount);
    if (!amountCheck.valid) found.amount = amountCheck.message;
    if (!form.date) found.date = 'Choose a date.';
    if (!form.category) found.category = 'Choose a category.';

    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    onSubmit({
      type: form.type,
      amount: toAmount(form.amount),
      category: form.category,
      date: form.date,
      description: form.description.trim(),
      accountId: form.accountId || (accounts[0] ? accounts[0].id : '')
    });
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit} noValidate>
      <Field label="Type">
        <div className="segmented">
          <button
            type="button"
            className={`seg ${form.type === 'income' ? 'active income' : ''}`}
            onClick={() => update('type', 'income')}
          >
            Income
          </button>
          <button
            type="button"
            className={`seg ${form.type === 'expense' ? 'active expense' : ''}`}
            onClick={() => update('type', 'expense')}
          >
            Expense
          </button>
        </div>
      </Field>

      <Field label="Amount (₹)" error={errors.amount}>
        <input
          className={`input ${errors.amount ? 'input-error' : ''}`}
          type="number"
          min="0"
          step="0.01"
          value={form.amount}
          onChange={(e) => update('amount', e.target.value)}
          placeholder="0.00"
          autoFocus
        />
      </Field>

      <Field label="Category" error={errors.category}>
        <select className="input" value={form.category} onChange={(e) => update('category', e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Field>

      <Field label="Date" error={errors.date}>
        <input className="input" type="date" value={form.date} onChange={(e) => update('date', e.target.value)} />
      </Field>

      <Field label="Account">
        <select className="input" value={form.accountId} onChange={(e) => update('accountId', e.target.value)}>
          {accounts.length === 0 && <option value="">No account</option>}
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>{acc.name}</option>
          ))}
        </select>
      </Field>

      <Field label="Description" hint="Optional – e.g. Groceries at Big Bazaar">
        <input
          className="input"
          type="text"
          maxLength={120}
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Short note"
        />
      </Field>

      <div className="form-actions span-2">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary">{initial ? 'Save changes' : 'Add transaction'}</button>
      </div>
    </form>
  );
}
