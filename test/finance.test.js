/**
 * finance.test.js
 * ------------------------------------------------------------------
 * Tests for every financial calculation in the project.
 * Run with:  npm test
 *
 * The headline test is the exact scenario required by the project brief:
 *   0 -> +25000 -> 25000 -> -5000 -> 20000 -> edit to 3000 -> 22000
 *   -> delete -> 25000
 * ------------------------------------------------------------------
 */
import { describe, it, expect } from 'vitest';
import {
  round2,
  toAmount,
  totals,
  balanceSummary,
  accountBalance,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  filterTransactions,
  sortTransactions,
  budgetStatus,
  monthlyExpenses,
  goalProgress,
  goalSaved,
  addContribution,
  makeGoal,
  makeAccount,
  makeRecurring,
  generateRecurringTransactions,
  processRecurring,
  nextOccurrence,
  categoryBreakdown,
  monthReport,
  monthlySummary,
  monthKey,
  addMonths,
  percentOf
} from '../src/services/finance.js';

const ACC = { id: 'acc_1', name: 'Cash', type: 'Cash', openingBalance: 0 };
const ACC2 = { id: 'acc_2', name: 'Bank', type: 'Bank', openingBalance: 10000 };

function tx(id, type, amount, date = '2026-11-05', extra = {}) {
  return { id, type, amount, date, category: extra.category || 'Other', description: extra.description || '', accountId: extra.accountId || 'acc_1' };
}

/* ================================================================== */
describe('numeric helpers', () => {
  it('rounds to 2 decimals without floating point noise', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1000.005)).toBe(1000.01);
    expect(round2('abc')).toBe(0);
  });

  it('parses user input safely', () => {
    expect(toAmount('1,250.50')).toBe(1250.5);
    expect(toAmount('')).toBe(0);
    expect(toAmount('abc')).toBe(0);
    expect(toAmount(undefined)).toBe(0);
  });

  it('never divides by zero', () => {
    expect(percentOf(50, 0)).toBe(0);
  });
});

/* ================================================================== */
describe('totals', () => {
  it('adds income and expenses separately', () => {
    const t = totals([tx('1', 'income', 25000), tx('2', 'expense', 5000)]);
    expect(t.income).toBe(25000);
    expect(t.expenses).toBe(5000);
    expect(t.net).toBe(20000);
    expect(t.count).toBe(2);
  });

  it('never counts an expense as income', () => {
    const t = totals([tx('1', 'expense', 5000)]);
    expect(t.income).toBe(0);
    expect(t.expenses).toBe(5000);
    expect(t.net).toBe(-5000);
  });

  it('ignores invalid or zero amounts', () => {
    const t = totals([tx('1', 'income', 0), null, tx('2', 'income', -100), tx('3', 'expense', 'abc')]);
    expect(t.income).toBe(0);
    expect(t.expenses).toBe(0);
    expect(t.count).toBe(0);
  });
});

/* ================================================================== */
describe('REQUIRED SCENARIO: available balance walkthrough', () => {
  let transactions = [];
  let accounts = [ACC];

  it('starts at zero', () => {
    const s = balanceSummary(accounts, transactions);
    expect(s.availableBalance).toBe(0);
  });

  it('adds 25,000 income -> balance 25,000', () => {
    transactions = addTransaction(transactions, {
      id: 'tx_income_1', type: 'income', amount: 25000, date: '2026-11-01', category: 'Salary', accountId: 'acc_1'
    });
    const s = balanceSummary(accounts, transactions);
    expect(s.income).toBe(25000);
    expect(s.expenses).toBe(0);
    expect(s.availableBalance).toBe(25000);
  });

  it('adds 5,000 expense -> balance 20,000', () => {
    transactions = addTransaction(transactions, {
      id: 'tx_expense_1', type: 'expense', amount: 5000, date: '2026-11-03', category: 'Food', accountId: 'acc_1'
    });
    const s = balanceSummary(accounts, transactions);
    expect(s.expenses).toBe(5000);
    expect(s.availableBalance).toBe(20000);
  });

  it('edits the expense 5,000 -> 3,000 -> balance 22,000', () => {
    transactions = updateTransaction(transactions, 'tx_expense_1', { amount: 3000 });
    const s = balanceSummary(accounts, transactions);
    expect(s.expenses).toBe(3000);
    expect(s.availableBalance).toBe(22000);
    expect(transactions).toHaveLength(2);
  });

  it('deletes the expense -> balance 25,000', () => {
    transactions = deleteTransaction(transactions, 'tx_expense_1');
    const s = balanceSummary(accounts, transactions);
    expect(s.expenses).toBe(0);
    expect(s.availableBalance).toBe(25000);
    expect(transactions).toHaveLength(1);
  });

  it('account balance matches the dashboard balance', () => {
    const s = balanceSummary(accounts, transactions);
    expect(s.accounts[0].balance).toBe(25000);
    expect(s.accountTotal).toBe(s.availableBalance);
  });

  it('adds 2,000 more income -> 27,000 and 3,000 more expense -> 24,000', () => {
    let txs = addTransaction(transactions, tx('inc2', 'income', 2000));
    expect(balanceSummary(accounts, txs).availableBalance).toBe(27000);

    txs = addTransaction(txs, tx('exp2', 'expense', 3000));
    expect(balanceSummary(accounts, txs).availableBalance).toBe(24000);
  });
});

