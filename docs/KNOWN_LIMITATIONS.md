# Known limitations

This document separates working code from live verification and deliberate scope boundaries.

## Deployment and connector verification

- The repository cannot prove which SQL migrations or Edge Function version are live in any particular Supabase project.
- A ChatGPT No auth connector was manually connected and listed the six MCP tools during this project work. Re-test after deployment; Claude and other MCP clients have not been manually verified here.
- ChatGPT and Claude connector UIs offer OAuth or No auth rather than a raw Bearer-token field. Everyday supports the No auth query-token URL as a fallback; OAuth is not implemented.
- A token in a URL can be retained in connector settings, browser history, or logs. Treat it as sensitive and revoke it if exposed.
- Not every configured module has recorded end-to-end manual Supabase verification in the repository. Unit/component tests do not prove a live database configuration.

## Architecture and scale

- Engines are configuration-led, not free of module-specific branches. Calories, Budget, subscriptions, Investments, named habits, and debt-ledger behavior have specialized profiles.
- Generic JSONB fields make module expansion quick but trade strict database typing and easy ad-hoc SQL analytics for flexibility.
- App history/list surfaces use page-size limits. The MCP server caps broad scans and paginates module history, so unusually large personal datasets need deliberate scale testing.
- Dashboard and Global Search query broad client-side table data; database-side aggregation/search would be a future performance refactor.

## Data and backup

- Import is additive and can create duplicates.
- Import removes source IDs and creation/update timestamps, so imported rows receive new IDs and current creation dates.
- A debt payment cannot be prelinked to a debt created in the same generic import because the database creates the debt ID. Add payment-ledger records after import.
- Import uses a client-side rollback attempt, not one database transaction.
- Anonymous auth isolates data through RLS but does not provide traditional account recovery if browser/session storage is cleared.
- Anonymous sessions are scoped to the browser origin. Opening the built app as `file://...` and running the app at `http://localhost:5173` creates different anonymous users, so records seeded or imported in one origin do not appear in the other.

## Product scope

- Desktop is the supported target. Dedicated mobile navigation and touch-first interaction are intentionally out of scope.
- Password/notes vault is intentionally cut; this public/shared hackathon repository is not an appropriate secret-storage boundary.
- Stretch modules are not built/configured: Image saver, Mood tracker, Period/cycle tracker, Pomodoro timer, Calendar/event log, Currency converter, and Meal planner.
- Goals cover compatible EntryTracker calculations. Debt has a descending ledger concept but is not yet a Global Goals-compatible calculation.

## Demo quality

- Source inspection can verify structure and tests, but visual quality still needs a rendered desktop check at target widths.
- Demo reliability depends on environment variables, migrations, deployment, and successful demo-data import. Verify all four immediately before recording.
