import { useEffect, useState } from 'react';

const defaultRanges = [
  { id: 'week', label: '7 days' },
  { id: 'month', label: '30 days' },
  { id: 'year', label: 'Year' },
  { id: 'all', label: 'All time' },
];

/** Shared history presentation; engines provide their data and row renderer. */
export default function HistoryView({
  title = 'History', eyebrow = 'Full record', records = [], range, onRangeChange,
  ranges = defaultRanges, sort = 'newest', onSortChange, query = '', onQueryChange,
  queryPlaceholder = 'Search history', filterSlot, renderRecord,
  emptyMessage = 'No records match this view.', className = '', pageSize = 100,
}) {
  const [shownCount, setShownCount] = useState(pageSize);
  useEffect(() => { setShownCount(pageSize); }, [pageSize, records.length, range, sort, query]);
  const shownRecords = records.slice(0, shownCount);
  return <section className={`suite-card history-view ${className}`.trim()}>
    <div className="chart-title history-view-header"><div><span className="section-label">{eyebrow}</span><h2>{title}</h2></div><small>{records.length} record{records.length === 1 ? '' : 's'}{shownRecords.length < records.length ? ` · showing ${shownRecords.length}` : ''}</small></div>
    <div className="history-toolbar">{onRangeChange && <div className="history-controls" aria-label="History date range">{ranges.map((item) => <button type="button" key={item.id} className={range === item.id ? 'active' : ''} onClick={() => onRangeChange(item.id)}>{item.label}</button>)}</div>}{onSortChange && <label className="history-sort">Sort<select value={sort} onChange={(event) => onSortChange(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>}</div>
    {(onQueryChange || filterSlot) && <div className="history-filters">{onQueryChange && <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={queryPlaceholder} aria-label={queryPlaceholder} />}{filterSlot}</div>}
    {records.length ? <><ul className="history-list">{shownRecords.map(renderRecord)}</ul>{shownRecords.length < records.length && <button type="button" className="load-more" onClick={() => setShownCount((count) => Math.min(records.length, count + pageSize))}>Load more history</button>}</> : <p className="empty-copy">{emptyMessage}</p>}
  </section>;
}
