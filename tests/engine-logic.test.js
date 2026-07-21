import { describe, expect, it } from 'vitest';
import { calculateGoalProgress, completedStreak, createBackupPayload, entryTotalFor, remainingDebt, stageBackupPayload } from '../src/lib/engineLogic';

const entry = (module_id, value, occurred_at, metadata = {}) => ({ module_id, value, occurred_at, metadata });

describe('EntryTracker aggregation rules', () => {
  it('calculates Budget as income minus expenses, not a flat sum', () => {
    expect(entryTotalFor('budget', [entry('budget', 100, '2026-01-01', { transactionType: 'income' }), entry('budget', 35, '2026-01-02', { transactionType: 'expense' })])).toBe(65);
  });

  it('uses the latest snapshot for Weight and Net worth', () => {
    const snapshots = [entry('weight', 72, '2026-01-01'), entry('weight', 70, '2026-01-10'), entry('weight', 69, '2026-01-05')];
    expect(entryTotalFor('weight', snapshots)).toBe(70);
    expect(entryTotalFor('net-worth', [entry('net-worth', 500, '2026-02-01'), entry('net-worth', 800, '2026-03-01')])).toBe(800);
  });

  it('handles empty, single, archived, savings, and investment variants', () => {
    expect(entryTotalFor('calories', [])).toBe(0);
    expect(entryTotalFor('calories', [entry('calories', 500, '2026-01-01')])).toBe(500);
    expect(entryTotalFor('calories', [entry('calories', 500, '2026-01-01', { archived_at: '2026-01-02' })])).toBe(0);
    expect(entryTotalFor('savings', [entry('savings', 100, '2026-01-01'), entry('savings', 30, '2026-01-02', { kind: 'withdrawal' })])).toBe(70);
    expect(entryTotalFor('investments', [entry('investments', 100, '2026-01-01'), entry('investments', 900, '2026-01-02', { kind: 'portfolio_snapshot' })])).toBe(100);
  });
});

describe('shared history and backup logic', () => {
  it('derives a streak from completed calendar days', () => {
    const now = new Date('2026-07-20T12:00:00Z');
    expect(completedStreak([{ completed_on: '2026-07-20' }, { completed_on: '2026-07-19' }, { completed_on: '2026-07-18' }], now)).toBe(3);
    expect(completedStreak([{ completed_on: '2026-07-19' }], now)).toBe(0);
  });

  it('uses every debt payment in a ledger and never overwrites an earlier payment', () => {
    const payments = [{ metadata: { amount: 100 } }, { metadata: { amount: 175 } }];
    expect(remainingDebt(500, payments)).toBe(225);
    expect(remainingDebt(200, [{ metadata: { amount: 300 } }])).toBe(0);
  });

  it('round-trips backup rows while removing old ownership and database identity fields', () => {
    const payload = createBackupPayload({ entry_records: [{ id: 'old-id', user_id: 'old-user', created_at: 'yesterday', module_id: 'calories', value: 500 }] }, '2026-07-20T00:00:00.000Z');
    const staged = stageBackupPayload(payload, ['entry_records', 'goals'], 'new-user');
    expect(staged.entry_records).toEqual([{ module_id: 'calories', value: 500, user_id: 'new-user' }]);
    expect(staged.goals).toEqual([]);
    expect(() => stageBackupPayload({ data: { entry_records: {} } }, ['entry_records'], 'new-user')).toThrow('entry_records must be an array.');
  });

  it('measures descending progress from a baseline instead of using the ascending ratio', () => {
    expect(calculateGoalProgress({ currentValue: 73.2, targetValue: 70, baselineValue: 76.4, direction: 'decrease' })).toBeCloseTo(50, 8);
    expect(calculateGoalProgress({ currentValue: 9000, targetValue: 12000, baselineValue: 6000, direction: 'increase' })).toBeCloseTo(50, 8);
    expect(calculateGoalProgress({ currentValue: 0, targetValue: 70, baselineValue: null, direction: 'decrease' })).toBe(0);
  });
});
