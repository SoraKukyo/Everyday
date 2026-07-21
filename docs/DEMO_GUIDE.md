# Hackathon demo guide

## Before recording: do not demo unless verified

- [ ] `.env` points to the intended Supabase project.
- [ ] Base schema and the required history/habit/goal migrations have run.
- [ ] `demo-everyday-backup.json` imported successfully once into the current anonymous account.
- [ ] Dashboard shows records after refresh.
- [ ] Calories, Budget, Todo, Habit tracker, Link saver, and a due-date module have visible demo data.
- [ ] `npm test` and `npm run build` pass.
- [ ] If showing MCP: token migration ran, Edge Function deployed, and raw MCP handshake/tools call succeeded.
- [ ] Do not claim Claude/ChatGPT connection unless it was actually connected and tested.

## Three-minute story

### 0:00–0:25 — the problem

“My daily life is spread across calorie apps, budgeting apps, task lists, habit trackers, saved links, and reminders. The issue is not that any one app is bad—it is that none of them can show the whole picture.”

### 0:25–0:50 — the system idea

“Everyday replaces separate single-purpose tools with five reusable engines. New modules are configurations of shared data and UI patterns, rather than a new database table and a new application every time.”

Show Dashboard, module groups, and snapshots.

### 0:50–1:30 — rich daily tracking

Open Calories. Add or show food, calories burned, daily target, weight-loss mode, and the food/activity history. Say: “This is not just a number field—it separates intake, activity, daily plan, and review.”

### 1:30–2:05 — money and follow-through

Open Budget. Show income/expense, category health, history filters, and monthly view. Then open Todo or Grocery and show completed/archive history rather than deleting evidence of work.

### 2:05–2:30 — life context across modules

Open Habit tracker for its contribution history, then Global Search for a saved recipe, link, or contact. This demonstrates that modules are not isolated screens.

### 2:30–3:00 — optional MCP close

Only if deployed and tested: “Everyday can also expose the user’s own data through a read-only MCP server. The user creates a revocable token; the AI can analyze patterns but cannot modify records.” Show Connect to AI and a verified MCP response if available.

## Five-minute version

Use the three-minute story, then add:

1. **Dashboard attention:** overdue/upcoming due items and active lists.
2. **History:** switch Calories or Budget to a longer date range and search/filter a record.
3. **Due-date detail:** show a package tracking link, recurring chore history, or debt ledger after creating payments in the UI.
4. **Privacy:** briefly show anonymous-account isolation, RLS-backed design, backup ownership, and read-only token revocation.

## Data setup notes

Import the demo backup before recording. It is additive: only import once unless intentional duplicates are useful. Its dates make charts/history meaningful, but imported saved/checklist creation timestamps use the import date and debt-ledger relationships should be created in-app after import.

## Likely judge questions

| Question | Suggested answer |
|---|---|
| “Is this 40 separate apps?” | “No. The catalog configures five shared engines and generic tables. Some high-value experiences have pragmatic profile-specific UI.” |
| “How is data private?” | “Each anonymous account is isolated with Supabase RLS. The app has no login screen, but records are scoped to the current anonymous user.” |
| “What makes this more useful than separate apps?” | “Dashboard, cross-module search, goals, consistent history, and the option to ask an AI about the same personal context.” |
| “Can the MCP server edit data?” | “No. It is deliberately read-only. Tokens are hashed, revocable, and all reads are filtered to the token owner.” |
| “Does it work with ChatGPT/Claude?” | “The remote MCP server is implemented and protocol-tested. We only claim connector support after manual client verification.” |
| “What would you build next?” | “More declarative engine profiles, broader goal compatibility, server-side import transactions, and a dedicated mobile product design.” |

## Avoid these demo risks

- Do not start with an empty Dashboard.
- Do not rely on a migration or deployment that has not just been tested.
- Do not say “fully generic” if asked; explain the deliberate profile-specific exceptions.
- Do not show personal credentials, raw tokens, `.env`, or real private data.
- Do not use a real external tracking URL unless it is safe to expose.
