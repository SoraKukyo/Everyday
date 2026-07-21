import { useEffect, useMemo, useState } from 'react';
import { engines, modules } from '../config/modules';
import { getAnonymousUser } from '../data/supabaseClient';
import { listAllRowsForUser } from '../data/pagedRecords';
import ModuleCard from '../components/ModuleCard';

const tableByEngine = { entryTracker: 'entry_records', checklist: 'checklist_items', streakTracker: 'streak_checkins', savedItems: 'saved_items', dueDateTracker: 'due_items' };
const orderColumnByTable = { entry_records: 'occurred_at', checklist_items: 'created_at', streak_checkins: 'completed_on', saved_items: 'created_at', due_items: 'created_at' };
const today = new Date().toISOString().slice(0, 10);
const month = today.slice(0, 7);
const value = (number) => Number(number || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });
const active = (row) => !row.is_complete && !row.archived_at && !row.metadata?.archived_at;
function currentStreak(rows) { let count = 0; for (let offset = 0; offset < 730; offset += 1) { const date = new Date(); date.setUTCDate(date.getUTCDate() - offset); const key = date.toISOString().slice(0, 10); if (!rows.some((row) => row.completed_on === key)) break; count += 1; } return count; }
function netWorth(rows) { const latest = {}; rows.forEach((row) => { const account = row.fields?.account || 'Total snapshot'; if (!latest[account] || new Date(row.occurred_at) > new Date(latest[account].occurred_at)) latest[account] = row; }); return Object.values(latest).reduce((sum, row) => sum + (row.fields?.type === 'Liability' ? -Number(row.value) : Number(row.value)), 0); }
function snapshot(module, byTable) {
  const rows = (byTable[tableByEngine[module.engine]] ?? []).filter((row) => row.module_id === module.id);
  if (module.engine === 'checklist') return `${rows.filter(active).length} open · ${rows.filter((row) => row.is_complete).length} done`;
  if (module.engine === 'streakTracker') return `${currentStreak(rows)}-day streak`;
  if (module.engine === 'savedItems') return `${rows.filter((row) => !row.metadata?.archived_at).length} saved`;
  if (module.engine === 'dueDateTracker') { const due = rows.filter(active); const overdue = due.filter((row) => row.due_at && row.due_at < today).length; return overdue ? `${overdue} overdue` : `${due.length} active`; }
  const usable = rows.filter((row) => !row.metadata?.archived_at);
  if (module.id === 'calories') return `${value(usable.filter((row) => row.occurred_at.slice(0, 10) === today && row.metadata?.kind !== 'calorie_burn' && row.metadata?.kind !== 'day_skip').reduce((sum, row) => sum + Number(row.value), 0))} kcal today`;
  if (module.id === 'budget') return `${value(rows.filter((row) => row.occurred_at.slice(0, 7) === month && row.metadata?.transactionType !== 'income').reduce((sum, row) => sum + Number(row.value), 0))} spent this month`;
  if (module.id === 'water') return `${value(rows.filter((row) => row.occurred_at.slice(0, 10) === today).reduce((sum, row) => sum + Number(row.value), 0))} ml today`;
  if (module.id === 'steps') return `${value(rows.filter((row) => row.occurred_at.slice(0, 10) === today).reduce((sum, row) => sum + Number(row.value), 0))} steps today`;
  if (module.id === 'time-tracking') return `${value(rows.filter((row) => row.occurred_at.slice(0, 10) === today).reduce((sum, row) => sum + Number(row.value), 0))} min today`;
  if (module.id === 'weight') { const latest = [...usable].sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at))[0]; return latest ? `${value(latest.value)} kg latest` : 'No weigh-in yet'; }
  if (module.id === 'net-worth') return `${value(netWorth(rows))} current`;
  if (module.id === 'savings') return `${value(rows.reduce((sum, row) => sum + (row.metadata?.kind === 'withdrawal' ? -Number(row.value) : Number(row.value)), 0))} saved`;
  if (module.id === 'investments') return `${value(rows.filter((row) => row.metadata?.kind !== 'portfolio_snapshot').reduce((sum, row) => sum + Number(row.value), 0))} invested`;
  if (module.id === 'subscriptions') return `${value(rows.filter((row) => (row.fields?.status ?? 'Active') === 'Active').reduce((sum, row) => sum + Number(row.value) / (row.fields?.billingCycle === 'Yearly' ? 12 : 1), 0))}/mo`;
  return `${rows.length} records`;
}

