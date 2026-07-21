#!/usr/bin/env node

// Read-only post-deployment MCP check. It intentionally never writes data.
// Required: MCP_URL and MCP_TOKEN. MCP_AUTH_MODE is "query" by default, or
// "bearer" to exercise direct Authorization-header authentication instead.

const endpoint = process.env.MCP_URL?.replace(/\/$/, '');
const token = process.env.MCP_TOKEN;
const authMode = (process.env.MCP_AUTH_MODE ?? 'query').toLowerCase();

if (!endpoint || !token) {
  console.error('Set MCP_URL and MCP_TOKEN before running this script. The token is not printed.');
  process.exit(1);
}
if (!['query', 'bearer'].includes(authMode)) {
  console.error('MCP_AUTH_MODE must be "query" or "bearer".');
  process.exit(1);
}

const url = new URL(endpoint);
const headers = { 'content-type': 'application/json' };
if (authMode === 'query') url.searchParams.set('token', token);
else headers.authorization = `Bearer ${token}`;

async function call(id, method, params) {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  const body = await response.text();
  let json;
  try { json = JSON.parse(body); } catch { throw new Error(`${method}: expected JSON, received HTTP ${response.status}.`); }
  if (!response.ok) throw new Error(`${method}: HTTP ${response.status}: ${json.error?.message ?? body}`);
  if (json.error) throw new Error(`${method}: ${json.error.message}`);
  if (json.result?.isError) throw new Error(`${method}: ${json.result.content?.[0]?.text ?? 'tool returned an error'}`);
  return json.result;
}

try {
  const initialize = await call(1, 'initialize', {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'everyday-setup-check', version: '1.0.0' },
  });
  if (initialize?.serverInfo?.name !== 'everyday-mcp') throw new Error('initialize: unexpected server identity.');

  const toolList = await call(2, 'tools/list', {});
  const toolNames = toolList.tools?.map((tool) => tool.name) ?? [];
  const expected = ['list_active_modules', 'get_weekly_summary', 'get_module_history', 'get_current_streaks', 'get_upcoming_due_items', 'get_goal_progress'];
  if (expected.some((name) => !toolNames.includes(name))) throw new Error(`tools/list: expected all six tools, received ${toolNames.join(', ') || 'none'}.`);

  // This reads every shared MCP data table and catches missing service_role
  // grants even when the new project has no user records yet.
  await call(3, 'tools/call', { name: 'get_weekly_summary', arguments: {} });
  await call(4, 'tools/call', { name: 'get_goal_progress', arguments: {} });

  console.log(`MCP verification passed using ${authMode} authentication.`);
  console.log(`Verified initialize, all ${expected.length} tools, shared-table reads, and goals reads.`);
} catch (error) {
  console.error(`MCP verification failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
