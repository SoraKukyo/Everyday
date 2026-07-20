# Everyday — Project Spec

## What this is
A personal "everything app" — one dashboard replacing dozens of single-purpose daily-life apps, built from 5 reusable, config-driven engines.

## Engines & full module list (42 modules)

### EntryTracker (numeric entry + running total/chart) — accent: Green (habits/nutrition types) or Pink (budget types), see mapping below
- Calories — daily reset, goal, bar chart [BUILT]
- Budget — sum, category field, currency
- Water intake — daily reset, goal
- Weight — latest + all_time, trend chart
- Steps — daily reset, goal
- Time tracking — duration, project/task field
- Subscriptions — recurrence + dueDate metadata
- Savings goal — target amount, progress %
- Net worth — latest + all_time, trend chart

### Checklist (add/check/delete) — accent: Pink
- Todo
- Grocery list
- Watchlist (books/movies)
- Bucket list
- Gift ideas (per person)

### StreakTracker (mark done today, streak count) — accent: Green
- Exercise
- Medication/vitamin reminder
- Meditation
- Habit tracker (generic, user-defined)
- Language learning
- Skill practice
- Gratitude log

### SavedItems (save + notes/tags, browse later) — accent: Blue
- Link saver (auto-detect type: instagram/youtube/article)
- Journal/daily notes
- Reading list (progress %)
- Contacts (birthday, last talked)
- Recipe box
- Idea inbox
- Quote collector

### DueDateTracker (item + due date, flags upcoming/overdue) — accent: Blue
- Debt payoff
- Remittance log
- Chore schedule (recurring)
- Package/delivery tracker
- Warranty/receipt tracker
- Document expiry (visa, insurance, passport)
- Vehicle/bike maintenance
- Course/certification tracker

### Meta (built once, on top of all modules)
- Goals tracker (cross-references any module)
- Dashboard (snapshot card from every active module)
- Global search (across all modules)
- Data export/import (JSON backup)

### Explicitly cut
- Password/notes vault — security risk given public/shared repo for judging

### Stretch only, not core (different UI patterns, build last if time allows)
- Image saver, Mood tracker, Period/cycle tracker, Pomodoro timer, Calendar/event log, Currency converter, Meal planner

## Design system
See design_system_spec.md for CSS variables, type scale, and card shell spec.
Color mapping by category:
- Green: habits, nutrition
- Blue: links, reminders, notes
- Pink: budget, self-care, tasks

## Tech stack
- React + Vite, single-file build (vite-plugin-singlefile)
- Supabase (anonymous auth + RLS on every table)
- No server

## Standing rules (also in AGENTS.md)
- Never install a new package/plugin/dependency without asking first and explaining why. List in package.json, don't install without approval.
- Never add analytics, telemetry, or third-party scripts without asking.
- Keep each engine generic and config-driven — no hardcoded feature-specific logic inside an engine component.
- Ask before architectural changes affecting more than one engine.

## Build workflow (follow this for every module from here on)
1. I name the next module to build.
2. Before writing code, briefly summarize your plan: which engine it uses, what config fields it needs, any new fields/edge cases vs. previously built modules of the same engine, and the accent color per the mapping above.
3. Wait for my go-ahead.
4. Build it (config entry + any engine changes needed).
5. Report back: what changed, whether it's fully generic or needed engine-specific tweaks, and confirm it's tested (persists via Supabase, matches design system).
6. I review, approve, then we move to the next module.

Do not batch-build multiple modules in one uninterrupted pass — one module per review cycle, even if it feels slower. This is intentional so drift/bugs get caught early rather than compounding across 42 modules.

## Status
- [x] Calories (EntryTracker)
- [ ] Budget (EntryTracker) — next
- [ ] ...remaining 40 modules