import { authenticateMcpRequest, handleMcpRequest } from '../_shared/mcpHandler.js';

const projectUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const allowedOrigins = (Deno.env.get('MCP_ALLOWED_ORIGINS') ?? '').split(',').map((value) => value.trim()).filter(Boolean);
const PAGE_SIZE = 1000;

function headers(origin: string | null) {
  const values: Record<string, string> = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Vary': 'Origin' };
  if (origin && allowedOrigins.includes(origin)) { values['Access-Control-Allow-Origin'] = origin; values['Access-Control-Allow-Headers'] = 'authorization, content-type, mcp-session-id, mcp-protocol-version'; values['Access-Control-Allow-Methods'] = 'POST, OPTIONS'; }
  return values;
}

function restHeaders(extra: Record<string, string> = {}) {
  // Supabase service/secret keys belong in `apikey`. Putting a current secret
  // key in Authorization makes PostgREST try to validate it as a user JWT.
  return { apikey: serviceRoleKey, Accept: 'application/json', ...extra };
}

const repository = {
  allowedOrigins,
  async findUserIdByTokenHash(tokenHash: string) {
    const query = new URLSearchParams({ select: 'user_id', token_hash: `eq.${tokenHash}`, revoked_at: 'is.null', limit: '1' });
    const response = await fetch(`${projectUrl}/rest/v1/mcp_access_tokens?${query}`, { headers: restHeaders() });
    if (!response.ok) throw new Error('MCP token lookup failed. Confirm the migration has been run.');
    const rows = await response.json(); return rows[0]?.user_id ?? null;
  },
  async readAll(table: string, userId: string, maxRows: number) {
    const rows: unknown[] = [];
    for (let offset = 0; offset < maxRows; offset += PAGE_SIZE) {
      const query = new URLSearchParams({ select: '*', user_id: `eq.${userId}` });
      const response = await fetch(`${projectUrl}/rest/v1/${table}?${query}`, { headers: restHeaders({ Range: `${offset}-${Math.min(offset + PAGE_SIZE - 1, maxRows - 1)}` }) });
      if (!response.ok) throw new Error(`Read failed for ${table}.`);
      const page = await response.json(); rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    return rows;
  },
};

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') {
    if (origin && !allowedOrigins.includes(origin)) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: headers(origin) });
  }
  if (request.method === 'GET') {
    const authentication = await authenticateMcpRequest({ request, repository });
    if (authentication.error) return new Response(JSON.stringify(authentication.error.body), { status: authentication.error.status, headers: { ...headers(origin), ...(authentication.error.headers ?? {}) } });
    return new Response(': Everyday MCP connected\n\n', { status: 200, headers: { ...headers(origin), 'Content-Type': 'text/event-stream', Connection: 'keep-alive' } });
  }
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Use POST for MCP JSON-RPC requests.' }), { status: 405, headers: headers(origin) });
  try {
    const result = await handleMcpRequest({ request, repository });
    return new Response(result.body ? JSON.stringify(result.body) : null, { status: result.status, headers: { ...headers(origin), ...(result.headers ?? {}) } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error.';
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32603, message } }), { status: 500, headers: headers(origin) });
  }
});
