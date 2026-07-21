import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('../src/data/supabaseClient.js', () => ({ supabase: { from: state.from } }));

import { createEntryRecord, deleteEntryRecord, updateEntryRecord } from '../src/data/entryRecords';
import { addRecord, removeRecord, updateRecord } from '../src/data/genericRecords';

function mutationQuery(data = { id: 'new-row' }) {
  const query = {};
  query.insert = vi.fn(() => query);
  query.update = vi.fn(() => query);
  query.delete = vi.fn(() => query);
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.single = vi.fn(() => Promise.resolve({ data, error: null }));
  query.then = (resolve, reject) => Promise.resolve({ data: null, error: null }).then(resolve, reject);
  return query;
}

describe('Supabase data adapters', () => {
  beforeEach(() => state.from.mockReset());

  it('creates, updates, and deletes EntryTracker records with the expected normalized fields', async () => {
    const createQuery = mutationQuery({ id: 'entry-1' });
    state.from.mockReturnValueOnce(createQuery);
    await expect(createEntryRecord({ userId: 'u1', moduleId: 'calories', value: 400, occurredAt: new Date('2026-07-20T10:00:00Z'), fields: { meal: 'Lunch' } })).resolves.toEqual({ id: 'entry-1' });
    expect(state.from).toHaveBeenCalledWith('entry_records');
    expect(createQuery.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u1', module_id: 'calories', value: 400, occurred_at: '2026-07-20T10:00:00.000Z' }));

    const updateQuery = mutationQuery({ id: 'entry-1' });
    state.from.mockReturnValueOnce(updateQuery);
    await updateEntryRecord('entry-1', { value: 450, occurredAt: new Date('2026-07-21T10:00:00Z') });
    expect(updateQuery.update).toHaveBeenCalledWith({ value: 450, occurred_at: '2026-07-21T10:00:00.000Z' });

    const deleteQuery = mutationQuery();
    state.from.mockReturnValueOnce(deleteQuery);
    await deleteEntryRecord('entry-1');
    expect(deleteQuery.delete).toHaveBeenCalledOnce();
    expect(deleteQuery.eq).toHaveBeenCalledWith('id', 'entry-1');
  });

  it('creates, updates, and deletes generic engine rows', async () => {
    const createQuery = mutationQuery({ id: 'todo-1' });
    state.from.mockReturnValueOnce(createQuery);
    await expect(addRecord('checklist_items', { user_id: 'u1', module_id: 'todo', title: 'Buy milk' })).resolves.toEqual({ id: 'todo-1' });
    expect(createQuery.insert).toHaveBeenCalledWith(expect.objectContaining({ title: 'Buy milk' }));

    const updateQuery = mutationQuery();
    state.from.mockReturnValueOnce(updateQuery);
    await updateRecord('checklist_items', 'todo-1', { is_complete: true, completed_at: '2026-07-20T00:00:00.000Z' });
    expect(updateQuery.update).toHaveBeenCalledWith(expect.objectContaining({ is_complete: true, completed_at: expect.any(String) }));

    const deleteQuery = mutationQuery();
    state.from.mockReturnValueOnce(deleteQuery);
    await removeRecord('checklist_items', 'todo-1');
    expect(deleteQuery.delete).toHaveBeenCalledOnce();
  });
});
