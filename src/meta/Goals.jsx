import { useEffect, useMemo, useState } from 'react';
import { addRecord, removeRecord, updateRecord } from '../data/genericRecords';
import { modules } from '../config/modules';
import { getAnonymousUser, isSupabaseConfigured } from '../data/supabaseClient';
import { listAllRowsForUser } from '../data/pagedRecords';
import { calculateGoalProgress, entryTotalFor, goalBaselineFor } from '../lib/engineLogic';

const compatibleModules = modules.filter((module) => module.goalProgress?.compatible);
const units = (module) => ['budget', 'savings', 'net-worth', 'investments'].includes(module.id)
  ? module.entryTracker?.currency?.base ?? 'USD'
  : module.entryTracker?.value.unit ?? 'items';

export default function Goals() {
  const [user, setUser] = useState(null);
  const [goals, setGoals] = useState([]);
  const [entries, setEntries] = useState([]);
  const [totals, setTotals] = useState({});
  const [title, setTitle] = useState('');
  const [moduleId, setModuleId] = useState('savings');
  const [target, setTarget] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [editing, setEditing] = useState(null);
  const [status, setStatus] = useState('');

  const refresh = async (active = user) => {
    if (!active) return;
    const [storedResult, entryResult] = await Promise.all([
      listAllRowsForUser('goals', active.id, { orderColumn: 'created_at' }),
      listAllRowsForUser('entry_records', active.id, { orderColumn: 'occurred_at' }),
    ]);
    const stored = storedResult.rows;
    const allEntries = entryResult.rows;
    const nextTotals = {};
    compatibleModules.forEach((module) => { nextTotals[module.id] = entryTotalFor(module.id, allEntries); });
    setGoals(stored);
    setEntries(allEntries);
    setTotals(nextTotals);
    if (storedResult.truncated || entryResult.truncated) setStatus('Goals are calculated from the newest 5,000 records per table.');
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    getAnonymousUser().then(async (active) => {
      setUser(active);
      await refresh(active);
    }).catch((error) => setStatus(error.message));
  }, []);

  const selected = compatibleModules.find((module) => module.id === moduleId) ?? compatibleModules[0];
  const activeGoals = useMemo(() => goals.filter((goal) => !goal.is_complete), [goals]);

  async function save(event) {
    event.preventDefault();
    if (!title.trim() || !user || Number(target) <= 0) return;
    const patch = {
      title,
      target_module_id: moduleId,
      target_value: Number(target),
      target_unit: units(selected),
      due_at: dueAt || null,
    };
    try {
      if (editing) await updateRecord('goals', editing.id, patch);
      else await addRecord('goals', { user_id: user.id, module_id: 'goals', ...patch, is_complete: false });
      setTitle('');
      setTarget('');
      setDueAt('');
      setEditing(null);
      await refresh();
    } catch (error) {
      setStatus(error.message.includes('target_value') ? 'Run goals-rich-migration.sql in Supabase, then try again.' : error.message);
    }
  }

  function beginEdit(goal) {
    setEditing(goal);
    setTitle(goal.title);
    setModuleId(goal.target_module_id);
    setTarget(String(goal.target_value ?? ''));
    setDueAt(goal.due_at ?? '');
  }

  return <main className="tracker-shell">
    <section className="suite-grid goals-grid">
      <header className="suite-header"><div><span className="eyebrow">Across compatible trackers</span><h1>Goals</h1></div><small>{activeGoals.length} active</small></header>
      <form className="suite-card composer-card" onSubmit={save}>
        <span className="section-label">{editing ? 'Edit goal' : 'Create a measurable goal'}</span>
        <label>Goal title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Build my emergency fund" /></label>
        <label>Track module<select value={moduleId} onChange={(event) => setModuleId(event.target.value)}>{compatibleModules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label>
        <label>Target ({units(selected)})<input required type="number" min="0.01" value={target} onChange={(event) => setTarget(event.target.value)} /></label>
        <label>Target date <span className="optional">optional</span><input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label>
        <button>{editing ? 'Save changes' : 'Add goal'}</button>
        {editing && <button className="text-button" type="button" onClick={() => { setEditing(null); setTitle(''); setTarget(''); setDueAt(''); }}>Cancel</button>}
      </form>
      <section className="suite-card suite-records">
        <span className="section-label">Your goals</span>
        <small>Progress uses an explicit direction from the module configuration. Snapshot trackers use their first recorded value as the baseline; cumulative trackers start from zero.</small>
        <ul>{goals.map((goal) => {
          const module = compatibleModules.find((item) => item.id === goal.target_module_id);
          const current = totals[goal.target_module_id] ?? 0;
          const baseline = goalBaselineFor(goal.target_module_id, entries, module?.goalProgress?.baseline);
          const progress = goal.target_value ? calculateGoalProgress({ currentValue: current, targetValue: goal.target_value, baselineValue: baseline, direction: module?.goalProgress?.direction }) : 0;
          return <li key={goal.id}><span><strong>{goal.title}</strong><small>{module?.title ?? 'Tracker'} · {current.toLocaleString()} / {Number(goal.target_value).toLocaleString()} {goal.target_unit ?? ''}{goal.due_at ? ` · due ${new Date(goal.due_at).toLocaleDateString()}` : ''} · {progress.toFixed(1)}%</small><div className="progress"><i style={{ width: `${progress}%` }} /></div></span><button onClick={() => beginEdit(goal)}>Edit</button><button onClick={() => updateRecord('goals', goal.id, { is_complete: !goal.is_complete }).then(refresh)}>{goal.is_complete ? 'Reopen' : 'Done'}</button><button onClick={() => removeRecord('goals', goal.id).then(refresh)}>×</button></li>;
        })}</ul>
        {!goals.length && <p className="empty-copy">Turn a compatible tracker into a concrete next milestone.</p>}
      </section>
      {status && <p className="status">{status}</p>}
    </section>
  </main>;
}
