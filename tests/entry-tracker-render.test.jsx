import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/data/supabaseClient.js', () => ({ getAnonymousUser: vi.fn().mockResolvedValue({ id: 'user-1' }), isSupabaseConfigured: true }));
vi.mock('../src/data/entryRecords.js', () => ({ createEntryRecord: vi.fn(), deleteEntryRecord: vi.fn(), updateEntryRecord: vi.fn(), listAllEntryRecords: vi.fn().mockResolvedValue([]), listEntryRecords: vi.fn().mockResolvedValue([]) }));
vi.mock('../src/data/moduleSettings.js', () => ({ getModuleSettings: vi.fn().mockResolvedValue({}), saveModuleSettings: vi.fn().mockResolvedValue(undefined) }));

import EntryTracker from '../src/engines/EntryTracker/EntryTracker';
import { modules } from '../src/config/modules';

const trackers = modules.filter((module) => module.engine === 'entryTracker');

describe('EntryTracker rendering', () => {
  afterEach(() => { vi.clearAllMocks(); });
  it.each(trackers)('renders $title without a formatting crash', async (module) => {
    render(<EntryTracker module={module} onBack={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: module.title })).toBeTruthy();
  });
});
