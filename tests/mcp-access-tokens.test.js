import { describe, expect, it } from 'vitest';
import { buildMcpConnectorUrl, createMcpAccessToken, tokenPrefix } from '../src/lib/mcpAccessTokens';

describe('MCP access token helpers', () => {
  it('creates unpredictable-looking, copyable bearer tokens and a non-secret display prefix', () => {
    const first = createMcpAccessToken(); const second = createMcpAccessToken();
    expect(first).toMatch(/^evd_mcp_[A-Za-z0-9_-]{43}$/);
    expect(first).not.toBe(second);
    expect(tokenPrefix(first)).toBe(`${first.slice(0, 15)}…`);
  });

  it('builds a complete No auth connector URL with an encoded token query parameter', () => {
    const result = buildMcpConnectorUrl('https://project.supabase.co/functions/v1/everyday-mcp', 'evd_mcp_demo-token_123');
    expect(result).toBe('https://project.supabase.co/functions/v1/everyday-mcp?token=evd_mcp_demo-token_123');
  });
});
