# Everyday — Project Spec

## Product scope

Everyday is a personal “everything app”: one dashboard for daily-life tracking, built from five reusable, configuration-led engines instead of dozens of isolated mini-apps.

The agreed catalog is **36 planned core engine modules + 4 original meta features = 40**. Investments is an additional implemented EntryTracker, making **41 built/configured catalog features overall**.

Connect to AI/MCP is an additional integration surface. It is implemented in code but is not included in the 41-feature catalog count above.

## Engines

| Engine | Modules |
|---|---|
| EntryTracker | Calories, Budget, Water intake, Weight, Steps, Time tracking, Subscriptions, Savings goal, Net worth, Investments |
| Checklist | Todo, Grocery list, Watchlist, Bucket list, Gift ideas |
| StreakTracker | Exercise, Medication/vitamin reminder, Meditation, Habit tracker, Language learning, Skill practice, Gratitude log |
| SavedItems | Link saver, Journal/daily notes, Reading list, Contacts, Recipe box, Idea inbox, Quote collector |
| DueDateTracker | Debt payoff, Remittance log, Chore schedule, Package/delivery tracker, Warranty/receipt tracker, Document expiry, Vehicle/bike maintenance, Course/certification tracker |

The four catalog meta features are Dashboard, Goals tracker, Global Search, and Backup/Import. Connect to AI/MCP is an optional read-only integration beyond that catalog count.

## Stack and architecture

- React + Vite, with `vite-plugin-singlefile` for a self-contained production HTML build.
- Supabase anonymous authentication, Row Level Security, and generic engine tables.
- A configuration-led module catalog with pragmatic module/profile-specific UI branches where the shared pattern is not enough.
- Optional read-only Supabase Edge Function implementing MCP.

## Current implementation status

- All 37 engine modules in the current catalog are implemented in code, alongside the four original meta features.
- Live persistence requires the base schema and the relevant history, habit, and goals migrations. Repository source alone cannot prove which SQL has run in a particular project.
- Connect to AI/MCP requires its token migration, read-grant migrations, and Edge Function deployment. The handler has automated tests. During this project work, a ChatGPT No auth connector was manually connected and listed the server tools; Claude has not been manually verified here.
- Automated tests cover shared engine logic, configuration validation, formatter/render regressions, generic/meta UI behavior, and MCP protocol behavior. This is distinct from end-to-end verification against a live user dataset.

## Explicitly excluded or deferred

- **Cut:** Password/notes vault. A public/shared hackathon repository is not an appropriate security boundary for secret storage.
- **Stretch only, not built/configured:** Image saver, Mood tracker, Period/cycle tracker, Pomodoro timer, Calendar/event log, Currency converter, and Meal planner.

## Working rules

- Keep module definitions configuration-led and reuse generic Supabase tables.
- Do not create one table per feature.
- Preserve anonymous authentication and RLS.
- Do not install dependencies, analytics, telemetry, or third-party scripts without explicit approval.
- Treat module-specific experiences as pragmatic exceptions, not proof that every engine is fully generic.

See `README.md` and `docs/` for setup, architecture, data model, module catalog, MCP guidance, demo flow, and limitations.
