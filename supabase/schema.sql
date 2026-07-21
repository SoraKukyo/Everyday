create table if not exists public.entry_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  value numeric not null,
  occurred_at timestamptz not null default now(),
  note text,
  fields jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entry_records_owner_module_time_idx
  on public.entry_records (user_id, module_id, occurred_at desc);

alter table public.entry_records enable row level security;

grant select, insert, update, delete on table public.entry_records to authenticated;
-- Read-only access for the MCP Edge Function. It always scopes reads to the
-- personal access token's owner and never exposes this role to the browser.
grant select, insert, update on table public.entry_records to service_role;

drop policy if exists "entry records are private to their owner" on public.entry_records;
drop policy if exists "owners insert their own entry records" on public.entry_records;
drop policy if exists "owners update their own entry records" on public.entry_records;
drop policy if exists "owners delete their own entry records" on public.entry_records;
create policy "entry records are private to their owner"
  on public.entry_records for select to authenticated
  using (user_id = auth.uid());

create policy "owners insert their own entry records"
  on public.entry_records for insert to authenticated
  with check (user_id = auth.uid());

create policy "owners update their own entry records"
  on public.entry_records for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "owners delete their own entry records"
  on public.entry_records for delete to authenticated
  using (user_id = auth.uid());

create table if not exists public.checklist_items (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, module_id text not null, title text not null, is_complete boolean not null default false, completed_at timestamptz, archived_at timestamptz, fields jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table if not exists public.streak_checkins (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, module_id text not null, completed_on date not null, note text, fields jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), unique(user_id, module_id, completed_on));
create table if not exists public.saved_items (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, module_id text not null, title text not null, content text, tags text[] not null default '{}', metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table if not exists public.due_items (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, module_id text not null, title text not null, due_at date, is_complete boolean not null default false, completed_at timestamptz, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create table if not exists public.goals (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, module_id text not null, title text not null, target_module_id text not null, created_at timestamptz not null default now());

grant select, insert, update, delete on public.checklist_items, public.streak_checkins, public.saved_items, public.due_items, public.goals to authenticated;
grant select, insert, update on public.checklist_items, public.streak_checkins, public.saved_items, public.due_items, public.goals to service_role;

alter table public.checklist_items enable row level security;
alter table public.streak_checkins enable row level security;
alter table public.saved_items enable row level security;
alter table public.due_items enable row level security;
alter table public.goals enable row level security;

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
