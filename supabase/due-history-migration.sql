-- Due-item history safety: completed occurrences need a durable completion time.
alter table public.due_items
  add column if not exists completed_at timestamptz;

create index if not exists due_items_owner_module_completion_idx
  on public.due_items (user_id, module_id, completed_at desc);
