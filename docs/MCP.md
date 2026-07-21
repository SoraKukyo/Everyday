# Everyday MCP server

## Purpose and status

`everyday-mcp` is a remote, Streamable HTTP MCP Edge Function for reading one Everyday user’s tracking data. It has no create, update, archive, delete, or other write tools.

Endpoint pattern:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/everyday-mcp
```

The server source and protocol tests are in this repository. During this project work, a ChatGPT No auth connector was manually connected and listed the six tools. That is not a blanket compatibility promise: re-test after deployments, and Claude has not been manually verified in this project.

## Authentication

Everyday generates a personal access token in **Connect to AI**. The plaintext token is shown once; the database stores only its SHA-256 hash, a short prefix, optional label, creation time, and revocation time.

The function accepts the token in either form:

1. `Authorization: Bearer YOUR_PERSONAL_ACCESS_TOKEN` for direct API tests and clients that can send headers.
2. `?token=YOUR_PERSONAL_ACCESS_TOKEN` on the endpoint when no Authorization header is supplied.

The header takes precedence; an invalid header cannot be overridden by a valid query token. After authenticating the token hash, the Edge Function resolves its owner and filters every data read by that owner’s `user_id`. It never accepts a caller-provided user ID.

### Connector limitation and URL risk

ChatGPT and Claude custom-connector UIs currently offer full OAuth or No auth, not a raw Bearer-token entry field. OAuth is not implemented. The No auth URL is therefore a practical compatibility fallback, not the preferred security model.

The generated `?token=...` URL is a secret. It can be retained in connector settings, browser history, proxy/CDN logs, or diagnostics. Do not share it. Revoke the underlying token in Everyday immediately if it may have been exposed.

`supabase/config.toml` sets `verify_jwt = false` for this one function. Supabase would otherwise reject a No auth connector before the function can validate Everyday’s own hashed token.

## Required setup

1. Create and configure your own Supabase project for the app.
2. In the Supabase SQL Editor, run:
   - `supabase/schema.sql`
   - `supabase/core-migration.sql`
   - `supabase/goals-rich-migration.sql`
   - `supabase/mcp-access-tokens-migration.sql`
   - `supabase/migrations/20260721180000_mcp_service_role_token_lookup.sql`
   - `supabase/migrations/20260721183000_mcp_read_only_data_grants.sql`
3. Deploy the function:

   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase functions deploy everyday-mcp
   ```

4. Generate a token in **Connect to AI**.
5. Verify the deployment before relying on an AI connector:

   ```bash
   MCP_URL='https://YOUR_PROJECT_REF.supabase.co/functions/v1/everyday-mcp' \
   MCP_TOKEN='YOUR_FRESH_TOKEN' \
   MCP_AUTH_MODE=query \
   npm run verify:mcp
   ```

   The verifier checks initialization, `tools/list`, all shared-table reads, and the goals read path without writing data. See the README for PowerShell and token-safe interactive examples.

The MCP-specific migrations grant `service_role` **SELECT** on the tables the function reads. A separate demo-seed migration also grants `INSERT`/`UPDATE` to this server-only role for local deterministic seed upserts; the MCP Edge Function itself contains no write paths or tools. The personal token flow in the browser uses the `authenticated` role with its own RLS policies. Never put the service-role key in `.env` variables beginning with `VITE_`.

## Tools

| Tool | Input | Result |
|---|---|---|
| `list_active_modules` | Optional `include_empty` | Configured engine modules with labels, unit/aggregation, and data presence |
| `get_weekly_summary` | Optional Monday `week_start`, IANA `timezone` | Cross-module weekly summary; Budget is income minus expense |
| `get_module_history` | `module_id`, optional date range/archive flag/limit/cursor | Friendly, date-ordered paginated records |
| `get_current_streaks` | Optional streak `module_ids`, `timezone` | Current/best streaks, last check-in, and recent dates |
| `get_upcoming_due_items` | Optional date window/module IDs/include completed | Upcoming and overdue due items with days remaining |
| `get_goal_progress` | Optional `include_completed` | Current value, start value, target, direction, progress, and calculation label |

Successful tool responses include `as_of` and a timezone context. The server returns friendly labels and units rather than making raw database columns its public contract.

## Raw JSON-RPC verification

Use placeholders only; never paste a real token into source code or a public issue.

### Bearer-header request

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/everyday-mcp" \
  -H "Authorization: Bearer YOUR_PERSONAL_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### No auth connector-style request

```bash
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/everyday-mcp?token=YOUR_PERSONAL_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_weekly_summary","arguments":{}}}'
```

Expected behavior:

- Missing, invalid, or revoked token: HTTP 401.
- `initialize`: read-only server instructions and capabilities.
- `tools/list`: exactly six read-only tools.
- `tools/call`: only data owned by the authenticated token holder.

## Troubleshooting

| Symptom | Likely action |
|---|---|
| `MCP token lookup failed` or `permission denied` | Run the token migration and both MCP read-grant migrations. |
| `Read failed for goals` or another data table | Run `20260721183000_mcp_read_only_data_grants.sql`. |
| 401 token error | Check the token was copied exactly and not revoked; generate a new one if needed. |
| 404 endpoint | Link the correct project and deploy `everyday-mcp`. |
| No auth connector is rejected before reaching the function | Confirm the deployed function configuration has `verify_jwt = false`. |
| Connector cannot use the URL form | Use a direct Bearer-capable client for testing or implement OAuth separately; do not weaken the read-only owner-scoping model. |

## Security boundary

This is a read-only personal-data integration, not a general public API. Keep tokens secret, revoke them when no longer needed, and use server credentials only inside the Edge Function environment. Full OAuth, token rotation, and detailed connector compatibility testing remain future work.
