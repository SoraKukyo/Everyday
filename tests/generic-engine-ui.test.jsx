import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ records: [], updates: vi.fn(), adds: vi.fn(), removes: vi.fn() }));

vi.mock('../src/data/supabaseClient.js', () => ({
  getAnonymousUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
  isSupabaseConfigured: true,
}));
vi.mock('../src/data/genericRecords.js', () => ({
  listRecordPage: vi.fn(async () => state.records),
  updateRecord: state.updates,
  addRecord: state.adds,
  removeRecord: state.removes,
}));

import GenericEngine from '../src/engines/GenericEngines';
import { getModule } from '../src/config/modules';

describe('Generic engine UI regressions', () => {
  beforeEach(() => {
    state.records = [];
    state.updates.mockReset().mockResolvedValue(undefined);
    state.adds.mockReset().mockResolvedValue(undefined);
    state.removes.mockReset().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  it('renders a Link Saver URL as a usable external link', async () => {
    state.records = [{ id: 'link-1', module_id: 'links', title: 'Recipe', content: '', tags: [], metadata: { url: 'https://example.com/recipe', type: 'Article' }, created_at: '2026-07-20T00:00:00Z' }];
    render(<GenericEngine module={getModule('links')} />);
    const link = await screen.findByRole('link', { name: 'Open link' });
    expect(link.getAttribute('href')).toBe('https://example.com/recipe');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('allows a streak record to be edited after today has already been checked in', async () => {
    const today = new Date().toISOString().slice(0, 10);
    state.records = [{ id: 'streak-1', module_id: 'habits', completed_on: today, note: 'Read a chapter', fields: { habit: 'Reading' }, habit_key: 'Reading', created_at: `${today}T00:00:00Z` }];
    render(<GenericEngine module={getModule('habits')} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('button', { name: 'Save changes' }).disabled).toBe(false);
  });

  it('archives completed checklist items instead of deleting their history', async () => {
    state.records = [{ id: 'todo-1', module_id: 'todo', title: 'Call bank', is_complete: true, completed_at: '2026-07-19T00:00:00Z', fields: {}, created_at: '2026-07-18T00:00:00Z' }];
    render(<GenericEngine module={getModule('todo')} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Archive completed' }));
    await waitFor(() => expect(state.updates).toHaveBeenCalledWith('checklist_items', 'todo-1', expect.objectContaining({ archived_at: expect.any(String) })));
    expect(state.removes).not.toHaveBeenCalled();
  });

  it('keeps recurring chore occurrences and creates the next scheduled row', async () => {
    state.records = [{ id: 'chore-1', module_id: 'chores', title: 'Vacuum', due_at: '2026-07-20', is_complete: false, metadata: { repeat: 'Weekly' }, created_at: '2026-07-20T00:00:00Z' }];
    render(<GenericEngine module={getModule('chores')} />);
    fireEvent.click(await screen.findByRole('button', { name: '○' }));
    await waitFor(() => expect(state.updates).toHaveBeenCalledWith('due_items', 'chore-1', expect.objectContaining({ is_complete: true, completed_at: expect.any(String) })));
    expect(state.adds).toHaveBeenCalledWith('due_items', expect.objectContaining({ module_id: 'chores', title: 'Vacuum', is_complete: false, due_at: '2026-07-27' }));
  });

  it('derives debt remaining balance from every separate payment row', async () => {
    state.records = [
      { id: 'debt-1', module_id: 'debt', title: 'Laptop', due_at: '2026-12-01', is_complete: false, metadata: { amount: 500 }, created_at: '2026-07-01T00:00:00Z' },
      { id: 'payment-1', module_id: 'debt', title: 'Debt payment', due_at: '2026-07-02', is_complete: true, metadata: { recordKind: 'payment', debtId: 'debt-1', amount: 100 }, created_at: '2026-07-02T00:00:00Z' },
      { id: 'payment-2', module_id: 'debt', title: 'Debt payment', due_at: '2026-07-03', is_complete: true, metadata: { recordKind: 'payment', debtId: 'debt-1', amount: 175 }, created_at: '2026-07-03T00:00:00Z' },
    ];
    render(<GenericEngine module={getModule('debt')} />);
    expect(await screen.findByText(/Remaining: 225/)).toBeTruthy();
    expect(screen.getAllByText(/paid/)).toHaveLength(2);
  });
});
