-- Checklist history safety: completion and archive actions must never delete a row.
alter table public.checklist_items
  add column if not exists completed_at timestamptz,
  add column if not exists archived_at timestamptz;

create index if not exists checklist_items_owner_module_history_idx
  on public.checklist_items (user_id, module_id, archived_at, completed_at desc);
