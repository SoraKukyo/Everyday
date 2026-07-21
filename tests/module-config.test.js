import { describe, expect, it } from 'vitest';
import { getModule, modules } from '../src/config/modules';
import { moduleCatalog } from '../supabase/functions/_shared/moduleCatalog.js';

const coreIds = [
  'calories', 'budget', 'water', 'weight', 'steps', 'time-tracking', 'subscriptions', 'savings', 'net-worth',
  'todo', 'grocery', 'watchlist', 'bucket-list', 'gift-ideas',
  'exercise', 'medication', 'meditation', 'habits', 'language', 'skill-practice', 'gratitude',
  'links', 'journal', 'reading-list', 'contacts', 'recipes', 'ideas', 'quotes',
  'debt', 'remittance', 'chores', 'packages', 'warranties', 'documents', 'maintenance', 'courses',
];

describe('module configurations', () => {
  it('includes every planned core engine module plus the explicitly out-of-spec Investments tracker', () => {
    expect(coreIds).toHaveLength(36);
    expect(modules.map((module) => module.id)).toEqual(expect.arrayContaining([...coreIds, 'investments']));
    expect(modules).toHaveLength(37);
  });

  it('keeps the deployment-safe MCP catalog aligned with the app module configuration', () => {
    expect(moduleCatalog.map((module) => module.id)).toEqual(modules.map((module) => module.id));
    expect(moduleCatalog.map((module) => module.title)).toEqual(modules.map((module) => module.title));
  });

  it.each(modules)('$title has a valid config for its shared engine', (module) => {
    expect(module.id).toMatch(/^[a-z0-9-]+$/);
    expect(['entryTracker', 'checklist', 'streakTracker', 'savedItems', 'dueDateTracker']).toContain(module.engine);
    expect(['green', 'blue', 'pink']).toContain(module.accent);
    expect(new Set(module.fields ?? []).size).toBe((module.fields ?? []).length);
    expect(new Set((module.fields ?? []).map((field) => field.id)).size).toBe((module.fields ?? []).length);

    if (module.engine === 'entryTracker') {
      expect(module.entryTracker.value.unit).toBeTruthy();
      expect(['sum', 'latest']).toContain(module.entryTracker.aggregation.operation);
      expect(['calendar_day', 'all_time']).toContain(module.entryTracker.aggregation.period);
      expect(module.entryTracker.chart).toBeDefined();
    }
  });

  it('keeps the representative config variations that drive all tracker behavior', () => {
    expect(getModule('calories').entryTracker).toMatchObject({ aggregation: { operation: 'sum', period: 'calendar_day' }, goal: { enabled: true } });
    expect(getModule('budget').entryTracker).toMatchObject({ value: { displayFormat: 'currency' }, currency: { enabled: true } });
    expect(getModule('budget').entryTracker.fields).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'category', required: true })]));
    expect(getModule('weight').entryTracker).toMatchObject({ aggregation: { operation: 'latest', period: 'all_time' }, chart: { type: 'line' } });
    expect(getModule('weight').goalProgress).toEqual({ compatible: true, direction: 'decrease', baseline: 'first_record' });
    expect(getModule('savings').goalProgress.direction).toBe('increase');
    expect(getModule('net-worth').goalProgress).toEqual({ compatible: true, direction: 'increase', baseline: 'first_record' });
    expect(getModule('debt').goalProgress).toEqual({ compatible: false, direction: 'decrease', baseline: 'ledger' });
    expect(getModule('net-worth').entryTracker).toMatchObject({ aggregation: { operation: 'latest', period: 'all_time' }, chart: { type: 'line' } });
    expect(getModule('subscriptions').entryTracker).toMatchObject({ recurrence: { enabled: true }, dueDate: { enabled: true } });
    expect(getModule('chores').dueBehavior).toMatchObject({ recurrence: { field: 'repeat' } });
    expect(getModule('debt').dueBehavior).toMatchObject({ ledger: { amountField: 'amount' } });
    expect(getModule('links').savedBehavior.linkFields).toEqual([expect.objectContaining({ field: 'url' })]);
    expect(getModule('habits').streakBehavior).toMatchObject({ scope: { kind: 'named', field: 'habit' } });
  });
});
