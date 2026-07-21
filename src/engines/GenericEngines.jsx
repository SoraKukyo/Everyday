import { useEffect, useMemo, useState } from 'react';
import { addRecord, listRecordPage, removeRecord, updateRecord } from '../data/genericRecords';
import { getAnonymousUser, isSupabaseConfigured } from '../data/supabaseClient';
import StreakCalendar from '../components/StreakCalendar';
import { applyAutoFields, completionFieldPatch, matchesConfiguredFilter, namedStreakScope, recurrenceField } from './genericEngineBehavior';
import { completedStreak } from '../lib/engineLogic';

const PAGE_SIZE = 100;
const tableFor = { checklist: 'checklist_items', streakTracker: 'streak_checkins', savedItems: 'saved_items', dueDateTracker: 'due_items' };
const labelFor = { checklist: 'Add item', streakTracker: 'Check in today', savedItems: 'Save item', dueDateTracker: 'Add reminder' };
const day = (date = new Date()) => date.toISOString().slice(0, 10);
const addDays = (date, amount) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
const values = (record) => record.fields ?? record.metadata ?? {};
const archived = (record) => Boolean(record.archived_at || record.metadata?.archived_at);

function Field({ field, value, onChange }) {
  return <label>{field.label}{field.type === 'select'
    ? <select required={field.required} value={value ?? ''} onChange={(event) => onChange(event.target.value)}><option value="">Select...</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select>
    : <input required={field.required} type={field.type ?? 'text'} value={value ?? ''} onChange={(event) => onChange(event.target.value)} />}</label>;
}
function checklistHistoryLabel(record) { if (!record.is_complete) return ''; if (record.archived_at) return `Archived ${new Date(record.archived_at).toLocaleDateString()}`; if (record.completed_at) return `Completed ${new Date(record.completed_at).toLocaleDateString()}`; return 'Completed date unavailable'; }
function nextRecurringDate(value, repeat, monthlyAnchorDay) { const next = new Date(value); if (repeat === 'Weekly') { next.setDate(next.getDate() + 7); return next; } const originalDay = monthlyAnchorDay ?? next.getDate(); next.setDate(1); next.setMonth(next.getMonth() + 1); const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate(); next.setDate(Math.min(originalDay, lastDay)); return next; }
function safeLink(value) { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; } }