/* ================================================================== */
describe('opening balances and multiple accounts', () => {
  it('includes opening balance in the available balance', () => {
    const s = balanceSummary([ACC2], [tx('1', 'income', 5000)]);
    expect(s.openingBalance).toBe(10000);
    expect(s.availableBalance).toBe(15000);
  });

  it('computes each account balance separately', () => {
    const txs = [
      tx('1', 'income', 5000, '2026-11-01', { accountId: 'acc_1' }),
      tx('2', 'expense', 2000, '2026-11-02', { accountId: 'acc_1' }),
      tx('3', 'income', 8000, '2026-11-03', { accountId: 'acc_2' }),
      tx('4', 'expense', 1000, '2026-11-04', { accountId: 'acc_2' })
    ];
    expect(accountBalance(ACC, txs)).toBe(3000);   // 0 + 5000 - 2000
    expect(accountBalance(ACC2, txs)).toBe(17000); // 10000 + 8000 - 1000

    const s = balanceSummary([ACC, ACC2], txs);
    // Combined account balances must equal the overall available balance.
    expect(s.accountTotal).toBe(20000);
    expect(s.availableBalance).toBe(20000);
  });

  it('keeps the combined balance unchanged for a transfer between accounts', () => {
    const base = [tx('1', 'income', 5000, '2026-11-01', { accountId: 'acc_1' })];
    const before = balanceSummary([ACC, ACC2], base);

    // A transfer = money out of one account + money into the other,
    // both halves flagged with isTransfer: true.
    const transfer = [
      { ...tx('out', 'expense', 2000, '2026-11-02', { accountId: 'acc_1', description: 'Transfer to Bank' }), isTransfer: true, transferGroupId: 'tr1' },
      { ...tx('in', 'income', 2000, '2026-11-02', { accountId: 'acc_2', description: 'Transfer from Cash' }), isTransfer: true, transferGroupId: 'tr1' }
    ];
    const after = balanceSummary([ACC, ACC2], [...base, ...transfer]);

    // Neither income nor expenses changed, so the overall balance is identical.
    expect(after.income).toBe(before.income);
    expect(after.expenses).toBe(before.expenses);
    expect(after.availableBalance).toBe(before.availableBalance);
    expect(after.accountTotal).toBe(before.accountTotal);
    // ...but the individual accounts moved money.
    expect(after.accounts[0].balance).toBe(3000);  // 5000 - 2000
    expect(after.accounts[1].balance).toBe(12000); // 10000 + 2000
  });

  it('a transfer is never counted as income or as an expense', () => {
    const t = totals([
      { id: 'o', type: 'expense', amount: 2000, date: '2026-11-02', isTransfer: true },
      { id: 'i', type: 'income', amount: 2000, date: '2026-11-02', isTransfer: true },
      tx('r', 'income', 1000)
    ]);
    expect(t.income).toBe(1000);
    expect(t.expenses).toBe(0);
    expect(t.count).toBe(1);
    // Category charts ignore transfers too.
    expect(categoryBreakdown([
      { id: 'o', type: 'expense', amount: 2000, category: 'Transfer', isTransfer: true }
    ], 'expense')).toHaveLength(0);
  });

  it('makeAccount normalises its opening balance', () => {
    const acc = makeAccount({ name: '  UPI  ', openingBalance: '1,500.555', type: 'UPI / Wallet' });
    expect(acc.name).toBe('UPI');
    expect(acc.openingBalance).toBe(1500.56);
    expect(acc.id).toMatch(/^acc_/);
  });
});

