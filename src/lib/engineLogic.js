export function entryTotalFor(moduleId, entries = []) {
  const rows = entries.filter((entry) => entry.module_id === moduleId && !entry.metadata?.archived_at);
  if (moduleId === 'budget') return rows.reduce((sum, entry) => sum + (entry.metadata?.transactionType === 'income' ? Number(entry.value) : -Number(entry.value)), 0);
  if (moduleId === 'weight' || moduleId === 'net-worth') {
    const latest = [...rows].sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at))[0];
    return latest ? Number(latest.value) : 0;
  }
  if (moduleId === 'savings') return rows.reduce((sum, entry) => sum + (entry.metadata?.kind === 'withdrawal' ? -Number(entry.value) : Number(entry.value)), 0);
  if (moduleId === 'investments') return rows.filter((entry) => entry.metadata?.kind !== 'portfolio_snapshot').reduce((sum, entry) => sum + Number(entry.value), 0);
  return rows.reduce((sum, entry) => sum + Number(entry.value), 0);
}

export function goalBaselineFor(moduleId, entries = [], baseline = 'zero') {
  if (baseline !== 'first_record') return 0;
  const first = entries
    .filter((entry) => entry.module_id === moduleId && !entry.metadata?.archived_at)
    .sort((a, b) => new Date(a.occurred_at) - new Date(b.occurred_at))[0];
  return first ? Number(first.value) : null;
}

export function calculateGoalProgress({ currentValue, targetValue, baselineValue = 0, direction = 'increase' }) {
  if (baselineValue === null || baselineValue === undefined || baselineValue === '') return 0;
  const current = Number(currentValue);
  const target = Number(targetValue);
  const baseline = Number(baselineValue);
  if (![current, target, baseline].every(Number.isFinite)) return 0;
  const reached = direction === 'decrease' ? current <= target : current >= target;
  const span = direction === 'decrease' ? baseline - target : target - baseline;
  if (span <= 0) return reached ? 100 : 0;
  const traveled = direction === 'decrease' ? baseline - current : current - baseline;
  return Math.max(0, Math.min(100, traveled / span * 100));
}

export function remainingDebt(originalAmount, payments = []) {
  return Math.max(0, Number(originalAmount || 0) - payments.reduce((sum, payment) => sum + Number(payment.metadata?.amount || payment.amount || 0), 0));
}

export function completedStreak(records = [], now = new Date()) {
  let count = 0;
  for (let offset = 0; offset < 730; offset += 1) {
    const date = new Date(now); date.setDate(date.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    if (!records.some((record) => record.completed_on === key)) return count;
    count += 1;
  }
  return count;
}

export function sanitizeBackupRows(rows = [], userId) {
  return rows.map(({ id, user_id, created_at, updated_at, ...row }) => ({ ...row, user_id: userId }));
}

export function createBackupPayload(data, exportedAt = new Date().toISOString()) {
  return { version: 2, exportedAt, data };
}

export function stageBackupPayload(payload, tables, userId) {
  if (!payload?.data || typeof payload.data !== 'object') throw new Error('This is not an Everyday backup.');
  const staged = {};
  for (const table of tables) {
    const rows = payload.data[table] ?? [];
    if (!Array.isArray(rows)) throw new Error(`${table} must be an array.`);
    staged[table] = sanitizeBackupRows(rows, userId);
  }
  return staged;
}
