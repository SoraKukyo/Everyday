-- Everyday MCP personal access tokens. Only SHA-256 hashes are stored.
create table if not exists public.mcp_access_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  token_prefix text not null,
  label text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint mcp_access_tokens_hash_length check (char_length(token_hash) = 64)
);

create index if not exists mcp_access_tokens_active_hash_idx
  on public.mcp_access_tokens (token_hash) where revoked_at is null;
create index if not exists mcp_access_tokens_owner_idx
  on public.mcp_access_tokens (user_id, created_at desc);

alter table public.mcp_access_tokens enable row level security;
grant select, insert, update, delete on public.mcp_access_tokens to authenticated;
-- The read-only MCP Edge Function uses service_role only to resolve a token
-- owner, then scopes all subsequent reads to that owner.
grant select on public.mcp_access_tokens to service_role;

drop policy if exists "owners view their MCP tokens" on public.mcp_access_tokens;
drop policy if exists "owners create their MCP tokens" on public.mcp_access_tokens;
drop policy if exists "owners revoke their MCP tokens" on public.mcp_access_tokens;
drop policy if exists "owners delete their MCP tokens" on public.mcp_access_tokens;
create policy "owners view their MCP tokens"
  on public.mcp_access_tokens for select to authenticated
  using (user_id = auth.uid());
create policy "owners create their MCP tokens"
  on public.mcp_access_tokens for insert to authenticated
  with check (user_id = auth.uid());
create policy "owners revoke their MCP tokens"
  on public.mcp_access_tokens for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owners delete their MCP tokens"
  on public.mcp_access_tokens for delete to authenticated
  using (user_id = auth.uid());
