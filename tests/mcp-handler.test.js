import { describe, expect, it } from 'vitest';
import { handleMcpRequest, MCP_INSTRUCTIONS } from '../supabase/functions/_shared/mcpHandler.js';

const token = 'evd_mcp_test-token';
const rows = {
  entry_records: [
    { id: 'income', module_id: 'budget', value: 1000, occurred_at: '2026-07-20T08:00:00Z', metadata: { transactionType: 'income' }, fields: {} },
    { id: 'expense', module_id: 'budget', value: 250, occurred_at: '2026-07-21T08:00:00Z', metadata: { transactionType: 'expense', category: 'Food' }, fields: {} },
    { id: 'weight', module_id: 'weight', value: 70, occurred_at: '2026-07-20T08:00:00Z', metadata: {}, fields: {} },
  ],
  checklist_items: [], streak_checkins: [], saved_items: [], due_items: [], goals: [],
};

function repository({ valid = true, data = rows } = {}) {
  return {
    allowedOrigins: [],
    async findUserIdByTokenHash() { return valid ? 'user-a' : null; },
    async readAll(table, userId) { expect(userId).toBe('user-a'); return data[table] ?? []; },
  };
}

function request(body, { accessToken = token, queryToken = null, includeAuthorization = true } = {}) {
  const url = new URL('https://example.test/mcp');
  if (queryToken !== null) url.searchParams.set('token', queryToken);
  const headers = { 'content-type': 'application/json' };
  if (includeAuthorization) headers.authorization = `Bearer ${accessToken}`;
  return new Request(url, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id: 1, ...body }) });
}

describe('Everyday MCP protocol handler', () => {
  it('returns MCP capabilities and clear read-only instructions during initialize', async () => {
    const result = await handleMcpRequest({ request: request({ method: 'initialize' }), repository: repository() });
    expect(result.status).toBe(200);
    expect(result.body.result.instructions).toBe(MCP_INSTRUCTIONS);
    expect(result.body.result.capabilities.tools).toEqual({ listChanged: false });
  });

  it('lists exactly the six declared read-only tools', async () => {
    const result = await handleMcpRequest({ request: request({ method: 'tools/list' }), repository: repository() });
    const tools = result.body.result.tools;
    expect(tools.map((tool) => tool.name)).toEqual(['list_active_modules', 'get_weekly_summary', 'get_module_history', 'get_current_streaks', 'get_upcoming_due_items', 'get_goal_progress']);
    expect(tools.every((tool) => tool.annotations.readOnlyHint && !tool.annotations.destructiveHint)).toBe(true);
  });

  it('rejects invalid or revoked bearer tokens before exposing any data', async () => {
    const result = await handleMcpRequest({ request: request({ method: 'tools/list' }, { accessToken: 'invalid-token' }), repository: repository({ valid: false }) });
    expect(result.status).toBe(401);
    expect(result.body.error.message).toMatch(/Invalid or revoked/);
  });

  it('authenticates a no-auth connector request using the token query parameter', async () => {
    const result = await handleMcpRequest({ request: request({ method: 'tools/list' }, { includeAuthorization: false, queryToken: token }), repository: repository() });
    expect(result.status).toBe(200);
    expect(result.body.result.tools).toHaveLength(6);
  });

  it('does not allow a query token to override an invalid Authorization header', async () => {
    const result = await handleMcpRequest({ request: request({ method: 'tools/list' }, { accessToken: 'invalid-token', queryToken: token }), repository: repository({ valid: false }) });
    expect(result.status).toBe(401);
  });

  it('returns a structured weekly Budget net calculation rather than a flat sum', async () => {
    const result = await handleMcpRequest({ request: request({ method: 'tools/call', params: { name: 'get_weekly_summary', arguments: { week_start: '2026-07-20', timezone: 'UTC' } } }), repository: repository() });
    const output = result.body.result.structuredContent;
    const budget = output.summaries.find((summary) => summary.module.id === 'budget');
    expect(budget).toMatchObject({ unit: 'USD', value: 750, income: 1000, expenses: 250, calculation: 'income_minus_expenses' });
  });

  it('calculates a descending Weight goal from its first snapshot instead of treating a lower target as already complete', async () => {
    const data = {
      ...rows,
      entry_records: [
        { id: 'weight-start', module_id: 'weight', value: 76.4, occurred_at: '2024-08-01T08:00:00Z', metadata: {}, fields: {} },
        { id: 'weight-current', module_id: 'weight', value: 73.2, occurred_at: '2026-07-19T08:00:00Z', metadata: {}, fields: {} },
      ],
      goals: [{ id: 'weight-goal', target_module_id: 'weight', title: 'Sustainable weight goal', target_value: 70, target_unit: 'kg', is_complete: false }],
    };
    const result = await handleMcpRequest({ request: request({ method: 'tools/call', params: { name: 'get_goal_progress', arguments: {} } }), repository: repository({ data }) });
    expect(result.body.result.structuredContent.goals[0]).toMatchObject({ current_value: 73.2, starting_value: 76.4, target_value: 70, direction: 'decrease', progress_percent: 50 });
  });

  it('returns human-readable module history rather than raw table fields', async () => {
    const result = await handleMcpRequest({ request: request({ method: 'tools/call', params: { name: 'get_module_history', arguments: { module_id: 'budget' } } }), repository: repository() });
    const record = result.body.result.structuredContent.records[0];
    expect(record).toMatchObject({ module: { title: 'Budget' }, unit: 'USD', value: 250 });
    expect(record.details).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'Category', value: 'Food' })]));
    expect(record).not.toHaveProperty('metadata');
  });
});
