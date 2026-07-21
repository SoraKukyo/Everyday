-- Live follow-up for projects that ran the original MCP migration before the
-- read-only Edge Function needed to resolve token hashes as service_role.
grant select on public.mcp_access_tokens to service_role;
