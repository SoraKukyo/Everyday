import { useState } from 'react';
import { getAnonymousUser, supabase } from '../data/supabaseClient';
import { createBackupPayload, stageBackupPayload } from '../lib/engineLogic';

const tables = ['entry_records', 'checklist_items', 'streak_checkins', 'saved_items', 'due_items', 'goals', 'module_settings'];

export default function Backup() {
  const [message, setMessage] = useState(''); const [summary, setSummary] = useState(null);
  async function exportData() { try { const user = await getAnonymousUser(); const data = {}; let total = 0; for (const table of tables) { const { data: rows, error } = await supabase.from(table).select('*').eq('user_id', user.id); if (error) throw error; data[table] = rows ?? []; total += data[table].length; } const blob = new Blob([JSON.stringify(createBackupPayload(data), null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'everyday-backup.json'; link.click(); URL.revokeObjectURL(url); setSummary(Object.fromEntries(tables.map((table) => [table, data[table].length]))); setMessage(`Backup downloaded: ${total} records.`); } catch (error) { setMessage(error.message); } }
  async function importData(event) {
    const inserted = {};
    try {
      const file = event.target.files?.[0]; if (!file) return;
      const parsed = JSON.parse(await file.text());
      if (!parsed?.data || typeof parsed.data !== 'object') throw new Error('This is not an Everyday backup.');
      const counts = Object.fromEntries(tables.map((table) => [table, Array.isArray(parsed.data[table]) ? parsed.data[table].length : 0]));
      const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
      if (!window.confirm(`Import ${total} records? Existing records are kept and duplicates may be created.`)) return;
      const user = await getAnonymousUser(); let restored = 0;
      // Validate and stage every payload before writing anything. Settings are deliberately last:
      // unlike record inserts, upserts can overwrite an existing preference.
      const staged = stageBackupPayload(parsed, tables, user.id);
      for (const table of tables.filter((name) => name !== 'module_settings')) {
        const rows = staged[table]; if (!rows.length) continue;
        const { data, error } = await supabase.from(table).insert(rows).select('id');
        if (error) throw error;
        inserted[table] = (data ?? []).map((row) => row.id);
        restored += rows.length;
      }
      if (staged.module_settings.length) {
        const { error } = await supabase.from('module_settings').upsert(staged.module_settings, { onConflict: 'user_id,module_id' });
        if (error) throw error;
        restored += staged.module_settings.length;
      }
      setSummary(counts); setMessage(`Import completed: ${restored} records restored.`);
    } catch (error) {
      const user = await getAnonymousUser().catch(() => null);
      const rollback = [];
      if (user) for (const [table, ids] of Object.entries(inserted)) {
        if (!ids.length) continue;
        const { error: rollbackError } = await supabase.from(table).delete().eq('user_id', user.id).in('id', ids);
        if (rollbackError) rollback.push(`${table}: ${rollbackError.message}`);
      }
      setMessage(rollback.length ? `Import failed: ${error.message}. Some inserted rows could not be rolled back: ${rollback.join('; ')}` : `Import failed: ${error.message}. Newly inserted rows were rolled back.`);
    } finally { event.target.value = ''; }
  }
  return <main className="tracker-shell"><section className="suite-grid"><header className="suite-header"><div><span className="eyebrow">Portable data</span><h1>Backup</h1></div></header><section className="suite-card"><span className="section-label">Safe export</span><p>Download every record and saved module setting as a JSON backup you control. Imports validate first, then roll back newly inserted records if a later table fails.</p><button className="meta-button" onClick={exportData}>Export JSON backup</button><label className="import-button">Import JSON backup<input type="file" accept="application/json" onChange={importData} /></label></section>{summary && <section className="suite-card"><span className="section-label">Backup contents</span><ul className="compact-list">{Object.entries(summary).map(([table, count]) => <li key={table}><span>{table.replaceAll('_', ' ')}</span><strong>{count}</strong></li>)}</ul></section>}{message && <p className="status">{message}</p>}</section></main>;
}
