# Taruvi preflight (mandatory)

For any task involving Taruvi, Refine + Taruvi, `@taruvi/sdk`, or `@taruvi/refine-providers`:

1. Load the **`taruvi-app-developer`** skill first — it routes you to the right module skills.
2. Load **`taruvi-refine-providers`** for any frontend/provider work.
3. Follow the skill's routing step to load relevant reference docs before writing code.

Do not implement from memory. Do not treat prior knowledge as sufficient.

## Division of labour

| Work | Skill |
|---|---|
| Schema, policies, roles, functions, secrets, analytics via MCP | `taruvi-app-developer` |
| Refine UI with data / storage / app / user / auth / access-control providers | `taruvi-refine-providers` |

## User data access rule (mandatory)

Taruvi already provides built-in user management (users, roles, auth).

- **Never** create custom user/auth datatables (`users`, `auth_users`, `user_roles`, `passwords`, `sessions`) to replace platform identity.
- **Never** access `auth_user` through datatable routes from frontend code (e.g. `datatables/auth_user/data`).
- **Never** use `resource: "auth_user"` in Refine hooks/components.
- Always access users via the `user` provider (`dataProviderName: "user"`, `resource: "users"`).
- Manage users/roles through the dedicated user/app APIs and MCP tools (`list_users`, `create_user`, `update_user`, `manage_roles`, `manage_role_assignments`) — not manual SQL CRUD on identity data.
- If user identity data is not available to the current role, degrade gracefully in the UI (no crashing, no retry spam).

## Two configs, both required

Taruvi setup has two separate outputs. Having one working does not mean the other exists.

| File | Connects | Read by |
|---|---|---|
| `.kiro/settings/mcp.json` | the agent → platform | Kiro MCP client |
| `.env` | the running app → platform | `vite.config.ts` → `__TARUVI_*__` globals |

Before building or debugging app features, confirm `.env` exists with `TARUVI_SITE_URL`,
`TARUVI_APP_SLUG`, and `TARUVI_API_KEY` populated. If it's missing, `src/taruviClient.ts` throws
"Missing required environment variable" at startup and every page fails — this is a config
problem, not a code bug, so don't try to fix it in source.

Two traps:

- `TARUVI_SITE_URL` is the **full URL** (`https://<tenant>.taruvi.cloud`); MCP config uses the
  **bare subdomain**. Same tenant, different formats.
- Vite bakes these in at build time, so **restart the dev server** after editing `.env`. Hot
  reload will not pick it up.

To set either up, run the `kiro-setup` skill ("setup taruvi") rather than hand-editing. Both files
hold real credentials: keep them gitignored, never commit them, and never paste key values into
chat or source.

## MCP over raw SQL

Prefer Taruvi MCP tools for provisioning. Reach for `execute_raw_sql` only when a task genuinely
cannot be expressed through the schema/data tools, and never to bypass Cerbos policies.

## New entities

Every new entity needs a Cerbos policy **before its first write**.
