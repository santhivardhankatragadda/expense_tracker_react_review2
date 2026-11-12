/**
 * Accounts.jsx  (User Module)
 * ------------------------------------------------------------------
 * Multiple accounts, each with its own opening balance and its own live
 * balance. The combined total is shown at the top and must always equal
 * the Available Balance on the dashboard:
 *
 *   opening balances + income - expenses = sum of account balances
 *
 * A transfer is simply an expense on one account plus an income on
 * another. Each half is entered by hand by the user, so neither half is
 * hidden — but a transfer never changes the COMBINED balance because the
 * two halves cancel out. The helper below shows that arithmetic so the
 * user can see it.
 * ------------------------------------------------------------------
 */
import React, { useMemo, useState } from 'react';
import { Card, StatCard, Modal, ConfirmDialog, EmptyState, Icon, Badge } from '../../components/Shared.jsx';
import { formatINR, toAmount, ensureAccount, makeId } from '../../services/finance.js';
import { validateAmount, sanitizeText } from '../security/security.js';

const ACCOUNT_TYPES = ['Cash', 'Bank', 'Credit Card', 'UPI / Wallet', 'Savings'];

export default function Accounts({ data, summary, addAccount, editAccount, removeAccount, addTransaction, notify }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'Cash', openingBalance: '' });
  const [errors, setErrors] = useState({});

  // Transfers: a pair of matching entries, one out and one in.
  const [transfer, setTransfer] = useState({ from: '', to: '', amount: '', date: new Date().toISOString().slice(0, 10) });
  const [transferError, setTransferError] = useState('');

  const accounts = useMemo(() => ensureAccount(data.accounts), [data.accounts]);

  function openAdd() {
    setEditing(null);
    setForm({ name: '', type: 'Cash', openingBalance: '' });
    setErrors({});
    setShowForm(true);
  }

  function openEdit(acc) {
    setEditing(acc);
    setForm({ name: acc.name, type: acc.type || 'Cash', openingBalance: String(acc.openingBalance) });
    setErrors({});
    setShowForm(true);
  }

  function submitAccount(e) {
    e.preventDefault();
    const found = {};
    if (!form.name.trim()) found.name = 'Account name is required.';
    if (form.openingBalance !== '' && !validateAmount(form.openingBalance).valid && Number(form.openingBalance) !== 0) {
      found.openingBalance = 'Enter a valid opening balance (can be 0).';
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    const payload = {
      name: sanitizeText(form.name, 40) || 'Account',
      type: form.type,
      openingBalance: toAmount(form.openingBalance || 0)
    };

    if (editing) {
      editAccount(editing.id, payload);
      notify('Account updated. Balances recalculated.', 'success');
    } else {
      addAccount(payload);
      notify('Account added.', 'success');
    }
    setShowForm(false);
  }

  function confirmDelete() {
    const acc = pendingDelete;
    const hasTx = data.transactions.some((tx) => tx.accountId === acc.id);
    if (hasTx) {
      notify('Move or delete this account\u2019s transactions first.', 'error');
      setPendingDelete(null);
      return;
    }
    if (accounts.length <= 1) {
      notify('Keep at least one account.', 'error');
      setPendingDelete(null);
      return;
    }
    removeAccount(acc.id);
    setPendingDelete(null);
    notify('Account removed.', 'success');
  }

  function doTransfer(e) {
    e.preventDefault();
    setTransferError('');

    if (!transfer.from || !transfer.to) return setTransferError('Choose both accounts.');
    if (transfer.from === transfer.to) return setTransferError('Choose two different accounts.');
    const check = validateAmount(transfer.amount);
    if (!check.valid) return setTransferError(check.message);

    const amount = toAmount(transfer.amount);
    const fromName = accounts.find((a) => a.id === transfer.from)?.name || 'Account';
    const toName = accounts.find((a) => a.id === transfer.to)?.name || 'Account';
    // Both halves carry the same group id and are flagged as transfers, so
    // the app can move one account's balance without ever treating the money
    // as income or as an expense.
    const transferGroupId = makeId('tr');

    addTransaction({
      type: 'expense',
      amount,
      category: 'Transfer',
      date: transfer.date,
      description: `Transfer to ${toName}`,
      accountId: transfer.from,
      isTransfer: true,
      transferGroupId
    });
    addTransaction({
      type: 'income',
      amount,
      category: 'Transfer',
      date: transfer.date,
      description: `Transfer from ${fromName}`,
      accountId: transfer.to,
      isTransfer: true,
      transferGroupId
    });

    setTransfer({ ...transfer, amount: '' });
    notify(`Transferred ${formatINR(amount)} from ${fromName} to ${toName}. Combined balance unchanged.`, 'success');
  }

  return (
    <div className="stack">
      <div className="stat-grid stat-grid-4">
        <StatCard label="Combined Balance" value={formatINR(summary.accountTotal)} hint="Sum of all account balances" tone="teal" icon="wallet" />
        <StatCard label="Opening Balances" value={formatINR(summary.openingBalance)} hint="Starting money across accounts" tone="violet" icon="bank" />
        <StatCard label="Total Income" value={formatINR(summary.income)} hint="All accounts" tone="green" icon="arrowDown" />
        <StatCard label="Total Expenses" value={formatINR(summary.expenses)} hint="All accounts" tone="orange" icon="arrowUp" />
      </div>

      <Card
        title="Your accounts"
        subtitle={`Each account keeps its own balance. Combined: ${formatINR(summary.accountTotal)}`}
        actions={
          <button className="btn btn-primary btn-sm" onClick={openAdd}>
            <Icon name="plus" size={15} /> Add account
          </button>
        }
      >
        {accounts.length === 0 ? (
          <EmptyState icon="bank" title="No accounts" message="Add a cash or bank account to get started." />
        ) : (
          <div className="account-grid">
            {accounts.map((acc) => {
              const live = summary.accounts.find((a) => a.id === acc.id) || acc;
              const txCount = data.transactions.filter((tx) => tx.accountId === acc.id).length;
              return (
                <div key={acc.id} className="account-card">
                  <div className="account-head">
                    <div>
                      <strong>{acc.name}</strong>
                      <div><Badge tone="teal">{acc.type || 'Cash'}</Badge></div>
                    </div>
                    <div className="account-tools">
                      <button className="icon-btn" title="Edit" onClick={() => openEdit(acc)}>
                        <Icon name="edit" size={16} />
                      </button>
                      <button className="icon-btn danger" title="Delete" onClick={() => setPendingDelete(acc)}>
                        <Icon name="trash" size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="account-balance">{formatINR(live.balance ?? acc.openingBalance)}</div>
                  <div className="account-meta">
                    Opening {formatINR(acc.openingBalance)} · {txCount} transaction{txCount === 1 ? '' : 's'}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Transfer between accounts" subtitle="A transfer is not income and not an expense — your combined balance stays the same">
        <form className="form-grid" onSubmit={doTransfer}>
          <label className="field">
            <span className="field-label">From account</span>
            <select className="input" value={transfer.from} onChange={(e) => setTransfer({ ...transfer, from: e.target.value })}>
              <option value="">Select…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">To account</span>
            <select className="input" value={transfer.to} onChange={(e) => setTransfer({ ...transfer, to: e.target.value })}>
              <option value="">Select…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">Amount (₹)</span>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              value={transfer.amount}
              onChange={(e) => setTransfer({ ...transfer, amount: e.target.value })}
              placeholder="0.00"
            />
          </label>

          <label className="field">
            <span className="field-label">Date</span>
            <input className="input" type="date" value={transfer.date} onChange={(e) => setTransfer({ ...transfer, date: e.target.value })} />
          </label>

          {transferError && <p className="alert alert-danger span-2">{transferError}</p>}

          <div className="form-actions span-2">
            <button type="submit" className="btn btn-primary">Transfer</button>
          </div>
        </form>
      </Card>

      {showForm && (
        <Modal
          title={editing ? 'Edit account' : 'Add account'}
          subtitle="Opening balance is the money already in the account before you started tracking."
          onClose={() => setShowForm(false)}
        >
          <form className="form-grid" onSubmit={submitAccount}>
            <label className="field span-2">
              <span className="field-label">Account name</span>
              <input
                className={`input ${errors.name ? 'input-error' : ''}`}
                type="text"
                maxLength={40}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. HDFC Savings"
                autoFocus
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </label>

            <label className="field">
              <span className="field-label">Type</span>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">Opening balance (₹)</span>
              <input
                className={`input ${errors.openingBalance ? 'input-error' : ''}`}
                type="number"
                step="0.01"
                value={form.openingBalance}
                onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                placeholder="0.00"
              />
              {errors.openingBalance && <span className="field-error">{errors.openingBalance}</span>}
            </label>

            <div className="form-actions span-2">
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editing ? 'Save changes' : 'Add account'}</button>
            </div>
          </form>
        </Modal>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete account?"
          message={`"${pendingDelete.name}" will be removed. Accounts that still have transactions cannot be deleted.`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
