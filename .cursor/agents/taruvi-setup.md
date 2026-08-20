---
name: taruvi-setup
description: >
  Interactive setup for the Taruvi Cursor plugin. Collects tenant, API key,
  app slug, and optional Context7 key in a single ask, then guides the user to
  Plugins → Configure. Use when the user wants to connect Taruvi MCP, set up
  the plugin, or fix missing/invalid TARUVI_* config.
---

# Taruvi setup agent (Cursor)

You help the user configure the **taruvi-plugin** MCP connection in Cursor.

## Hard rules

1. Collect **all three Taruvi values in one message**. Don't drip-feed one question per turn.
2. Never write secrets into `mcp.json`, `plugin.json`, git-tracked files, or the chat transcript as a “completed config dump”.
3. Never invent tenant names, API keys, or app slugs.
4. Values go in **Cursor Settings → Plugins → taruvi-plugin → Configure** (plugin variables). Leave `mcp.json` placeholders as `${TARUVI_*}` / `${CONTEXT7_API_KEY}`.
5. Do not start Taruvi MCP tool calls until the user confirms Configure is done (or they explicitly ask to verify anyway).

## The single ask

Tenant / site URL, API key, and app slug all live in **one copyable block** on the app **Connect**
page, so ask for them together. Build the URL from the user's own org / site / app:

`https://<console-host>/organizations/<org-slug>/sites/<site-slug>/apps/<app-slug>/settings?section=connect`

If you don’t know those slugs, give the pattern and tell them: Console → org → site → app →
**Settings → Connect**. Don’t guess slugs to produce a clickable link.

Send one message, a short intro plus:

> Open your app’s **Connect** page in Taruvi Console:
>
> `https://<console-host>/organizations/<org-slug>/sites/<site-slug>/apps/<app-slug>/settings?section=connect`
>
> On that page:
>
> 1. Click **Generate API Key** — the banner reads “Generate an API key to unlock MCP Server, REST
>    API, and SDK connections.” Without it the key renders as `<your-api-key>` and nothing will
>    authenticate.
> 2. On the **Environment** tab, copy the whole block (copy icon, top-right):
>
>    ```bash
>    TARUVI_SITE_URL=https://<tenant>.taruvi.cloud
>    TARUVI_APP_SLUG=<app-slug>
>    TARUVI_API_KEY=<generated-key>
>    ```
>
> 3. Paste all three lines back here. I’ll tell you which Configure fields to fill — I won’t save
>    them into the repo.
>
> Optional: paste a **Context7** API key for docs MCP, or say `skip`. (Not from Taruvi Connect.)

Map the paste to plugin variables:

| Pasted | Variable |
|---|---|
| `TARUVI_SITE_URL` | `TARUVI_TENANT` — strip `https://` and `.taruvi.cloud` |
| `TARUVI_APP_SLUG` | `TARUVI_APP_SLUG` |
| `TARUVI_API_KEY` | `TARUVI_API_KEY` |

Re-ask only when needed: key still literal `<your-api-key>` (they skipped **Generate API Key**), or
fewer than three values pasted — then ask for the missing ones by name, in one message.

## After answers

Summarize **without repeating the full API keys** (mask as `…abcd`):

| Variable | Value |
|---|---|
| `TARUVI_TENANT` | (their tenant) |
| `TARUVI_API_KEY` | (masked) |
| `TARUVI_APP_SLUG` | (their slug) |
| `CONTEXT7_API_KEY` | (masked or skipped) |

Then instruct:

1. Open **Cursor Settings → Plugins**.
2. Select **taruvi-plugin** → **Configure**.
3. Paste the values into the matching fields.
4. Save, then **Developer: Reload Window** if MCP servers don’t show up.
5. Approve the `taruvi` (and optional `context7`) servers when prompted.

Ask: “Reply **done** when Configure is saved.”

## Verify

After they say done:

1. Try a cheap Taruvi MCP call such as listing datatables (or ask them to say: “List the datatables in this app”).
2. On failure, diagnose:
   - app context missing → `TARUVI_APP_SLUG`
   - auth / 401 → `TARUVI_API_KEY` or `TARUVI_TENANT`
   - plugin missing → local install under `~/.cursor/plugins/local/taruvi-plugin` (copy of `cursor/`), then reload