export default function GenericEngine({ module }) {
  const table = tableFor[module.engine];
  const isChecklist = module.engine === 'checklist'; const isStreak = module.engine === 'streakTracker'; const isSaved = module.engine === 'savedItems'; const isDue = module.engine === 'dueDateTracker';
  const listProfile = module.listExperience; const streakScope = namedStreakScope(module); const ledger = module.dueBehavior?.ledger;
  const [user, setUser] = useState(null); const [records, setRecords] = useState([]); const [hasMore, setHasMore] = useState(false); const [loadingMore, setLoadingMore] = useState(false);
  const [title, setTitle] = useState(''); const [date, setDate] = useState(day()); const [content, setContent] = useState(''); const [tags, setTags] = useState(''); const [fields, setFields] = useState({}); const [activeHabit, setActiveHabit] = useState('default');
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState('active'); const [groupFilter, setGroupFilter] = useState('all'); const [sort, setSort] = useState('smart'); const [editing, setEditing] = useState(null); const [undo, setUndo] = useState(null); const [status, setStatus] = useState(isSupabaseConfigured ? 'Connecting...' : 'Supabase configuration is required.');
  const [paymentDebtId, setPaymentDebtId] = useState(''); const [paymentAmount, setPaymentAmount] = useState(''); const [paymentDate, setPaymentDate] = useState(day()); const [paymentNote, setPaymentNote] = useState(''); const [editingPayment, setEditingPayment] = useState(null);

  const loadPage = async (active, offset = 0, append = false) => {
    if (!active) return;
    const page = await listRecordPage(table, active.id, module.id, offset, PAGE_SIZE);
    setRecords((current) => append ? [...current, ...page.filter((row) => !current.some((existing) => existing.id === row.id))] : page);
    setHasMore(page.length === PAGE_SIZE);
  };
  const refresh = async (active = user) => loadPage(active, 0, false);
  const loadMore = async () => { if (!user || loadingMore || !hasMore) return; setLoadingMore(true); try { await loadPage(user, records.length, true); } catch (error) { setStatus(error.message); } finally { setLoadingMore(false); } };
  useEffect(() => { if (!isSupabaseConfigured) return; getAnonymousUser().then(async (active) => { setUser(active); await refresh(active); setStatus(''); }).catch((error) => setStatus(error.message)); }, [module.id]);

  const streakRecordField = streakScope?.recordField ?? 'habit_key'; const selectedHabit = streakScope ? activeHabit.trim() || 'default' : 'default';
  const isLedgerPayment = (record) => Boolean(ledger && record.metadata?.recordKind === 'payment');
  const sourceRecords = useMemo(() => records.filter((record) => !isLedgerPayment(record)), [records, ledger]);
  const payments = useMemo(() => records.filter(isLedgerPayment).filter((record) => !archived(record)), [records, ledger]);
  const scopedStreakRecords = streakScope ? sourceRecords.filter((record) => (record[streakRecordField] || 'default') === selectedHabit) : sourceRecords;
  const habitKeys = useMemo(() => streakScope ? [...new Set([...sourceRecords.map((record) => record[streakRecordField] || 'default'), selectedHabit])].sort() : [], [sourceRecords, streakScope, streakRecordField, selectedHabit]);
  const completedToday = scopedStreakRecords.some((record) => record.completed_on === day()); const currentStreak = useMemo(() => completedStreak(scopedStreakRecords), [scopedStreakRecords]);
  const bestStreak = useMemo(() => { let best = 0; let run = 0; let previous = null; [...new Set(scopedStreakRecords.map((record) => record.completed_on))].sort().forEach((item) => { if (previous && (new Date(item) - new Date(previous)) / 86400000 === 1) run += 1; else run = 1; best = Math.max(best, run); previous = item; }); return best; }, [scopedStreakRecords]);
  const week = useMemo(() => Array.from({ length: 7 }, (_, index) => { const dateValue = day(addDays(new Date(), index - 6)); return { dateValue, done: scopedStreakRecords.some((record) => record.completed_on === dateValue) }; }), [scopedStreakRecords]);
  const paymentTotal = (debtId) => payments.filter((record) => record.metadata?.debtId === debtId).reduce((sum, record) => sum + Number(record.metadata?.amount || 0), 0);

  const visible = useMemo(() => sourceRecords.filter((record) => {
    const data = values(record); const haystack = [record.title, record.content, record.note, ...Object.values(data), ...(record.tags ?? [])].join(' ').toLowerCase();
    if (!haystack.includes(query.toLowerCase())) return false;
    if ((isSaved || isDue) && filter === 'archived') return archived(record);
    if ((isSaved || isDue) && archived(record)) return false;
    if (isChecklist && filter === 'active') return !record.is_complete && !record.archived_at;
    if (isChecklist && filter === 'done') return record.is_complete && !record.archived_at;
    if (isChecklist && filter === 'archived') return Boolean(record.archived_at);
    if (isDue && filter === 'active') return !record.is_complete;
    if (isDue && filter === 'done') return record.is_complete;
    if (isSaved && filter === 'favorites') return record.metadata?.favorite;
    const savedFilter = isSaved ? matchesConfiguredFilter(data, filter, module.savedBehavior?.filters, new Date()) : undefined; if (savedFilter !== undefined) return savedFilter;
    if (isSaved && groupFilter !== 'all' && !(record.tags ?? []).includes(groupFilter)) return false;
    const listFilter = isChecklist ? matchesConfiguredFilter(data, filter, listProfile?.filters, new Date()) : undefined; if (listFilter !== undefined) return !record.is_complete && listFilter;
    if (isChecklist && listProfile?.statuses?.includes(filter)) return data.status === filter;
    if (isChecklist && groupFilter !== 'all') return String(data[listProfile?.groupField] ?? 'Unsorted') === groupFilter;
    if (isDue && filter === 'overdue') return !record.is_complete && record.due_at && new Date(record.due_at) < new Date(day());
    if (isDue && filter === 'upcoming') return !record.is_complete && record.due_at && record.due_at >= day() && record.due_at <= day(addDays(new Date(), 7));
    return true;
  }).sort((a, b) => {
    if (isDue && filter !== 'done' && filter !== 'archived') return String(a.due_at ?? '9999-12-31').localeCompare(String(b.due_at ?? '9999-12-31'));
    if (isChecklist && (filter === 'done' || filter === 'archived')) return new Date(b.archived_at ?? b.completed_at ?? b.created_at) - new Date(a.archived_at ?? a.completed_at ?? a.created_at);
    if (!isChecklist || sort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
    if (sort === 'title') return a.title.localeCompare(b.title); const field = listProfile?.dateField;
    return field ? String(values(a)[field] || '9999-12-31').localeCompare(String(values(b)[field] || '9999-12-31')) : new Date(b.created_at) - new Date(a.created_at);
  }), [sourceRecords, query, filter, groupFilter, sort, isChecklist, isDue, isSaved, listProfile, module.savedBehavior]);
  const groups = useMemo(() => { if (!isChecklist || !listProfile) return []; const field = listProfile.groupField; const names = [...new Set([...(listProfile.groupOrder ?? []), ...visible.map((record) => String(values(record)[field] ?? 'Unsorted'))])]; return names.filter(Boolean).map((name) => [name, visible.filter((record) => String(values(record)[field] ?? 'Unsorted') === name)]).filter(([, items]) => items.length); }, [isChecklist, listProfile, visible]);
  const upcomingCount = isDue ? sourceRecords.filter((record) => !archived(record) && !record.is_complete && record.due_at && new Date(record.due_at) >= new Date(day()) && new Date(record.due_at) <= addDays(new Date(), 7)).length : 0;

  async function save(event) {
    event.preventDefault(); if (!user || (isStreak ? (!editing && completedToday) : !title.trim())) return;
    let nextFields = { ...fields }; if (streakScope) nextFields[streakScope.field] = selectedHabit; nextFields = applyAutoFields(nextFields, module.savedBehavior?.autoFields);
    const base = { user_id: user.id, module_id: module.id }; let payload;
    if (isChecklist) payload = { ...base, title, is_complete: false, completed_at: null, archived_at: null, fields: nextFields };
    if (isStreak) payload = { ...base, completed_on: editing?.completed_on ?? day(), note: content || null, fields: nextFields, ...(streakScope ? { [streakRecordField]: selectedHabit } : {}) };
    if (isSaved) payload = { ...base, title, content: content || null, tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean), metadata: nextFields };
    if (isDue) payload = { ...base, title, due_at: date || null, is_complete: false, completed_at: null, metadata: nextFields };
    try {
      if (editing) { const patch = isChecklist ? { title, fields: nextFields } : isSaved ? { title, content: content || null, tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean), metadata: nextFields } : isDue ? { title, due_at: date || null, metadata: nextFields } : { note: content || null, fields: nextFields, ...(streakScope ? { [streakRecordField]: selectedHabit } : {}) }; await updateRecord(table, editing.id, patch); }
      else await addRecord(table, payload);
      setTitle(''); setContent(''); setTags(''); setFields({}); setDate(day()); setEditing(null); await refresh();
    } catch (error) { setStatus(error.message); }
  }
  async function toggle(record) {
    try {
      const repeatField = recurrenceField(module);
      if (isDue && repeatField && record.metadata?.[repeatField] && record.due_at) {
        if (record.is_complete) { setStatus('Past recurring occurrences are preserved. Edit the next scheduled occurrence instead.'); return; }
        const completedAt = new Date().toISOString(); const recurrenceRootId = record.metadata?.recurrenceRootId ?? record.id; const recurrenceDayOfMonth = record.metadata?.recurrenceDayOfMonth ?? new Date(record.due_at).getDate(); const metadata = { ...record.metadata, recurrenceRootId, recurrenceDayOfMonth };
        await updateRecord(table, record.id, { is_complete: true, completed_at: completedAt, metadata }); await addRecord(table, { user_id: user.id, module_id: module.id, title: record.title, due_at: day(nextRecurringDate(record.due_at, record.metadata[repeatField], recurrenceDayOfMonth)), is_complete: false, completed_at: null, metadata });
      } else {
        const nextComplete = !record.is_complete; const patch = { is_complete: nextComplete };
        if (isChecklist) { patch.completed_at = nextComplete ? new Date().toISOString() : null; patch.archived_at = null; }
        if (isDue) patch.completed_at = nextComplete ? new Date().toISOString() : null;
        if (isChecklist && nextComplete) { const fieldsPatch = completionFieldPatch(listProfile, record); if (fieldsPatch) patch.fields = fieldsPatch; }
        await updateRecord(table, record.id, patch);
      }
      await refresh();
    } catch (error) { setStatus(error.message); }
  }
  async function archiveRecord(record) { try { const metadata = { ...record.metadata, archived_at: new Date().toISOString() }; await updateRecord(table, record.id, { metadata }); setUndo({ kind: 'archive', record }); await refresh(); } catch (error) { setStatus(error.message); } }
  async function restoreArchived(record) { try { const { archived_at, ...metadata } = record.metadata ?? {}; await updateRecord(table, record.id, { metadata }); await refresh(); } catch (error) { setStatus(error.message); } }
  async function clearCompleted() { const completed = sourceRecords.filter((record) => record.is_complete && !record.archived_at); if (!completed.length || !window.confirm(`Archive ${completed.length} completed item${completed.length === 1 ? '' : 's'}? They will remain in Archived history.`)) return; try { setUndo({ kind: 'checklist', records: completed }); const archivedAt = new Date().toISOString(); await Promise.all(completed.map((record) => updateRecord(table, record.id, { archived_at: archivedAt }))); await refresh(); } catch (error) { setStatus(error.message); } }
  async function restoreUndo() { if (!undo) return; try { if (undo.kind === 'archive') await restoreArchived(undo.record); else await Promise.all(undo.records.map((record) => updateRecord(table, record.id, { archived_at: null }))); setUndo(null); await refresh(); } catch (error) { setStatus(error.message); } }
  async function toggleFavorite(record) { try { await updateRecord(table, record.id, { metadata: { ...record.metadata, favorite: !record.metadata?.favorite } }); await refresh(); } catch (error) { setStatus(error.message); } }
  async function permanentlyDelete(record) { if (!window.confirm('Delete this record permanently?')) return; try { await removeRecord(table, record.id); await refresh(); } catch (error) { setStatus(error.message); } }
  function edit(record) { setEditing(record); setTitle(record.title ?? ''); setContent(record.content ?? record.note ?? ''); setTags((record.tags ?? []).join(', ')); setDate(record.due_at ?? day()); setFields(values(record)); if (streakScope) setActiveHabit(record[streakRecordField] || 'default'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  async function savePayment(event) { event.preventDefault(); if (!user || !paymentDebtId || Number(paymentAmount) <= 0) return; const metadata = { recordKind: 'payment', debtId: paymentDebtId, amount: Number(paymentAmount), note: paymentNote || null }; try { if (editingPayment) await updateRecord(table, editingPayment.id, { due_at: paymentDate, metadata }); else await addRecord(table, { user_id: user.id, module_id: module.id, title: 'Debt payment', due_at: paymentDate, is_complete: true, completed_at: new Date().toISOString(), metadata }); setPaymentAmount(''); setPaymentNote(''); setPaymentDate(day()); setEditingPayment(null); await refresh(); } catch (error) { setStatus(error.message); } }
  const filterOptions = [...new Set(isSaved ? ['all', 'favorites', 'archived', ...(module.savedBehavior?.filters ?? []).map((item) => item.id)] : isChecklist ? ['active', 'done', 'archived', ...(listProfile?.filters ?? []).map((item) => item.id), ...(listProfile?.statuses ?? [])] : isDue ? ['active', 'done', 'overdue', 'upcoming', 'archived'] : [])];
  const summary = isStreak ? `${currentStreak}-day streak` : isDue ? `${upcomingCount} due in 7 days` : `${sourceRecords.filter((record) => !record.is_complete && !record.archived_at).length} active`;
  const linkFields = [...(module.savedBehavior?.linkFields ?? []), ...(module.dueBehavior?.linkFields ?? []), ...(listProfile?.linkFields ?? [])];
  const recordLinks = (record) => linkFields.map((item) => ({ ...item, href: safeLink(values(record)[item.field]) })).filter((item) => item.href);
  const activeDebts = sourceRecords.filter((record) => !archived(record) && !record.is_complete);
  return <main className={`tracker-shell accent-${module.accent}`}><section className="suite-grid generic-suite">
    <header className="suite-header"><span className="icon-chip">{module.icon}</span><div><span className="eyebrow">{isSaved ? 'Your library' : isDue ? 'Plan ahead' : module.engine}</span><h1>{module.title}</h1></div></header>
    <section className="suite-card suite-overview"><span className="section-label">Overview</span><strong>{isStreak ? (completedToday ? 'Done today' : 'Ready') : isSaved ? sourceRecords.filter((record) => !archived(record)).length : summary}</strong><small>{isStreak ? `Best streak: ${bestStreak} days` : isSaved ? `${sourceRecords.filter((record) => !archived(record)).length} saved item${sourceRecords.filter((record) => !archived(record)).length === 1 ? '' : 's'}` : summary}</small>{isStreak && <><div className="mini-metrics"><span>Current <b>{currentStreak} days</b></span><span>Best <b>{bestStreak} days</b></span></div><div className="week-dots">{week.map((item) => <i key={item.dateValue} className={item.done ? 'done' : ''} title={item.dateValue} />)}</div>{streakScope && <div className="habit-switcher"><small>Viewing habit</small><div>{habitKeys.map((habit) => <button type="button" key={habit} className={selectedHabit === habit ? 'active' : ''} onClick={() => { setActiveHabit(habit); setFields({ ...fields, [streakScope.field]: habit }); }}>{habit}</button>)}</div></div>}</>}</section>
    {isStreak && <StreakCalendar completedDates={scopedStreakRecords.map((record) => record.completed_on)} title={streakScope ? `${selectedHabit} history` : 'Check-in calendar'} />}
    <form className="suite-card composer-card" onSubmit={save}><span className="section-label">{editing ? 'Edit item' : labelFor[module.engine]}</span>{!isStreak && <Field field={{ label: module.savedBehavior?.presentation?.titleLabel ?? 'Title', type: 'text' }} value={title} onChange={setTitle} />}{isDue && <Field field={{ label: 'Due date', type: 'date' }} value={date} onChange={setDate} />}{(isSaved || isStreak) && <Field field={{ label: module.savedBehavior?.presentation?.notesLabel ?? 'Notes', type: 'text' }} value={content} onChange={setContent} />}{module.fields.map((field) => <Field key={field.id} field={field} value={streakScope && field.id === streakScope.field ? selectedHabit : fields[field.id]} onChange={(value) => { if (streakScope && field.id === streakScope.field) setActiveHabit(value); setFields({ ...fields, [field.id]: value }); }} />)}{isSaved && <Field field={{ label: 'Tags (comma separated)', type: 'text' }} value={tags} onChange={setTags} />}<button disabled={!user || (isStreak && !editing && completedToday)}>{editing ? 'Save changes' : isStreak ? (completedToday ? 'Checked in' : 'Mark done today') : labelFor[module.engine]}</button>{editing && <button className="text-button" type="button" onClick={() => setEditing(null)}>Cancel</button>}</form>
    {ledger && <section className="suite-card"><span className="section-label">Payment ledger</span><form className="composer-card" onSubmit={savePayment}><label>Debt<select required value={paymentDebtId} onChange={(event) => setPaymentDebtId(event.target.value)}><option value="">Choose a debt</option>{activeDebts.map((record) => <option key={record.id} value={record.id}>{record.title}</option>)}</select></label><label>Payment amount<input required type="number" min="0.01" step="0.01" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} /></label><label>Payment date<input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></label><label>Note<input value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} /></label><button disabled={!activeDebts.length}>{editingPayment ? 'Save payment' : 'Add payment'}</button>{editingPayment && <button type="button" className="text-button" onClick={() => setEditingPayment(null)}>Cancel</button>}</form><ul className="compact-list">{payments.map((record) => <li key={record.id}><span><strong>{Number(record.metadata?.amount || 0).toLocaleString()} paid</strong><small>{new Date(record.due_at).toLocaleDateString()} · {sourceRecords.find((debt) => debt.id === record.metadata?.debtId)?.title ?? 'Debt'}{record.metadata?.note ? ` · ${record.metadata.note}` : ''}</small></span><button type="button" onClick={() => { setEditingPayment(record); setPaymentDebtId(record.metadata?.debtId ?? ''); setPaymentAmount(String(record.metadata?.amount ?? '')); setPaymentDate(record.due_at ?? day()); setPaymentNote(record.metadata?.note ?? ''); }}>Edit</button><button type="button" onClick={() => archiveRecord(record)}>Archive</button></li>)}</ul></section>}
    {(isChecklist || isDue || isSaved || isStreak) && <section className="suite-card filter-card"><span className="section-label">Find & filter</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isStreak ? 'Search check-in notes' : 'Search this module'} />{filterOptions.length > 0 && <div className="filter-row">{filterOptions.map((item) => <button type="button" key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>}{isSaved && <label className="filter-select">Tag <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}><option value="all">All tags</option>{[...new Set(sourceRecords.flatMap((record) => record.tags ?? []))].sort().map((tag) => <option key={tag}>{tag}</option>)}</select></label>}{isChecklist && listProfile && <><label className="filter-select">Group <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}><option value="all">All {listProfile.groupField}s</option>{[...new Set(sourceRecords.map((record) => String(values(record)[listProfile.groupField] ?? 'Unsorted')))].map((item) => <option key={item}>{item}</option>)}</select></label><label className="filter-select">Sort <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="smart">Smart order</option><option value="newest">Newest</option><option value="title">Title</option></select></label></>}</section>}
    <section className="suite-card suite-records"><div className="chart-title"><div><span className="section-label">{isSaved ? 'Library' : isStreak ? 'Check-in history' : isDue ? 'Schedule' : filter === 'archived' ? 'Archived history' : filter === 'done' ? 'Completed history' : 'Items'}</span><h2>{visible.length} shown</h2></div>{isChecklist && <button className="text-button" type="button" onClick={clearCompleted}>Archive completed</button>}</div>{(isChecklist ? groups : [['All items', visible]]).map(([group, items]) => <div className="record-group" key={group}>{isChecklist && <h3>{group}</h3>}<ul>{items.map((record) => { const data = values(record); const overdue = isDue && !record.is_complete && record.due_at && new Date(record.due_at) < new Date(day()); const daysLeft = record.due_at ? Math.ceil((new Date(record.due_at) - new Date(day())) / 86400000) : null; const debtAmount = ledger ? Number(data[ledger.amountField] || 0) : 0; const remaining = ledger ? Math.max(0, debtAmount - paymentTotal(record.id)) : 0; return <li key={record.id} className={overdue ? 'is-overdue' : ''}>{(isChecklist || isDue) && <button className="check" onClick={() => toggle(record)}>{record.is_complete ? '✓' : '○'}</button>}<span><strong>{record.title ?? record.note ?? 'Check-in'}</strong><small>{isStreak ? `Checked ${new Date(`${record.completed_on}T12:00:00`).toLocaleDateString()} · ` : ''}{record.due_at ? `${overdue ? 'Overdue · ' : daysLeft === 0 ? 'Due today · ' : `${daysLeft} days left · `}${new Date(record.due_at).toLocaleDateString()} · ` : ''}{Object.entries(data).filter(([key, value]) => value && !['favorite', 'archived_at', 'recordKind', 'debtId'].includes(key)).map(([key, value]) => `${key}: ${value}`).join(' · ') || record.content || record.note || (record.tags ?? []).join(', ') || 'No details'}{isChecklist && ` · ${checklistHistoryLabel(record)}`}{isDue && record.is_complete && record.completed_at ? ` · Completed ${new Date(record.completed_at).toLocaleDateString()}` : ''}{ledger ? ` · Remaining: ${remaining.toLocaleString()}` : ''}</small>{recordLinks(record).map((link) => <a className="record-link" key={link.field} href={link.href} target="_blank" rel="noreferrer">{link.label}</a>)}{isSaved && record.tags?.length ? <em>{record.tags.map((tag) => `#${tag}`).join(' ')}</em> : null}</span>{isSaved && <button aria-label="Toggle favorite" onClick={() => toggleFavorite(record)}>{record.metadata?.favorite ? '★' : '☆'}</button>}{!archived(record) && <button type="button" onClick={() => edit(record)}>Edit</button>}{(isSaved || isDue) ? (archived(record) ? <button type="button" onClick={() => restoreArchived(record)}>Restore</button> : <button type="button" onClick={() => archiveRecord(record)}>Archive</button>) : <button type="button" aria-label="Delete item" onClick={() => permanentlyDelete(record)}>×</button>}</li>; })}</ul></div>)}{!visible.length && <p className="empty-copy">Nothing here yet. Add the first item above.</p>}{hasMore && <button type="button" className="load-more" disabled={loadingMore} onClick={loadMore}>{loadingMore ? 'Loading…' : 'Load more history'}</button>}</section>{undo && <p className="undo">Record archived. <button onClick={restoreUndo}>Undo</button></p>}{status && <p className="status">{status}</p>}
  </section></main>;
}
