import { describe, expect, it } from 'vitest';
import { modules } from '../src/config/modules';
import { formatEntryValue } from '../src/lib/formatEntryValue';

const trackers = modules.filter((module) => module.engine === 'entryTracker');

describe('EntryTracker formatting configuration', () => {
  it.each(trackers)('$title formats without treating its unit as a currency code', (module) => {
    const config = module.entryTracker.value;
    expect(() => formatEntryValue(90.5, { displayFormat: config.displayFormat, unit: config.unit, currency: module.entryTracker.currency?.base, precision: config.precision })).not.toThrow();
  });

  it('keeps every non-currency tracker on a safe display format', () => {
    expect(trackers.find((module) => module.id === 'water').entryTracker.value).toMatchObject({ unit: 'ml', displayFormat: 'number' });
    expect(trackers.find((module) => module.id === 'weight').entryTracker.value).toMatchObject({ unit: 'kg', displayFormat: 'number' });
    expect(trackers.find((module) => module.id === 'steps').entryTracker.value).toMatchObject({ unit: 'steps', displayFormat: 'number' });
    expect(trackers.find((module) => module.id === 'time-tracking').entryTracker.value).toMatchObject({ unit: 'min', displayFormat: 'duration' });
  });

  it('formats durations as time and falls back safely if a configuration contains a bad currency code', () => {
    expect(formatEntryValue(90, { displayFormat: 'duration', unit: 'min' })).toBe('1h 30m');
    expect(formatEntryValue(72.5, { displayFormat: 'currency', unit: 'kg', precision: 1 })).toMatch(/72/);
  });
});
