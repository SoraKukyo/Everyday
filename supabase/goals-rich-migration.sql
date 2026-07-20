-- Adds measurable, optional goals while preserving existing goal records.
alter table public.goals add column if not exists target_value numeric;
alter table public.goals add column if not exists target_unit text;
alter table public.goals add column if not exists due_at date;
alter table public.goals add column if not exists is_complete boolean not null default false;
