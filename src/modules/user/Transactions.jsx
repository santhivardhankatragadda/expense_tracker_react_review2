/**
 * Transactions.jsx  (User Module)
 * ------------------------------------------------------------------
 * Add / edit / delete / search / filter / sort transactions.
 * The displayed totals always reflect the current filter, while the
 * "Available Balance" strip shows the true overall balance.
 * ------------------------------------------------------------------
 */
import React, { useMemo, useState } from 'react';
import { Card, Modal, ConfirmDialog, Badge, EmptyState, Icon, exportCSV } from '../../components/Shared.jsx';
import TransactionForm from './TransactionForm.jsx';
import {
  filterTransactions,
  sortTransactions,
  totals,
  formatINR,
  availableMonths,
  monthLabel,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES
} from '../../services/finance.js';

export default function Transactions({ data, summary, addTransaction, editTransaction, removeTransaction, notify }) {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [category, setCategory] = useState('all');
  const [accountId, setAccountId] = useState('all');
  const [month, setMonth] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const months = useMemo(() => availableMonths(data.transactions), [data.transactions]);
  const allCategories = useMemo(() => {
    const used = new Set(data.transactions.map((t) => t.category));
    return [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES, ...used])].filter(Boolean);
  }, [data.transactions]);

  const filtered = useMemo(() => {
    const list = filterTransactions(data.transactions, { search, type, category, accountId, month });
    return sortTransactions(list, sortBy);
  }, [data.transactions, search, type, category, accountId, month, sortBy]);

  const shown = useMemo(() => totals(filtered), [filtered]);

  function accountName(id) {
    const acc = data.accounts.find((a) => a.id === id);
    return acc ? acc.name : '—';
  }

  function submit(values) {
    if (editing) {
      editTransaction(editing.id, values);
      notify('Transaction updated. Balances recalculated.', 'success');
    } else {
      addTransaction(values);
      notify('Transaction added.', 'success');
    }
    setShowForm(false);
    setEditing(null);
  }

  function confirmDelete() {
    const tx = pendingDelete;
    removeTransaction(tx.id);
    setPendingDelete(null);
    notify(`Deleted ${tx.type} of ${formatINR(tx.amount)}. Balance updated.`, 'success');
  }

  function handleExport() {
    const rows = [
      ['Date', 'Type', 'Category', 'Description', 'Account', 'Amount (INR)'],
      ...filtered.map((tx) => [tx.date, tx.type, tx.category, tx.description || '', accountName(tx.accountId), tx.amount]),
      [],
      ['Filtered income', shown.income],
      ['Filtered expenses', shown.expenses],
      ['Filtered net', shown.net]
    ];
    exportCSV(`transactions_${new Date().toISOString().slice(0, 10)}.csv`, rows);
    notify('CSV exported.', 'success');
  }

  function resetFilters() {
    setSearch('');
    setType('all');
    setCategory('all');
    setAccountId('all');
    setMonth('all');
    setSortBy('date-desc');
  }

  return (
    <div className="stack">
      <div className="stat-grid stat-grid-4">
        <div className="stat-card tone-teal">
          <span className="stat-label">Available Balance</span>
          <div className="stat-value">{formatINR(summary.availableBalance)}</div>
          <span className="stat-hint">All accounts combined</span>
        </div>
        <div className="stat-card tone-green">
          <span className="stat-label">Income shown</span>
          <div className="stat-value">{formatINR(shown.income)}</div>
          <span className="stat-hint">{shown.count} transaction{shown.count === 1 ? '' : 's'} in view</span>
        </div>
        <div className="stat-card tone-orange">
          <span className="stat-label">Expenses shown</span>
          <div className="stat-value">{formatINR(shown.expenses)}</div>
          <span className="stat-hint">Never counted as income</span>
        </div>
        <div className={`stat-card ${shown.net >= 0 ? 'tone-violet' : 'tone-red'}`}>
          <span className="stat-label">Net in view</span>
          <div className="stat-value">{formatINR(shown.net)}</div>
          <span className="stat-hint">Income − expenses</span>
        </div>
      </div>

      <Card
        title="Transactions"
        subtitle="Add, edit, delete, search, filter and sort"
        actions={
          <>
            <button className="btn btn-ghost btn-sm" onClick={handleExport}>
              <Icon name="download" size={15} /> Export CSV
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              <Icon name="plus" size={15} /> Add
            </button>
          </>
        }
      >
        <div className="toolbar">
          <div className="search-box">
            <Icon name="search" size={16} />
            <input
              className="input search-input"
              type="search"
              placeholder="Search description, category or amount…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select className="input" value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
            <option value="all">All categories</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)} aria-label="Filter by account">
            <option value="all">All accounts</option>
            {data.accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <select className="input" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Filter by month">
            <option value="all">All months</option>
            {months.map((m) => (
              <option key={m} value={m}>{monthLabel(m)}</option>
            ))}
          </select>

          <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort">
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="amount-desc">Amount high → low</option>
            <option value="amount-asc">Amount low → high</option>
            <option value="category-asc">Category A → Z</option>
          </select>

          <button className="btn btn-ghost btn-sm" onClick={resetFilters}>Reset</button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="transactions"
            title={data.transactions.length === 0 ? 'No transactions yet' : 'No matches'}
            message={
              data.transactions.length === 0
                ? 'Add your first income or expense to start tracking.'
                : 'Try changing or resetting the filters.'
            }
            action={
              data.transactions.length === 0 ? (
                <button className="btn btn-primary btn-sm" onClick={() => { setEditing(null); setShowForm(true); }}>
                  Add transaction
                </button>
              ) : null
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Account</th>
                  <th className="right">Amount</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr key={tx.id}>
                    <td className="nowrap">{tx.date}</td>
                    <td>
                      {tx.isTransfer ? (
                        <Badge tone="violet">Transfer</Badge>
                      ) : (
                        <Badge tone={tx.type === 'income' ? 'green' : 'orange'}>
                          {tx.type === 'income' ? 'Income' : 'Expense'}
                        </Badge>
                      )}
                    </td>
                    <td>{tx.category}</td>
                    <td className="muted">{tx.description || '—'}</td>
                    <td className="muted">{accountName(tx.accountId)}</td>
                    <td className={`right strong ${tx.type === 'income' ? 'text-green' : 'text-orange'}`}>
                      {tx.type === 'income' ? '+' : '−'}{formatINR(tx.amount)}
                    </td>
                    <td className="right">
                      <button
                        className="icon-btn"
                        title="Edit"
                        onClick={() => {
                          setEditing(tx);
                          setShowForm(true);
                        }}
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button className="icon-btn danger" title="Delete" onClick={() => setPendingDelete(tx)}>
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

      {showForm && (
        <Modal
          title={editing ? 'Edit transaction' : 'Add transaction'}
          subtitle={editing ? 'Changing the amount or type updates the balance automatically.' : 'Record money coming in or going out.'}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        >
          <TransactionForm
            initial={editing}
            accounts={data.accounts}
            onSubmit={submit}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </Modal>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete transaction?"
          message={`This will reverse its financial effect: ${pendingDelete.type === 'income' ? '−' : '+'}${formatINR(
            pendingDelete.amount
          )} on the available balance.`}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
