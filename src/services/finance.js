/**
 * finance.js
 * ------------------------------------------------------------------
 * ALL financial calculations for the Expense Tracker live here.
 *
 * Nothing in this file touches React or Local Storage, which means every
 * function is a plain, testable calculation. The golden rule used
 * everywhere in the project:
 *
 *     Available Balance = Opening Balance + Total Income - Total Expenses
 *
 * An income transaction increases the balance, an expense decreases it,
 * and a transfer is NEVER counted as either (a transfer only moves money
 * between two of the user's own accounts).
 * ------------------------------------------------------------------
 */

/* ================================================================== */
/* 1. Small numeric helpers                                           */
/* ================================================================== */

/** Rounds to 2 decimals and kills floating point noise (0.1 + 0.2). */
export function round2(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Safely turns user input into a positive number. */
export function toAmount(value) {
  const n = typeof value === 'string' ? Number(value.replace(/,/g, '').trim()) : Number(value);
  if (!Number.isFinite(n)) return 0;
  return round2(n);
}

/** Formats a number the Indian way, e.g. 1234567.5 -> 12,34,567.50 */
export function formatCurrency(value) {
  const n = toAmount(value);
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatINR(value) {
  return `₹${formatCurrency(value)}`;
}

/** Percentage helper that never divides by zero. */
export function percentOf(part, whole) {
  const w = toAmount(whole);
  if (w <= 0) return 0;
  return round2((toAmount(part) / w) * 100);
}

/* ================================================================== */
/* 2. Dates (all dates are stored as plain "YYYY-MM-DD" strings)       */
/* ================================================================== */

/** Today as YYYY-MM-DD in local time. */
export function todayISO(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "2026-03-05" -> "2026-03" */
export function monthKey(dateStr) {
  if (typeof dateStr !== 'string' || dateStr.length < 7) return '';
  return dateStr.slice(0, 7);
}

/** "2026-03-05" -> "March 2026" */
export function monthLabel(key) {
  if (!key || key.length < 7) return '—';
  const [y, m] = key.split('-');
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const idx = Number(m) - 1;
  return `${months[idx] || m} ${y}`;
}

/** Current month key, e.g. "2026-11" */
export function currentMonthKey(date = new Date()) {
  return todayISO(date).slice(0, 7);
}

function parseDate(dateStr) {
  if (typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((p) => !Number.isFinite(p))) return null;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function addDays(dateStr, days) {
  const d = parseDate(dateStr);
  if (!d) return dateStr;
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

export function addMonths(dateStr, months) {
  const d = parseDate(dateStr);
  if (!d) return dateStr;
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return todayISO(d);
}

export function addYears(dateStr, years) {
  return addMonths(dateStr, years * 12);
}

/** Advances a recurring date by one period. */
export function nextOccurrence(dateStr, frequency) {
  switch (frequency) {
    case 'daily':
      return addDays(dateStr, 1);
    case 'weekly':
      return addDays(dateStr, 7);
    case 'monthly':
      return addMonths(dateStr, 1);
    case 'yearly':
      return addYears(dateStr, 1);
    default:
      return addMonths(dateStr, 1);
  }
}

/* ================================================================== */
/* 3. Transactions                                                    */
/* ================================================================== */

export const TX_TYPES = { INCOME: 'income', EXPENSE: 'expense' };

export const EXPENSE_CATEGORIES = [
  'Food', 'Rent', 'Transport', 'Shopping', 'Bills', 'Health',
  'Education', 'Entertainment', 'Travel', 'Other'
];

export const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Business', 'Interest', 'Gift', 'Other'
];

/**
 * Totals for any list of transactions.
 * Only income is added, only expense is subtracted. Nothing is counted twice.
 */
export function totals(transactions = []) {
  const list = Array.isArray(transactions) ? transactions : [];
  let income = 0;
  let expenses = 0;
  let count = 0;

  for (const tx of list) {
    const amount = toAmount(tx && tx.amount);
    if (amount <= 0) continue;
    // A transfer is money moving between the user's own accounts. Each half
    // is stored with a type so the ACCOUNT balance moves, but a transfer is
    // never income and never an expense, so it is skipped here.
    if (tx.isTransfer) continue;
    count += 1;
    if (tx.type === TX_TYPES.INCOME) income += amount;
    else if (tx.type === TX_TYPES.EXPENSE) expenses += amount;
  }

  income = round2(income);
  expenses = round2(expenses);
  return {
    income,
    expenses,
    expense: expenses, // friendly alias
    net: round2(income - expenses),
    count
  };
}

/** Sum of all account opening balances. */
export function totalOpeningBalance(accounts = []) {
  const list = Array.isArray(accounts) ? accounts : [];
  return round2(list.reduce((sum, acc) => sum + toAmount(acc.openingBalance), 0));
}

/**
 * Balance of ONE account:
 *   opening balance + income on that account - expenses on that account
 */
export function accountBalance(account, transactions = []) {
  if (!account) return 0;
  const list = (Array.isArray(transactions) ? transactions : []).filter(
    (tx) => tx && tx.accountId === account.id
  );
  // Every movement on this account counts towards ITS balance, including the
  // transfer halves (money out of one account is money into another).
  const flow = list.reduce((sum, tx) => {
    const amount = toAmount(tx.amount);
    if (amount <= 0) return sum;
    return sum + (tx.type === TX_TYPES.INCOME ? amount : -amount);
  }, 0);
  return round2(toAmount(account.openingBalance) + flow);
}

/**
 * The complete balance picture used by every dashboard card.
 *
 *   availableBalance = opening balances + income - expenses
 */
export function balanceSummary(accounts = [], transactions = []) {
  const accountList = Array.isArray(accounts) ? accounts : [];
  const txList = Array.isArray(transactions) ? transactions : [];
  const opening = totalOpeningBalance(accountList);
  const { income, expenses } = totals(txList);

  const perAccount = accountList.map((acc) => ({
    ...acc,
    openingBalance: toAmount(acc.openingBalance),
    balance: accountBalance(acc, txList)
  }));

  return {
    openingBalance: opening,
    income,
    expenses,
    availableBalance: round2(opening + income - expenses),
    accounts: perAccount,
    accountTotal: round2(perAccount.reduce((s, a) => s + a.balance, 0)),
    transactionCount: txList.length
  };
}

/** Adds a transaction (returns a NEW array, never mutates the input). */
export function addTransaction(transactions = [], tx) {
  const list = Array.isArray(transactions) ? transactions : [];
  const clean = normalizeTransaction(tx);
  if (!clean) return list;
  return [clean, ...list];
}

/** Edits a transaction by id, keeping its position and id. */
export function updateTransaction(transactions = [], id, changes) {
  const list = Array.isArray(transactions) ? transactions : [];
  return list.map((tx) => {
    if (!tx || tx.id !== id) return tx;
    const merged = normalizeTransaction({ ...tx, ...changes });
    return merged ? { ...merged, id: tx.id, createdAt: tx.createdAt } : tx;
  });
}

/** Deletes a transaction by id. The financial effect disappears with it. */
export function deleteTransaction(transactions = [], id) {
  const list = Array.isArray(transactions) ? transactions : [];
  return list.filter((tx) => tx && tx.id !== id);
}

/** Validates + tidies one transaction object. Returns null if invalid. */
export function normalizeTransaction(tx) {
  if (!tx || typeof tx !== 'object') return null;
  const amount = toAmount(tx.amount);
  if (amount <= 0) return null;

  const type = tx.type === TX_TYPES.INCOME ? TX_TYPES.INCOME : TX_TYPES.EXPENSE;
  const date = typeof tx.date === 'string' && tx.date.length >= 10 ? tx.date : todayISO();

  return {
    id: tx.id || makeId('tx'),
    type,
    amount,
    category: (tx.category && String(tx.category).trim()) || (type === TX_TYPES.INCOME ? 'Salary' : 'Other'),
    date,
    description: tx.description ? String(tx.description).trim().slice(0, 120) : '',
    accountId: tx.accountId || '',
    recurringId: tx.recurringId || null,
    isTransfer: Boolean(tx.isTransfer),
    transferGroupId: tx.transferGroupId || null,
    createdAt: tx.createdAt || new Date().toISOString()
  };
}

/** Filter by month ("2026-11"), type, category, account or text. */
export function filterTransactions(transactions = [], filters = {}) {
  const list = Array.isArray(transactions) ? transactions : [];
  const { search = '', type = 'all', category = 'all', accountId = 'all', month = 'all' } = filters || {};
  const term = String(search).trim().toLowerCase();

  return list.filter((tx) => {
    if (!tx) return false;
    if (type !== 'all' && tx.type !== type) return false;
    if (category !== 'all' && tx.category !== category) return false;
    if (accountId !== 'all' && tx.accountId !== accountId) return false;
    if (month !== 'all' && monthKey(tx.date) !== month) return false;
    if (term) {
      const haystack = `${tx.description || ''} ${tx.category || ''} ${tx.amount || ''}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });
}

/** Sort by date (newest or oldest first), amount or category. */
export function sortTransactions(transactions = [], by = 'date-desc') {
  const list = [...(Array.isArray(transactions) ? transactions : [])];
  const [field, dir] = String(by).split('-');
  const sign = dir === 'asc' ? 1 : -1;

  return list.sort((a, b) => {
    if (field === 'amount') return (toAmount(a.amount) - toAmount(b.amount)) * sign;
    if (field === 'category') return String(a.category).localeCompare(String(b.category)) * sign;
    const da = String(a.date || '');
    const db = String(b.date || '');
    if (da === db) return String(b.createdAt || '').localeCompare(String(a.createdAt || '')) * sign;
    return da < db ? -1 * sign : 1 * sign;
  });
}

/* ================================================================== */
/* 4. Budgets                                                         */
/* ================================================================== */

/** Total expenses inside one month. */
export function monthlyExpenses(transactions = [], month = currentMonthKey()) {
  const list = (Array.isArray(transactions) ? transactions : []).filter(
    (tx) => tx && tx.type === TX_TYPES.EXPENSE && monthKey(tx.date) === month
  );
  return totals(list).expenses;
}

export function monthlyIncome(transactions = [], month = currentMonthKey()) {
  const list = (Array.isArray(transactions) ? transactions : []).filter(
    (tx) => tx && tx.type === TX_TYPES.INCOME && monthKey(tx.date) === month
  );
  return totals(list).income;
}

/**
 * Budget status for one month.
 * `percent` is capped at 100 for the progress bar, `rawPercent` is not.
 */
export function budgetStatus(budget, transactions = [], month = currentMonthKey()) {
  const limit = toAmount(budget && budget.monthlyLimit);
  const spent = monthlyExpenses(transactions, month);
  // With no budget set, "remaining" is meaningless, so it is reported as 0
  // rather than a negative number that would look like overspending.
  const remaining = limit > 0 ? round2(limit - spent) : 0;
  const rawPercent = limit > 0 ? round2((spent / limit) * 100) : 0;

  let level = 'safe';
  if (limit > 0 && spent > limit) level = 'over';
  else if (limit > 0 && spent >= limit * 0.8) level = 'warning';

  return {
    limit,
    spent,
    remaining,
    rawPercent,
    percent: Math.min(rawPercent, 100),
    level,
    exceeded: limit > 0 && spent > limit,
    warning: limit > 0 && rawPercent >= 80,
    hasBudget: limit > 0
  };
}

/** Lists every month that has data, newest first. */
export function availableMonths(transactions = []) {
  const set = new Set();
  for (const tx of Array.isArray(transactions) ? transactions : []) {
    const key = monthKey(tx && tx.date);
    if (key) set.add(key);
  }
  return Array.from(set).sort().reverse();
}

/* ================================================================== */
/* 5. Accounts                                                        */
/* ================================================================== */

export function makeAccount({ name, openingBalance = 0, type = 'Cash' }) {
  return {
    id: makeId('acc'),
    name: (name && String(name).trim()) || 'Account',
    type: type || 'Cash',
    openingBalance: toAmount(openingBalance),
    createdAt: new Date().toISOString()
  };
}

export function defaultAccounts() {
  return [makeAccount({ name: 'Cash', openingBalance: 0, type: 'Cash' })];
}

/** Adding a transaction must never be blocked because no account exists. */
export function ensureAccount(accounts = []) {
  const list = Array.isArray(accounts) ? accounts : [];
  return list.length > 0 ? list : defaultAccounts();
}

/* ================================================================== */
/* 6. Savings goals                                                   */
/* ================================================================== */

export function makeGoal({ name, targetAmount = 0, startingAmount = 0, targetDate = '', note = '' }) {
  return {
    id: makeId('goal'),
    name: (name && String(name).trim()) || 'New goal',
    targetAmount: toAmount(targetAmount),
    startingAmount: toAmount(startingAmount),
    targetDate: targetDate || '',
    note: note ? String(note).slice(0, 160) : '',
    contributions: [],
    createdAt: new Date().toISOString()
  };
}

/** Saved = starting amount + every contribution. Not extra income. */
export function goalSaved(goal) {
  if (!goal) return 0;
  const contribs = Array.isArray(goal.contributions) ? goal.contributions : [];
  return round2(toAmount(goal.startingAmount) + contribs.reduce((s, c) => s + toAmount(c.amount), 0));
}

export function goalProgress(goal) {
  const saved = goalSaved(goal);
  const target = toAmount(goal && goal.targetAmount);
  const remaining = round2(Math.max(target - saved, 0));
  const percent = target > 0 ? round2((saved / target) * 100) : 0;

  return {
    saved,
    target,
    remaining,
    rawPercent: percent,
    percent: Math.min(percent, 100),
    completed: target > 0 && saved >= target
  };
}

export function addContribution(goal, amount, note = '', date = todayISO()) {
  const value = toAmount(amount);
  if (!goal || value <= 0) return goal;
  const contributions = Array.isArray(goal.contributions) ? goal.contributions : [];
  return {
    ...goal,
    contributions: [
      { id: makeId('con'), amount: value, date, note: note ? String(note).slice(0, 120) : '', createdAt: new Date().toISOString() },
      ...contributions
    ]
  };
}

/* ================================================================== */
/* 7. Recurring expenses                                              */
/* ================================================================== */

export const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];

export function makeRecurring({ description, amount, category = 'Other', accountId = '', frequency = 'monthly', startDate = todayISO() }) {
  return {
    id: makeId('rec'),
    description: (description && String(description).trim()) || 'Recurring expense',
    amount: toAmount(amount),
    category,
    accountId,
    frequency: FREQUENCIES.includes(frequency) ? frequency : 'monthly',
    startDate: startDate || todayISO(),
    nextDate: startDate || todayISO(),
    active: true,
    createdAt: new Date().toISOString()
  };
}

/**
 * Creates the transactions that are due for one recurring expense.
 * Duplicate protection: a transaction is only generated when no existing
 * transaction already carries the same recurringId for that same date.
 */
export function generateRecurringTransactions(item, existingTransactions = [], untilDate = todayISO()) {
  if (!item || !item.active) return { created: [], item };
  const amount = toAmount(item.amount);
  if (amount <= 0) return { created: [], item };

  const existing = Array.isArray(existingTransactions) ? existingTransactions : [];
  const seen = new Set(
    existing
      .filter((tx) => tx && tx.recurringId === item.id)
      .map((tx) => `${tx.recurringId}|${tx.date}`)
  );

  const created = [];
  let cursor = item.nextDate || item.startDate || untilDate;
  let guard = 0;

  while (cursor <= untilDate && guard < 400) {
    guard += 1;
    const key = `${item.id}|${cursor}`;
    if (!seen.has(key)) {
      seen.add(key);
      created.push({
        id: makeId('tx'),
        type: TX_TYPES.EXPENSE,
        amount,
        category: item.category || 'Other',
        date: cursor,
        description: item.description,
        accountId: item.accountId || '',
        recurringId: item.id,
        createdAt: new Date().toISOString()
      });
    }
    cursor = nextOccurrence(cursor, item.frequency);
  }

  return {
    created,
    item: cursor === (item.nextDate || item.startDate) ? item : { ...item, nextDate: cursor }
  };
}

/** Runs every active recurring expense; returns new tx list + updated rules. */
export function processRecurring(recurringList = [], transactions = [], today = todayISO()) {
  let txList = Array.isArray(transactions) ? transactions : [];
  const rules = Array.isArray(recurringList) ? recurringList : [];
  const updatedRules = [];
  let createdCount = 0;

  for (const rule of rules) {
    const { created, item } = generateRecurringTransactions(rule, txList, today);
    if (created.length > 0) {
      txList = [...created, ...txList];
      createdCount += created.length;
    }
    updatedRules.push(item);
  }

  return { transactions: txList, recurring: updatedRules, createdCount };
}

/* ================================================================== */
/* 8. Reports & charts                                                */
/* ================================================================== */

export function categoryBreakdown(transactions = [], type = TX_TYPES.EXPENSE) {
  const list = (Array.isArray(transactions) ? transactions : []).filter(
    (tx) => tx && tx.type === type && !tx.isTransfer
  );
  const map = new Map();
  for (const tx of list) {
    const key = tx.category || 'Other';
    map.set(key, round2((map.get(key) || 0) + toAmount(tx.amount)));
  }
  const total = round2(Array.from(map.values()).reduce((s, v) => s + v, 0));
  return Array.from(map.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percent: percentOf(amount, total)
    }))
    .sort((a, b) => b.amount - a.amount);
}

/** Income vs expense for one month. */
export function monthReport(transactions = [], month = currentMonthKey()) {
  const list = (Array.isArray(transactions) ? transactions : []).filter(
    (tx) => tx && monthKey(tx.date) === month
  );
  const { income, expenses } = totals(list);
  return {
    month,
    label: monthLabel(month),
    income,
    expenses,
    savings: round2(income - expenses),
    savingsRate: income > 0 ? round2(((income - expenses) / income) * 100) : 0,
    count: list.length
  };
}

/** Monthly summary rows for the bar chart / report table. */
export function monthlySummary(transactions = [], limit = 6) {
  const rows = availableMonths(transactions).map((m) => monthReport(transactions, m));
  return rows.slice(0, limit).reverse(); // oldest -> newest for charts
}

/* ================================================================== */
/* 9. IDs                                                             */
/* ================================================================== */

export function makeId(prefix = 'id') {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}
