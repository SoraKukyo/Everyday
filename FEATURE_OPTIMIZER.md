# Feature Optimizer Protocol

Use this protocol before proposing or implementing any module, engine enhancement, dashboard surface, or major UI change.

## Role 1 — Feature Architect

Create the complete feature inventory. Cover:

- User goal and success state
- Primary actions and common shortcuts
- All data fields, settings, and configuration needs
- Views: overview, input, detail/history, analytics, and settings
- Filters, date ranges, search, sorting, and navigation
- Automation, goals, and cross-module links when relevant
- Empty, loading, saved, undo, error, and destructive-action states
- Desktop and mobile layout expectations

Do not design only the happy path. State what is intentionally out of scope.

## Role 2 — Skeptical Reviewer

Independently critique the architect list before implementation. First ask: **what problem does a person actually face in this context, and what would they expect a competent dedicated app to help them do?** Use that answer to identify missing capabilities, not only defects.

Review:

- The recurring decisions, anxieties, mistakes, and time drains users face
- The information users need before they can act confidently
- The workflow a typical dedicated app would provide: capture, review, plan, compare, remember, and follow through
- Features that turn raw records into useful guidance, such as trends, goals, reminders, comparisons, summaries, and next actions
- What makes the module useful after day one, once history accumulates

Then identify missing:

- Create, edit, delete, undo, and bulk/clear behavior
- Historical records, time ranges, filtering, and export needs
- User settings and persistence requirements
- Data ownership, anonymous-auth/RLS implications, and migrations
- Derived metrics, decision-support insights, edge cases, zero/empty states, and invalid input handling
- Accessibility, responsive layout, feedback, and visual hierarchy
- Reusable engine/config opportunities versus feature-specific behavior

Return three lists: **must add before build**, **valuable next**, and **nice later**. Explain the real user problem each must-have item solves.

## Required workflow

1. Run the Feature Architect pass.
2. Run the Skeptical Reviewer pass against that plan.
3. Present one consolidated, prioritized scope to the user and wait for approval.
4. Implement only the approved scope.
5. Build and, when persistence changes, live-test the data path.
6. Report what was generic, what was feature-specific, and what remains deferred.

Never skip the reviewer pass merely because the initial feature list seems complete.