/* ================================================================== */
describe('transaction edit / delete effects', () => {
  it('reverses the old effect and applies the new one when editing', () => {
    let txs = addTransaction([], { id: 'a', type: 'income', amount: 10000, date: '2026-11-01' });
    txs = addTransaction(txs, { id: 'b', type: 'expense', amount: 4000, date: '2026-11-02' });
    expect(totals(txs).net).toBe(6000);

    // Expense 4000 -> 1500 : only the difference is applied.
    txs = updateTransaction(txs, 'b', { amount: 1500 });
    expect(totals(txs).expenses).toBe(1500);
    expect(totals(txs).net).toBe(8500);
  });

  it('turning an expense into an income flips its sign once, not twice', () => {
    let txs = [{ id: 'x', type: 'expense', amount: 1000, date: '2026-11-01', category: 'Food' }];
    expect(totals(txs).net).toBe(-1000);

    txs = updateTransaction(txs, 'x', { type: 'income' });
    expect(totals(txs).income).toBe(1000);
    expect(totals(txs).expenses).toBe(0);
    expect(totals(txs).net).toBe(1000);
    expect(txs).toHaveLength(1);
  });

  it('deleting an income removes it from income and from the balance', () => {
    let txs = addTransaction([], { id: 'a', type: 'income', amount: 7000, date: '2026-11-01' });
    expect(totals(txs).net).toBe(7000);
    txs = deleteTransaction(txs, 'a');
    expect(totals(txs).net).toBe(0);
  });

  it('deleting something that does not exist changes nothing', () => {
    const txs = [tx('keep', 'income', 100)];
    expect(deleteTransaction(txs, 'missing')).toHaveLength(1);
  });

  it('does not mutate the original array', () => {
    const original = [tx('a', 'income', 100)];
    const added = addTransaction(original, tx('b', 'income', 200));
    expect(original).toHaveLength(1);
    expect(added).toHaveLength(2);
  });

  it('rejects transactions with an invalid amount', () => {
    expect(addTransaction([], { type: 'income', amount: 0 })).toHaveLength(0);
    expect(addTransaction([], { type: 'income', amount: -5 })).toHaveLength(0);
  });
});

/* ================================================================== */
describe('search, filter and sort', () => {
  const list = [
    tx('1', 'income', 25000, '2026-11-01', { category: 'Salary', description: 'Monthly salary' }),
    tx('2', 'expense', 500, '2026-11-03', { category: 'Food', description: 'Groceries' }),
    tx('3', 'expense', 1500, '2026-10-20', { category: 'Transport', description: 'Bus pass' })
  ];

  it('filters by text', () => {
    expect(filterTransactions(list, { search: 'groc' })).toHaveLength(1);
    expect(filterTransactions(list, { search: 'SALARY' })).toHaveLength(1);
  });

  it('filters by type, category and month', () => {
    expect(filterTransactions(list, { type: 'expense' })).toHaveLength(2);
    expect(filterTransactions(list, { category: 'Transport' })).toHaveLength(1);
    expect(filterTransactions(list, { month: '2026-10' })).toHaveLength(1);
  });

  it('sorts by date and amount', () => {
    expect(sortTransactions(list, 'date-asc')[0].id).toBe('3');
    expect(sortTransactions(list, 'date-desc')[0].id).toBe('2');
    expect(sortTransactions(list, 'amount-desc')[0].id).toBe('1');
    expect(sortTransactions(list, 'amount-asc')[0].id).toBe('2');
  });
});

