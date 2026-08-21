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

## Confirm which Taruvi you are connected to (before the first tool call)

Kiro merges MCP config `user < workspace`. A freshly cloned template usually has no usable
workspace config, so Taruvi tools silently resolve to whatever server the **user-level** config
declares — a different tenant and app, while everything looks connected. Servers under another
name (`taruvi-staging`, `taruvi-trackit-test`, …) are never shadowed at all; their tools sit
alongside the workspace ones in the same session.

Before the first Taruvi MCP tool call in a session, run:

```bash
python3 scripts/mcp_scope.py        # add -v for the full server inventory
```

| Exit | Meaning | What to do |
|---|---|---|
| 0 | one usable workspace server | Proceed. Ignore any inherited servers it lists. |
| 1 | nothing usable | Run the `kiro-setup` skill ("setup taruvi"). |
| 2 | ambiguous | **Stop and ask the user.** Do not pick for them. |
| 3 | config changed since it was last confirmed | **Ask the user to reconnect**, then verify and `--record`. |

Exit 0 may add an `Unverified:` line. That is advisory, not a block — proceed, then sanity-check that
the first tool result belongs to this app and run `--record` once. Never treat "unverified" as a
reason to stop or to ask the user to restart.

The script prints terse facts, not a script to read aloud — it lists candidates as
`name (scope) -> host / app`. Turn that into the question yourself; don't echo its output back to
the user, and don't repeat the candidate list twice.

On exit 2, present what you found instead of guessing — name the tenant and app for each option
so the user can tell them apart:

> I went through the MCP configs and this workspace has no Taruvi connection of its own. Your
> user-level config (`~/.kiro/settings/mcp.json`) has:
>
> 1. `taruvi` → `other.taruvi.cloud`, app `someone-else`
>
> Do you want me to use that one, or create a workspace config at `.kiro/settings/mcp.json` for
> this app? Reusing it means every schema change and write lands on that tenant, which may be a
> different project.

Then wait. Never infer the intended tenant from the repo name, and never fall back to an inherited
server just because its credentials happen to work — working credentials for the wrong app are the
failure mode, not the success case.

If the user picks an existing server, copy that entry into `.kiro/settings/mcp.json` so the choice
is recorded and the check stops firing in future sessions. Either way the recorded config is what
clears the block — re-running the script without changing config will just deny again.

If they want a new connection, **load the `kiro-setup` skill and follow its Step 1 verbatim.** Never
write your own credential questions. Asking for "tenant subdomain, API key, app slug" as three open
questions looks helpful but is wrong: all three sit in one copyable block on the app's **Connect**
page (Console → org → site → app → **Settings → Connect**), and the user must click **Generate API
Key** first or the key comes through as the literal `<your-api-key>` and nothing authenticates. The
skill's message says all of that; an improvised ask doesn't.

## Writing MCP config is not connecting to it

Kiro binds MCP servers at session start, so **a config written mid-session does nothing until the
servers are reconnected.** Until then tools keep answering from whatever was bound earlier — on a
fresh clone, an inherited user-level server. The failure is silent: correct config on disk, real
data returned, wrong app. If tool results mention tables you don't recognise, suspect this before
suspecting the data.

**A shell script cannot see the agent's MCP binding**, so `mcp_scope.py` only flags the case it can
actually detect: the config changed *after* a previous confirmation (exit 3). It does not know
whether you restarted, and it must not pretend to.

So read the situation, don't just read the exit code:

- **Session started after the config was written** (the server appears in the startup banner) → it
  is bound correctly. Proceed. Do not ask for a restart.
- **You just wrote the config in this session** → ask the user to reconnect the `taruvi` server from
  the MCP Server view, or restart the session, before trusting tool results.
- **Tool results belong to a different app** → that is the stale binding, whatever the exit code
  says. Stop and ask for a reconnect.

You cannot reconnect for them. `kiro-cli mcp` manages config only — no reconnect subcommand — and
`kiro-cli restart` restarts the desktop app and would kill the session, so never call it
mid-conversation. Ask and wait.

Run `--record` once you have seen tool output that belongs to this app, so a later config change can
be detected as a change. Never run it to silence a warning you have not actually verified — and
never ask for a restart the evidence doesn't call for. Both erode the signal.

## Two configs, both required

Taruvi setup has two separate outputs. Having one working does not mean the other exists.

| File | Connects | Read by |
|---|---|---|
| `.kiro/settings/mcp.json` | the agent → platform | Kiro MCP client |
| `.env` | the running app → platform | `vite.config.ts` → `__TARUVI_*__` globals |

`python3 scripts/check-taruvi-setup.py` verifies both at once, including whether they agree on
tenant and app slug.

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
