---
name: claude-setup
description: >
  Configure the Taruvi Claude Code plugin MCP connection: tenant subdomain,
  Knox API key, app slug, optional Context7 key. Triggers: "setup taruvi",
  "configure MCP", "taruvi plugin setup", "connect to Taruvi", missing
  userConfig, MCP auth failures. Claude Code only — skip on Cursor/Codex.
---

# Claude setup (Taruvi MCP)

Walk the user through configuring this plugin’s MCP servers. Do **not** write
API keys into `.mcp.json` or commit secrets. Values belong in Claude Code
`userConfig` (prompted when the plugin is enabled).

## What you need from the user

Ask for **all three Taruvi values in one message** — they live in a single copyable block on the
app's **Connect** page, so there is nothing to gain from asking one at a time.

Build the URL from the user's own org / site / app:

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

From the paste: `TARUVI_SITE_URL` gives the tenant (strip `https://` and `.taruvi.cloud`),
`TARUVI_APP_SLUG` is `X-App-Slug`, and `TARUVI_API_KEY` is the `Authorization: Api-Key …` token.

If `TARUVI_API_KEY` still reads `<your-api-key>`, they skipped **Generate API Key** — ask them to
generate one and re-paste. Mask the key in any summary.

## Where to put the values

### Preferred — plugin `userConfig`

When enabling/installing the plugin, Claude prompts for:

| Key | Maps to |
|---|---|
| `taruvi_tenant` | Tenant subdomain |
| `taruvi_api_key` | Knox API key (sensitive) |
| `taruvi_app_slug` | App slug |
| `context7_api_key` | Optional Context7 key (sensitive) |

`.mcp.json` already uses `${user_config.taruvi_tenant}`,
`${user_config.taruvi_api_key}`, `${user_config.taruvi_app_slug}`, and
`${user_config.context7_api_key}` — leave that file alone.

Re-run configuration via Claude’s plugin settings if values need updating.
Sensitive values go to secure storage / credentials, not the repo.

### Load the plugin

Session:

```bash
claude --plugin-dir /path/to/taruvi-plugin/claude
```

Or marketplace + `/plugin install` (see repo README). Then `/reload-plugins` if asked.

**Note:** If Context7 fails because `${user_config.*}` is rejected in stdio `args`,
configure Context7 outside the plugin or omit it; Taruvi HTTP headers should still work.

## Verify

After config, ask: “List the datatables in this app.”

- Missing app context → wrong/missing `taruvi_app_slug`
- Auth errors → bad/expired `taruvi_api_key` or wrong `taruvi_tenant`
