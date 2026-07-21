import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ tables: {}, from: vi.fn() }));

vi.mock('../src/data/supabaseClient.js', () => ({
  getAnonymousUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
  supabase: { from: state.from },
}));

vi.mock('../src/data/pagedRecords.js', () => ({
  listAllRowsForUser: vi.fn(async (table) => ({ rows: state.tables[table] ?? [], truncated: false })),
}));

import Dashboard from '../src/dashboard/Dashboard';
import GlobalSearch from '../src/meta/GlobalSearch';

describe('meta feature rendering', () => {
  beforeEach(() => {
    state.tables = {};
    state.from.mockImplementation((table) => ({ select: () => ({ eq: async () => ({ data: state.tables[table] ?? [], error: null }) }) }));
  });

  it('renders real Dashboard module snapshots from engine data', async () => {
    const today = new Date().toISOString().slice(0, 10);
    state.tables.entry_records = [{ id: 'cal-1', module_id: 'calories', value: 700, occurred_at: `${today}T08:00:00Z`, metadata: {} }];
    render(<Dashboard onOpen={vi.fn()} />);
    expect(await screen.findByText('700 kcal today')).toBeTruthy();
  });

  it('finds SavedItems metadata such as recipe ingredients across modules', async () => {
    state.tables.saved_items = [{ id: 'recipe-1', module_id: 'recipes', title: 'Pasta', content: '', tags: [], metadata: { ingredients: 'tomato basil' } }];
    render(<GlobalSearch onOpen={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Search records' }), { target: { value: 'tomato' } });
    expect(await screen.findByText('Pasta')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Recipe box.*Pasta/ })).toBeTruthy();
  });
});
