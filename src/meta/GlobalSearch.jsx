import { useEffect, useMemo, useState } from 'react';
import { engines, getModule, modules } from '../config/modules';
import { getAnonymousUser } from '../data/supabaseClient';
import { listAllRowsForUser } from '../data/pagedRecords';

const sources = [
  { table: 'entry_records', orderColumn: 'occurred_at', text: (row) => `${row.note ?? ''} ${JSON.stringify(row.fields)}` },
  { table: 'checklist_items', orderColumn: 'created_at', text: (row) => `${row.title} ${JSON.stringify(row.fields)}` },
  { table: 'streak_checkins', orderColumn: 'completed_on', text: (row) => `${row.note ?? ''} ${JSON.stringify(row.fields)}` },
  { table: 'saved_items', orderColumn: 'created_at', text: (row) => `${row.title} ${row.content ?? ''} ${row.tags?.join(' ') ?? ''} ${JSON.stringify(row.metadata ?? {})}` },
  { table: 'due_items', orderColumn: 'created_at', text: (row) => `${row.title} ${JSON.stringify(row.metadata)}` },
  { table: 'goals', orderColumn: 'created_at', text: (row) => row.title },
];

export default function GlobalSearch({ onOpen }) {
  const [query, setQuery] = useState('');
  const [settledQuery, setSettledQuery] = useState('');
  const [indexedItems, setIndexedItems] = useState([]);
  const [moduleFilter, setModuleFilter] = useState('all');
  const [engineFilter, setEngineFilter] = useState('all');
  const [status, setStatus] = useState('');
  const [indexing, setIndexing] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettledQuery(query), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    getAnonymousUser().then(async (user) => {
      const sourceResults = await Promise.all(sources.map(async (source) => ({
        source,
        ...(await listAllRowsForUser(source.table, user.id, { orderColumn: source.orderColumn })),
      })));
      if (cancelled) return;
      setIndexedItems(sourceResults.flatMap(({ source, rows }) => rows.map((item) => ({
        ...item,
        table: source.table,
        searchText: source.text(item).toLowerCase(),
      }))));
      const truncated = sourceResults.filter((result) => result.truncated).map((result) => result.source.table);
      setStatus(truncated.length ? `Search indexes the newest 5,000 records from: ${truncated.join(', ')}.` : '');
      setIndexing(false);
    }).catch((error) => {
      if (!cancelled) {
        setStatus(error.message);
        setIndexing(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(() => indexedItems.filter((item) => {
    const module = getModule(item.module_id);
    return settledQuery.trim()
      && item.searchText.includes(settledQuery.toLowerCase())
      && (moduleFilter === 'all' || item.module_id === moduleFilter)
      && (engineFilter === 'all' || module?.engine === engineFilter);
  }), [indexedItems, settledQuery, moduleFilter, engineFilter]);
  const moduleOptions = modules.filter((module) => engineFilter === 'all' || module.engine === engineFilter);

  return <main className="tracker-shell accent-blue"><section className="suite-grid generic-suite search-suite">
    <header className="suite-header"><div><span className="eyebrow">Across your data</span><h1>Global search</h1></div><small>{indexing ? 'Indexing your records…' : 'Find records across every module'}</small></header>
    <section className="suite-card search-panel"><label className="search-query">Search records<input className="global-search" autoFocus placeholder="Search entries, notes, and tasks" value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="search-controls"><label>Engine<select value={engineFilter} onChange={(event) => { setEngineFilter(event.target.value); setModuleFilter('all'); }}><option value="all">All engines</option>{Object.entries(engines).map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label><label>Module<select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}><option value="all">All modules</option>{moduleOptions.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label></div></section>
    {status && <p className="status">{status}</p>}
    <section className="suite-card suite-records search-results"><div className="chart-title"><div><span className="section-label">Results</span><h2>{settledQuery.trim() ? `${visible.length} result${visible.length === 1 ? '' : 's'}` : 'Search your records'}</h2></div></div>{settledQuery.trim() ? indexing ? <p className="empty-copy">Indexing records before searching…</p> : visible.length ? <ul>{visible.map((item) => <li key={`${item.table}-${item.id}`}><button className="result" onClick={() => item.module_id && onOpen(item.module_id)}><span><strong>{getModule(item.module_id)?.title ?? 'Goals'}</strong><small>{item.title ?? item.note ?? JSON.stringify(item.fields ?? item.metadata)}</small></span><b>Open →</b></button></li>)}</ul> : <p className="empty-copy">No records match this search or filter.</p> : <p className="empty-copy">Start with a word, note, tag, URL, contact detail, or title.</p>}</section>
  </section></main>;
}