/* ================================================================== */
describe('budget', () => {
  const txs = [
    tx('1', 'expense', 4000, '2026-11-02', { category: 'Rent' }),
    tx('2', 'expense', 1000, '2026-11-09', { category: 'Food' }),
    tx('3', 'income', 20000, '2026-11-01', { category: 'Salary' }),
    tx('4', 'expense', 9000, '2026-10-15', { category: 'Shopping' })
  ];

  it('counts only this month and only expenses', () => {
    expect(monthlyExpenses(txs, '2026-11')).toBe(5000);
  });

  it('calculates remaining, utilisation and warning', () => {
    const b = budgetStatus({ monthlyLimit: 20000 }, txs, '2026-11');
    expect(b.spent).toBe(5000);
    expect(b.remaining).toBe(15000);
    expect(b.rawPercent).toBe(25);
    expect(b.level).toBe('safe');
    expect(b.warning).toBe(false);
    expect(b.exceeded).toBe(false);
  });

  it('warns at 80% and above', () => {
    const b = budgetStatus({ monthlyLimit: 6000 }, txs, '2026-11');
    expect(b.rawPercent).toBe(83.33);
    expect(b.level).toBe('warning');
    expect(b.warning).toBe(true);
  });

  it('flags an exceeded budget and a negative remaining amount', () => {
    const b = budgetStatus({ monthlyLimit: 4000 }, txs, '2026-11');
    expect(b.exceeded).toBe(true);
    expect(b.remaining).toBe(-1000);
    expect(b.level).toBe('over');
    // The progress bar is capped at 100 even when overspent.
    expect(b.percent).toBe(100);
    expect(b.rawPercent).toBe(125);
  });

  it('recalculates after an expense is edited or deleted', () => {
    let t = updateTransaction(txs, '2', { amount: 2500 });
    expect(budgetStatus({ monthlyLimit: 20000 }, t, '2026-11').spent).toBe(6500);

    t = deleteTransaction(t, '1');
    expect(budgetStatus({ monthlyLimit: 20000 }, t, '2026-11').spent).toBe(2500);
  });

  it('handles a missing budget gracefully', () => {
    const b = budgetStatus({ monthlyLimit: 0 }, txs, '2026-11');
    expect(b.hasBudget).toBe(false);
    expect(b.percent).toBe(0);
    expect(b.remaining).toBe(0);
  });
});

/* ================================================================== */
describe('savings goals', () => {
  it('adds starting savings plus contributions', () => {
    let goal = makeGoal({ name: 'Laptop', targetAmount: 60000, startingAmount: 5000 });
    expect(goalSaved(goal)).toBe(5000);

    goal = addContribution(goal, 10000, 'First save', '2026-11-01');
    goal = addContribution(goal, 5000, 'Bonus', '2026-11-05');

    expect(goalSaved(goal)).toBe(20000);
    const p = goalProgress(goal);
    expect(p.saved).toBe(20000);
    expect(p.target).toBe(60000);
    expect(p.remaining).toBe(40000);
    expect(p.rawPercent).toBe(33.33);
    expect(p.completed).toBe(false);
    expect(goal.contributions).toHaveLength(2);
  });

  it('marks a goal complete and caps progress at 100%', () => {
    let goal = makeGoal({ name: 'Phone', targetAmount: 10000, startingAmount: 9000 });
    goal = addContribution(goal, 3000);
    const p = goalProgress(goal);
    expect(p.saved).toBe(12000);
    expect(p.remaining).toBe(0);
    expect(p.completed).toBe(true);
    expect(p.percent).toBe(100);
    expect(p.rawPercent).toBe(120);
  });

  it('contributions are NOT income transactions', () => {
    const goal = addContribution(makeGoal({ name: 'Trip', targetAmount: 1000, startingAmount: 0 }), 500);
    // The transactions list is untouched, so totals stay at zero.
    expect(totals([]).income).toBe(0);
    expect(goalSaved(goal)).toBe(500);
  });

  it('ignores invalid contributions', () => {
    const goal = makeGoal({ name: 'X', targetAmount: 100, startingAmount: 0 });
    expect(addContribution(goal, 0).contributions).toHaveLength(0);
    expect(addContribution(goal, -50).contributions).toHaveLength(0);
  });
});

