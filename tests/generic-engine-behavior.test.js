import { describe, expect, it } from 'vitest';
import { applyAutoFields, completionFieldPatch, detectValue, matchesConfiguredFilter, namedStreakScope, recurrenceField } from '../src/engines/genericEngineBehavior';
import { getModule } from '../src/config/modules';

describe('generic engine configuration behavior', () => {
  it('auto-detects Link Saver types without overwriting an explicit user selection', () => {
    expect(detectValue('link-type', 'https://www.youtube.com/watch?v=1')).toBe('YouTube');
    expect(detectValue('link-type', 'https://instagram.com/p/one')).toBe('Instagram');
    expect(applyAutoFields({ url: 'https://example.com' }, getModule('links').savedBehavior.autoFields)).toMatchObject({ type: 'Article' });
    expect(applyAutoFields({ url: 'https://example.com', type: 'Other' }, getModule('links').savedBehavior.autoFields)).toMatchObject({ type: 'Other' });
  });

  it('evaluates config-defined saved and checklist filters', () => {
    const today = new Date('2026-07-20T12:00:00Z');
    expect(matchesConfiguredFilter({ lastTalked: '2026-05-01' }, 'follow-up', getModule('contacts').savedBehavior.filters, today)).toBe(true);
    expect(matchesConfiguredFilter({ lastTalked: '2026-07-19' }, 'follow-up', getModule('contacts').savedBehavior.filters, today)).toBe(false);
    expect(matchesConfiguredFilter({ dueDate: '2026-07-20' }, 'today', getModule('todo').listExperience.filters, today)).toBe(true);
  });

  it('reads named habit scope, checklist completion rules, and recurring due settings from config', () => {
    expect(namedStreakScope(getModule('habits'))).toEqual({ kind: 'named', field: 'habit' });
    expect(recurrenceField(getModule('chores'))).toBe('repeat');
    expect(completionFieldPatch(getModule('watchlist').listExperience, { fields: { status: 'In progress' } })).toEqual({ status: 'Finished' });
  });
});
