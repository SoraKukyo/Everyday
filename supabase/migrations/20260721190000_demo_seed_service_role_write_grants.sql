-- Allows the local deterministic demo seed script to upsert and verify data
-- for a deliberately selected user. The MCP Edge Function remains read-only
-- in code and has no write tools; do not add write queries to it.
grant select, insert, update on table public.entry_records to service_role;
grant select, insert, update on table public.checklist_items to service_role;
grant select, insert, update on table public.streak_checkins to service_role;
grant select, insert, update on table public.saved_items to service_role;
grant select, insert, update on table public.due_items to service_role;
grant select, insert, update on table public.goals to service_role;
grant select, insert, update on table public.module_settings to service_role;
