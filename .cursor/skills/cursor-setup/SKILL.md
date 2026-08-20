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

1. Collect **all three Taruvi values in one message**. Don't drip-feed one question per turn.
2. Do **not** write API keys into `mcp.json`, `plugin.json`, or any git-tracked file.
3. Values belong in **Cursor Settings → Plugins → taruvi-plugin → Configure**.
4. `mcp.json` already uses `${TARUVI_TENANT}`, `${TARUVI_API_KEY}`, `${TARUVI_APP_SLUG}`, `${CONTEXT7_API_KEY}` — leave it alone.

## Ask once

All three values sit in one copyable block on the app's **Connect** page. Build the URL from the
user's own org / site / app:

`https://<console-host>/organizations/<org-slug>/sites/<site-slug>/apps/<app-slug>/settings?section=connect`

If you don't know those slugs, give the pattern and tell them: Console → org → site → app →
**Settings → Connect**. Don't guess slugs to produce a clickable link.

Message to send:

> Open your app's **Connect** page in Taruvi Console:
>
> `https://<console-host>/organizations/<org-slug>/sites/<site-slug>/apps/<app-slug>/settings?section=connect`
>
> On that page:
>
> 1. Click **Generate API Key** — without it the key renders as `<your-api-key>` and nothing will
>    authenticate.
> 2. On the **Environment** tab, copy the whole block:
>
>    ```bash
>    TARUVI_SITE_URL=https://<tenant>.taruvi.cloud
>    TARUVI_APP_SLUG=<app-slug>
>    TARUVI_API_KEY=<generated-key>
>    ```
>
> 3. Paste all three lines back here.
>
> Optional: paste a **Context7** API key for library docs, or say `skip`. (Not from Taruvi Connect.)

Map the paste: `TARUVI_SITE_URL` → `TARUVI_TENANT` (strip `https://` and `.taruvi.cloud`),
`TARUVI_APP_SLUG` → `TARUVI_APP_SLUG`, `TARUVI_API_KEY` → `TARUVI_API_KEY`.

If `TARUVI_API_KEY` still reads `<your-api-key>`, they skipped **Generate API Key** — ask them to
generate one and re-paste.

## After answers

Mask secrets in any summary. Guide the user to **Plugins → Configure**, then **Reload Window** if needed, then approve MCP servers.

When they confirm Configure is done, verify with: list datatables (or ask them to).

| Symptom | Likely field |
|---|---|
| Missing app context | `TARUVI_APP_SLUG` |
| Auth / 401 | `TARUVI_API_KEY` or `TARUVI_TENANT` |
| Plugin not loaded | Re-copy `cursor/` → `~/.cursor/plugins/local/taruvi-plugin` and reload |
