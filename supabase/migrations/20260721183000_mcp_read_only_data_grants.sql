-- Existing-project follow-up: the Everyday MCP Edge Function is read-only.
-- It authenticates a personal token, resolves its owner, and filters every
-- query by that owner. These are table privileges only; no write privilege is
-- granted to service_role.
grant select on public.entry_records, public.checklist_items, public.streak_checkins, public.saved_items, public.due_items, public.goals to service_role;
