/**
 * useUserData.js
 * ------------------------------------------------------------------
 * One custom hook that owns ALL of a signed-in user's financial data.
 *
 * Why a hook? Every page of the User Module needs the same data and the
 * same save behaviour. Writing it once here means pages only call small
 * functions such as addTransaction() or setBudget().
 *
 * Data shape (stored per user under "et_userdata_<userId>"):
 *   { transactions, accounts, budget, goals, recurring }
 * ------------------------------------------------------------------
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getUserData, saveUserData } from '../../services/storage.js';
import {
  addTransaction as addTxTo,
  updateTransaction as updateTxIn,
  deleteTransaction as deleteTxFrom,
  ensureAccount,
  makeAccount,
  makeGoal,
  addContribution,
  makeRecurring,
  processRecurring,
  budgetStatus,
  balanceSummary,
  todayISO
} from '../../services/finance.js';

export default function useUserData(userId) {
  const [data, setData] = useState(() => getUserData(userId));
  const [recurringNotice, setRecurringNotice] = useState('');

  /* -------------------------------------------------------------- */
  /* Load + repair the user's data, and post any due recurring bills  */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    const loaded = getUserData(userId);
    const accounts = ensureAccount(loaded.accounts);
    const processed = processRecurring(loaded.recurring, loaded.transactions, todayISO());

    const next = {
      ...loaded,
      accounts,
      transactions: processed.transactions,
      recurring: processed.recurring
    };
    setData(next);
    saveUserData(userId, next);

    if (processed.createdCount > 0) {
      setRecurringNotice(
        `${processed.createdCount} recurring transaction${processed.createdCount > 1 ? 's were' : ' was'} added automatically.`
      );
    }
  }, [userId]);

  /* Persist on every change. The user's data is never wiped here. */
  const commit = useCallback(
    (updater) => {
      setData((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        const clean = {
          transactions: next.transactions || [],
          accounts: next.accounts || [],
          budget: next.budget || { monthlyLimit: 0 },
          goals: next.goals || [],
          recurring: next.recurring || []
        };
        saveUserData(userId, clean);
        return clean;
      });
    },
    [userId]
  );

  /* ----------------------------- transactions ----------------------------- */
  const addTransaction = useCallback((tx) => commit((prev) => ({ ...prev, transactions: addTxTo(prev.transactions, tx) })), [commit]);
  const editTransaction = useCallback((id, changes) => commit((prev) => ({ ...prev, transactions: updateTxIn(prev.transactions, id, changes) })), [commit]);
  const removeTransaction = useCallback((id) => commit((prev) => ({ ...prev, transactions: deleteTxFrom(prev.transactions, id) })), [commit]);

  /* ------------------------------ accounts -------------------------------- */
  const addAccount = useCallback((account) => commit((prev) => ({ ...prev, accounts: [...ensureAccount(prev.accounts), makeAccount(account)] })), [commit]);
  const editAccount = useCallback(
    (id, changes) =>
      commit((prev) => ({
        ...prev,
        accounts: prev.accounts.map((acc) => (acc.id === id ? { ...acc, ...changes, openingBalance: Number(changes.openingBalance ?? acc.openingBalance) || 0 } : acc))
      })),
    [commit]
  );
  const removeAccount = useCallback((id) => commit((prev) => ({ ...prev, accounts: prev.accounts.filter((acc) => acc.id !== id) })), [commit]);

  /* ------------------------------- budget --------------------------------- */
  const setBudget = useCallback((monthlyLimit) => commit((prev) => ({ ...prev, budget: { monthlyLimit: Number(monthlyLimit) || 0 } })), [commit]);

  /* -------------------------------- goals --------------------------------- */
  const createGoal = useCallback((goal) => commit((prev) => ({ ...prev, goals: [makeGoal(goal), ...prev.goals] })), [commit]);
  const contributeToGoal = useCallback(
    (goalId, amount, note, date) =>
      commit((prev) => ({
        ...prev,
        goals: prev.goals.map((g) => (g.id === goalId ? addContribution(g, amount, note, date) : g))
      })),
    [commit]
  );
  const deleteGoal = useCallback((goalId) => commit((prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== goalId) })), [commit]);

  /* ------------------------------ recurring ------------------------------- */
  const addRecurring = useCallback((rule) => commit((prev) => ({ ...prev, recurring: [makeRecurring(rule), ...prev.recurring] })), [commit]);
  const toggleRecurring = useCallback(
    (id) =>
      commit((prev) => ({
        ...prev,
        recurring: prev.recurring.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
      })),
    [commit]
  );
  const deleteRecurring = useCallback(
    // Deleting a recurring rule keeps the transactions it already created,
    // because those are real money that moved.
    (id) => commit((prev) => ({ ...prev, recurring: prev.recurring.filter((r) => r.id !== id) })),
    [commit]
  );

  /* ------------------------------ derived --------------------------------- */
  const summary = useMemo(() => balanceSummary(data.accounts, data.transactions), [data.accounts, data.transactions]);
  const budget = useMemo(() => budgetStatus(data.budget, data.transactions), [data.budget, data.transactions]);

  return {
    data,
    summary,
    budget,
    recurringNotice,
    clearRecurringNotice: () => setRecurringNotice(''),
    addTransaction,
    editTransaction,
    removeTransaction,
    addAccount,
    editAccount,
    removeAccount,
    setBudget,
    createGoal,
    contributeToGoal,
    deleteGoal,
    addRecurring,
    toggleRecurring,
    deleteRecurring
  };
}