/* ================================================================== */
describe('recurring expenses', () => {
  it('advances dates correctly for every frequency', () => {
    expect(nextOccurrence('2026-01-31', 'monthly')).toBe('2026-02-28');
    expect(nextOccurrence('2026-11-10', 'daily')).toBe('2026-11-11');
    expect(nextOccurrence('2026-11-10', 'weekly')).toBe('2026-11-17');
    expect(nextOccurrence('2026-11-10', 'yearly')).toBe('2027-11-10');
    expect(addMonths('2026-01-15', 2)).toBe('2026-03-15');
  });

  it('creates one transaction per due period', () => {
    const rule = makeRecurring({
      description: 'Rent', amount: 5000, category: 'Rent', frequency: 'monthly', startDate: '2026-09-01'
    });
    const { created } = generateRecurringTransactions(rule, [], '2026-11-15');
    expect(created).toHaveLength(3); // Sep, Oct, Nov
    expect(created.map((c) => c.date)).toEqual(['2026-09-01', '2026-10-01', '2026-11-01']);
    expect(created.every((c) => c.type === 'expense')).toBe(true);
  });

  it('never creates duplicates for the same date', () => {
    const rule = makeRecurring({
      description: 'Netflix', amount: 199, category: 'Entertainment', frequency: 'monthly', startDate: '2026-10-01'
    });
    const first = processRecurring([rule], [], '2026-11-15');
    expect(first.createdCount).toBe(2);

    // Running again with the updated rule must create nothing new.
    const second = processRecurring(first.recurring, first.transactions, '2026-11-15');
    expect(second.createdCount).toBe(0);
    expect(second.transactions).toHaveLength(2);

    // And a third run on a later date creates exactly one more.
    const third = processRecurring(second.recurring, second.transactions, '2026-12-01');
    expect(third.createdCount).toBe(1);
    expect(third.transactions).toHaveLength(3);
  });

  it('does not generate anything for a paused rule', () => {
    const rule = { ...makeRecurring({ description: 'Gym', amount: 1000, startDate: '2026-01-01' }), active: false };
    expect(generateRecurringTransactions(rule, [], '2026-11-15').created).toHaveLength(0);
  });

  it('generated recurring expenses reduce the balance', () => {
    const rule = makeRecurring({ description: 'Rent', amount: 5000, frequency: 'monthly', startDate: '2026-11-01' });
    const { transactions } = processRecurring([rule], [tx('i', 'income', 25000, '2026-11-01')], '2026-11-15');
    expect(balanceSummary([], transactions).availableBalance).toBe(20000);
  });
});

/* ================================================================== */
describe('reports and charts', () => {
  const txs = [
    tx('1', 'income', 25000, '2026-11-01', { category: 'Salary' }),
    tx('2', 'expense', 4000, '2026-11-02', { category: 'Rent' }),
    tx('3', 'expense', 1000, '2026-11-05', { category: 'Food' }),
    tx('4', 'income', 5000, '2026-10-01', { category: 'Freelance' }),
    tx('5', 'expense', 2000, '2026-10-10', { category: 'Food' })
  ];

  it('computes a month report', () => {
    const r = monthReport(txs, '2026-11');
    expect(r.income).toBe(25000);
    expect(r.expenses).toBe(5000);
    expect(r.savings).toBe(20000);
    expect(r.savingsRate).toBe(80);
    expect(r.label).toBe('November 2026');
  });

  it('builds the category breakdown sorted by amount', () => {
    const cats = categoryBreakdown(txs, 'expense');
    expect(cats[0]).toEqual({ category: 'Rent', amount: 4000, percent: 57.14 });
    expect(cats[1]).toEqual({ category: 'Food', amount: 3000, percent: 42.86 });
  });

  it('builds a monthly summary oldest-first', () => {
    const summary = monthlySummary(txs, 6);
    expect(summary).toHaveLength(2);
    expect(summary[0].month).toBe('2026-10');
    expect(summary[1].month).toBe('2026-11');
    expect(summary[0].savings).toBe(3000);
    expect(summary[1].savings).toBe(20000);
  });

  it('extracts month keys from dates', () => {
    expect(monthKey('2026-11-09')).toBe('2026-11');
  });
});
