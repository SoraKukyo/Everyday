export function detectValue(detector, value) {
  if (detector === 'link-type') {
    if (/youtube\.com|youtu\.be/i.test(value)) return 'YouTube';
    if (/instagram\.com/i.test(value)) return 'Instagram';
    return value ? 'Article' : '';
  }
  return value;
}

export function applyAutoFields(fields, autoFields = []) {
  const next = { ...fields };
  autoFields.forEach(({ source, target, detector }) => {
    if (!next[target]) next[target] = detectValue(detector, next[source]);
  });
  return next;
}

export function matchesConfiguredFilter(data, filterId, filters = [], today) {
  const rule = filters.find((filter) => filter.id === filterId);
  if (!rule) return undefined;
  const value = data[rule.field];
  const dateValue = value ? new Date(value) : null;
  const todayKey = today.toISOString().slice(0, 10);
  const threshold = new Date(today);
  if (rule.days) threshold.setDate(threshold.getDate() - rule.days);
  if (rule.kind === 'field-equals') return value === rule.value;
  if (rule.kind === 'field-in') return rule.values.includes(value);
  if (rule.kind === 'date-equals') return value === todayKey;
  if (rule.kind === 'date-after') return Boolean(value && value > todayKey);
  if (rule.kind === 'date-before') return Boolean(value && value < todayKey);
  if (rule.kind === 'date-after-or-empty') return !dateValue || dateValue > threshold;
  if (rule.kind === 'date-before-or-empty') return !dateValue || dateValue < threshold;
  return true;
}

export function namedStreakScope(module) {
  const scope = module.streakBehavior?.scope;
  return scope?.kind === 'named' ? scope : null;
}

export function recurrenceField(module) {
  return module.dueBehavior?.recurrence?.field ?? null;
}

export function completionFieldPatch(listBehavior, record) {
  const update = listBehavior?.completionUpdate;
  return update ? { ...record.fields, [update.field]: update.value } : null;
}