export default function Dashboard({ onOpen }) {
  const [byTable, setByTable] = useState({}); const [actions, setActions] = useState({ overdue: [], upcoming: [], activeLists: 0, habits: 0 }); const [status, setStatus] = useState('');
  useEffect(() => { getAnonymousUser().then(async (user) => { const tables = [...new Set(Object.values(tableByEngine))]; const results = await Promise.all(tables.map(async (table) => [table, await listAllRowsForUser(table, user.id, { orderColumn: orderColumnByTable[table] })])); const next = Object.fromEntries(results.map(([table, result]) => [table, result.rows])); const truncated = results.filter(([, result]) => result.truncated).map(([table]) => table); const due = next.due_items ?? []; const checkins = next.streak_checkins ?? []; const lists = next.checklist_items ?? []; setByTable(next); setActions({ overdue: due.filter((row) => active(row) && row.due_at && row.due_at < today).sort((a, b) => a.due_at.localeCompare(b.due_at)).slice(0, 5), upcoming: due.filter((row) => active(row) && row.due_at && row.due_at >= today).sort((a, b) => a.due_at.localeCompare(b.due_at)).slice(0, 5), activeLists: lists.filter(active).length, habits: checkins.filter((row) => row.completed_on === today).length }); setStatus(truncated.length ? `Dashboard is showing the newest 5,000 records from: ${truncated.join(', ')}.` : ''); }).catch((error) => setStatus(error.message)); }, []);
  const actionCount = actions.overdue.length + actions.upcoming.length;
  const actionCards = useMemo(() => [{ label: 'Overdue', value: actions.overdue.length, tone: 'urgent' }, { label: 'Due next', value: actions.upcoming.length, tone: 'soon' }, { label: 'Open list items', value: actions.activeLists, tone: 'neutral' }, { label: 'Habit check-ins', value: actions.habits, tone: 'neutral' }], [actions]);
  return <main className="tracker-shell dashboard"><section className="dashboard-canvas"><header className="dashboard-header"><div><span className="eyebrow">Your everyday overview</span><h1>Today</h1><p>{actionCount ? `${actionCount} items need your attention` : 'You are all caught up.'}</p></div><span className="dashboard-date">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span></header><section className="dashboard-actions">{actionCards.map((card) => <div className={`action-stat ${card.tone}`} key={card.label}><small>{card.label}</small><strong>{card.value}</strong></div>)}</section><section className="dashboard-feature-grid">{modules.filter((module) => ['calories', 'habits', 'links', 'budget'].includes(module.id)).map((module) => <ModuleCard key={module.id} module={module} snapshot={snapshot(module, byTable)} onOpen={onOpen} featured={module.id === 'calories'} />)}</section><section className="suite-card dashboard-agenda"><div className="chart-title"><div><span className="section-label">Attention</span><h2>Deadlines</h2></div></div>{[...actions.overdue, ...actions.upcoming].length ? <ul>{[...actions.overdue, ...actions.upcoming].map((item) => <li key={item.id}><span><strong>{item.title}</strong><small>{item.due_at < today ? 'Overdue' : `Due ${new Date(item.due_at).toLocaleDateString()}`}</small></span><button onClick={() => onOpen(item.module_id)}>Open</button></li>)}</ul> : <p className="empty-copy">No upcoming deadlines. Nice.</p>}</section>{Object.entries(engines).map(([engine, title]) => <section key={engine} className="dashboard-group"><h2>{title}</h2><div className="module-grid">{modules.filter((module) => module.engine === engine && !['calories', 'habits', 'links', 'budget'].includes(module.id)).map((module) => <ModuleCard key={module.id} module={module} snapshot={snapshot(module, byTable)} onOpen={onOpen} />)}</div></section>)}{status && <p className="status">{status}</p>}</section></main>;
}
