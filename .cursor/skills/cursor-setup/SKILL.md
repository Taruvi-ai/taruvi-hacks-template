---
name: cursor-setup
description: >
  Configure the Taruvi Cursor plugin MCP connection: tenant subdomain,
  Knox API key, app slug, optional Context7 key. Triggers: "setup taruvi",
  "configure MCP", "taruvi plugin setup", "connect to Taruvi", /setup-taruvi,
  missing TARUVI_* variables, MCP auth failures. Cursor only.
---

# Cursor setup (Taruvi MCP)

You are running the interactive Taruvi MCP setup for Cursor.

## Hard rules

1. Ask **exactly one question per message**. Wait for the answer before continuing.
2. Do **not** write API keys into `mcp.json`, `plugin.json`, or any git-tracked file.
3. Values belong in **Cursor Settings → Plugins → taruvi-plugin → Configure**.
4. `mcp.json` already uses `${TARUVI_TENANT}`, `${TARUVI_API_KEY}`, `${TARUVI_APP_SLUG}`, `${CONTEXT7_API_KEY}` — leave it alone.

## Where values come from

Tell the user first: tenant / API key / app slug are on the app **Connect** page:

`https://<console-host>/organizations/<org>/sites/<site>/apps/<app>/settings?section=connect`

Example: https://test-console.taruvi.cloud/organizations/eox-vantage/sites/test-prompts/apps/plugin-test/settings?section=connect

## Interview (one at a time)

1. **Tenant subdomain** — e.g. `acme` (not a full URL); from Connect.
2. **Taruvi API key** — Knox `Api-Key` token from Connect.
3. **App slug** — `X-App-Slug` from Connect.
4. **Context7 API key** — optional; allow `skip` (not from Taruvi Connect).

## After answers

Mask secrets in any summary. Guide the user to **Plugins → Configure**, then **Reload Window** if needed, then approve MCP servers.

When they confirm Configure is done, verify with: list datatables (or ask them to).

| Symptom | Likely field |
|---|---|
| Missing app context | `TARUVI_APP_SLUG` |
| Auth / 401 | `TARUVI_API_KEY` or `TARUVI_TENANT` |
| Plugin not loaded | Re-copy `cursor/` → `~/.cursor/plugins/local/taruvi-plugin` and reload |
