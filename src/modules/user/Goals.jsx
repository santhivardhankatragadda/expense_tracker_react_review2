/**
 * Goals.jsx  (User Module)
 * ------------------------------------------------------------------
 * Savings goals: target amount, starting savings, contributions,
 * history, remaining amount and progress percentage.
 *
 * IMPORTANT: a contribution is money you move into savings. It is NOT a
 * new income transaction, so it never appears in the transaction list and
 * never inflates Total Income. Progress = starting + contributions.
 * ------------------------------------------------------------------
 */
import React, { useMemo, useState } from 'react';
import { Card, Modal, ConfirmDialog, ProgressBar, Badge, EmptyState, Icon } from '../../components/Shared.jsx';
import { formatINR, goalProgress, toAmount, todayISO } from '../../services/finance.js';
import { validateAmount, sanitizeText } from '../security/security.js';

export default function Goals({ data, createGoal, contributeToGoal, deleteGoal, notify }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', targetAmount: '', startingAmount: '', targetDate: '' });
  const [errors, setErrors] = useState({});

  const [contribTarget, setContribTarget] = useState(null);
  const [contrib, setContrib] = useState({ amount: '', note: '', date: todayISO() });
  const [contribError, setContribError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const goals = data.goals;
  const totals = useMemo(() => {
    const saved = goals.reduce((s, g) => s + goalProgress(g).saved, 0);
    const target = goals.reduce((s, g) => s + goalProgress(g).target, 0);
    const completed = goals.filter((g) => goalProgress(g).completed).length;
    return { saved, target, completed, remaining: Math.max(target - saved, 0) };
  }, [goals]);

  function submitGoal(e) {
    e.preventDefault();
    const found = {};
    if (!form.name.trim()) found.name = 'Goal name is required.';
    const targetCheck = validateAmount(form.targetAmount);
    if (!targetCheck.valid) found.targetAmount = targetCheck.message;
    if (form.startingAmount !== '' && Number(form.startingAmount) < 0) found.startingAmount = 'Cannot be negative.';
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    createGoal({
      name: sanitizeText(form.name, 40),
      targetAmount: toAmount(form.targetAmount),
      startingAmount: toAmount(form.startingAmount || 0),
      targetDate: form.targetDate
    });
    setShowForm(false);
    setForm({ name: '', targetAmount: '', startingAmount: '', targetDate: '' });
    notify('Goal created.', 'success');
  }

  function submitContribution(e) {
    e.preventDefault();
    setContribError('');
    const check = validateAmount(contrib.amount);
    if (!check.valid) {
      setContribError(check.message);
      return;
    }
    contributeToGoal(contribTarget.id, toAmount(contrib.amount), sanitizeText(contrib.note, 120), contrib.date);
    notify(`${formatINR(contrib.amount)} added to "${contribTarget.name}".`, 'success');
    setContribTarget(null);
    setContrib({ amount: '', note: '', date: todayISO() });
  }

  return (
    <div className="stack">
      <div className="stat-grid stat-grid-4">
        <StatCardSimple label="Active goals" value={String(goals.length)} />
        <StatCardSimple label="Total saved" value={formatINR(totals.saved)} tone="green" />
        <StatCardSimple label="Total target" value={formatINR(totals.target)} tone="violet" />
        <StatCardSimple label="Goals completed" value={`${totals.completed} / ${goals.length}`} tone="teal" />
      </div>

      <Card
        title="Savings goals"
        subtitle="Contributions build progress but are not counted as new income"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => { setErrors({}); setShowForm(true); }}>
            <Icon name="plus" size={15} /> New goal
          </button>
        }
      >
        {goals.length === 0 ? (
          <EmptyState
            icon="goal"
            title="No savings goals yet"
            message="Create a goal such as a laptop, trip or emergency fund."
            action={<button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>Create goal</button>}
          />
        ) : (
          <div className="goal-grid">
            {goals.map((goal) => {
              const p = goalProgress(goal);
              const history = Array.isArray(goal.contributions) ? goal.contributions : [];
              return (
                <div key={goal.id} className="goal-card">
                  <div className="goal-card-head">
                    <div>
                      <strong>{goal.name}</strong>
                      {goal.targetDate && <small>Target date {goal.targetDate}</small>}
                    </div>
                    <Badge tone={p.completed ? 'green' : 'violet'}>{p.completed ? 'Completed' : `${Math.round(p.rawPercent)}%`}</Badge>
                  </div>

                  <ProgressBar percent={p.percent} tone={p.completed ? 'green' : 'violet'} />

                  <div className="mini-grid">
                    <div><small>Saved</small><strong className="text-green">{formatINR(p.saved)}</strong></div>
                    <div><small>Remaining</small><strong>{formatINR(p.remaining)}</strong></div>
                    <div><small>Target</small><strong>{formatINR(p.target)}</strong></div>
                  </div>

                  <div className="goal-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => { setContribError(''); setContribTarget(goal); }}>
                      <Icon name="plus" size={14} /> Add contribution
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(expanded === goal.id ? null : goal.id)}>
                      History ({history.length})
                    </button>
                    <button className="icon-btn danger" title="Delete goal" onClick={() => setPendingDelete(goal)}>
                      <Icon name="trash" size={16} />
                    </button>
                  </div>

                  {expanded === goal.id && (
                    <div className="goal-history">
                      <div className="goal-history-row muted">
                        <span>{goal.createdAt ? goal.createdAt.slice(0, 10) : '—'}</span>
                        <span>Starting savings</span>
                        <span className="right">{formatINR(goal.startingAmount)}</span>
                      </div>
                      {history.length === 0 ? (
                        <p className="muted small">No contributions recorded yet.</p>
                      ) : (
                        history.map((c) => (
                          <div key={c.id} className="goal-history-row">
                            <span>{c.date}</span>
                            <span className="muted">{c.note || 'Contribution'}</span>
                            <span className="right text-green">+{formatINR(c.amount)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {showForm && (
        <Modal
          title="Create savings goal"
          subtitle="Set the amount you want to save and what you have already put aside."
          onClose={() => setShowForm(false)}
        >
          <form className="form-grid" onSubmit={submitGoal}>
            <label className="field span-2">
              <span className="field-label">Goal name</span>
              <input
                className={`input ${errors.name ? 'input-error' : ''}`}
                type="text"
                maxLength={40}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. New laptop"
                autoFocus
              />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </label>

            <label className="field">
              <span className="field-label">Target amount (₹)</span>
              <input
                className={`input ${errors.targetAmount ? 'input-error' : ''}`}
                type="number"
                min="0"
                step="0.01"
                value={form.targetAmount}
                onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                placeholder="60000"
              />
              {errors.targetAmount && <span className="field-error">{errors.targetAmount}</span>}
            </label>

            <label className="field">
              <span className="field-label">Starting savings (₹)</span>
              <input
                className={`input ${errors.startingAmount ? 'input-error' : ''}`}
                type="number"
                min="0"
                step="0.01"
                value={form.startingAmount}
                onChange={(e) => setForm({ ...form, startingAmount: e.target.value })}
                placeholder="0"
              />
              {errors.startingAmount && <span className="field-error">{errors.startingAmount}</span>}
            </label>

            <label className="field span-2">
              <span className="field-label">Target date (optional)</span>
              <input className="input" type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} />
            </label>

            <div className="form-actions span-2">
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create goal</button>
            </div>
          </form>
        </Modal>
      )}

      {contribTarget && (
        <Modal
          title={`Add contribution — ${contribTarget.name}`}
          subtitle="This increases the saved amount only. It is not added to Total Income."
          onClose={() => setContribTarget(null)}
        >
          <form className="form-grid" onSubmit={submitContribution}>
            <label className="field">
              <span className="field-label">Amount (₹)</span>
              <input
                className={`input ${contribError ? 'input-error' : ''}`}
                type="number"
                min="0"
                step="0.01"
                value={contrib.amount}
                onChange={(e) => setContrib({ ...contrib, amount: e.target.value })}
                autoFocus
              />
              {contribError && <span className="field-error">{contribError}</span>}
            </label>

            <label className="field">
              <span className="field-label">Date</span>
              <input className="input" type="date" value={contrib.date} onChange={(e) => setContrib({ ...contrib, date: e.target.value })} />
            </label>

            <label className="field span-2">
              <span className="field-label">Note (optional)</span>
              <input className="input" type="text" maxLength={120} value={contrib.note} onChange={(e) => setContrib({ ...contrib, note: e.target.value })} placeholder="e.g. Salary savings" />
            </label>

            <div className="form-actions span-2">
              <button type="button" className="btn btn-ghost" onClick={() => setContribTarget(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Add contribution</button>
            </div>
          </form>
        </Modal>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete goal?"
          message={`"${pendingDelete.name}" and its contribution history will be removed. Your balance and income are not affected.`}
          onConfirm={() => {
            deleteGoal(pendingDelete.id);
            setPendingDelete(null);
            notify('Goal deleted.', 'success');
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

function StatCardSimple({ label, value, tone = 'default' }) {
  return (
    <div className={`stat-card tone-${tone}`}>
      <span className="stat-label">{label}</span>
      <div className="stat-value">{value}</div>
    </div>
  );
}
