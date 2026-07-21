export function formatEntryValue(value, { displayFormat = 'number', unit = '', currency, precision = 0 } = {}) {
  const amount = Number(value ?? 0);
  if (displayFormat === 'duration') {
    const minutes = Math.max(0, Math.round(Number.isFinite(amount) ? amount : 0));
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  if (displayFormat === 'currency') {
    const code = currency || unit;
    try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: code, maximumFractionDigits: precision ?? 2 }).format(safeAmount); }
    catch { return new Intl.NumberFormat(undefined, { style: 'decimal', maximumFractionDigits: precision ?? 2 }).format(safeAmount); }
  }
  return new Intl.NumberFormat(undefined, { style: 'decimal', maximumFractionDigits: precision ?? 0 }).format(safeAmount);
}
