create table if not exists public.checklist_items (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, module_id text not null, title text not null, is_complete boolean not null default false, completed_at timestamptz, archived_at timestamptz, fields jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table if not exists public.streak_checkins (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, module_id text not null, completed_on date not null, note text, fields jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), unique(user_id, module_id, completed_on));
create table if not exists public.saved_items (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, module_id text not null, title text not null, content text, tags text[] not null default '{}', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table if not exists public.due_items (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, module_id text not null, title text not null, due_at date, is_complete boolean not null default false, completed_at timestamptz, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table if not exists public.goals (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, module_id text not null, title text not null, target_module_id text not null, created_at timestamptz not null default now());
create table if not exists public.module_settings (user_id uuid not null references auth.users(id) on delete cascade, module_id text not null, settings jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(), primary key (user_id, module_id));

grant select, insert, update, delete on public.checklist_items, public.streak_checkins, public.saved_items, public.due_items, public.goals, public.module_settings to authenticated;
-- The MCP Edge Function remains intentionally read-only in code. The local
-- demo-seed script also uses service_role for deterministic upserts; never
-- expose that key to the browser or a connector.
grant select, insert, update on public.checklist_items, public.streak_checkins, public.saved_items, public.due_items, public.goals, public.module_settings to service_role;
alter table public.checklist_items enable row level security;
alter table public.streak_checkins enable row level security;
alter table public.saved_items enable row level security;
alter table public.due_items enable row level security;
alter table public.goals enable row level security;
alter table public.module_settings enable row level security;

drop policy if exists "checklist items are private" on public.checklist_items;
drop policy if exists "streak checkins are private" on public.streak_checkins;
drop policy if exists "saved items are private" on public.saved_items;
drop policy if exists "due items are private" on public.due_items;
drop policy if exists "goals are private" on public.goals;
create policy "checklist items are private" on public.checklist_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "streak checkins are private" on public.streak_checkins for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "saved items are private" on public.saved_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "due items are private" on public.due_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "goals are private" on public.goals for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "module settings are private" on public.module_settings;
create policy "module settings are private" on public.module_settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
