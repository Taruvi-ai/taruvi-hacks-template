---
name: codex-setup
description: >
  Configure the Taruvi Codex plugin MCP connection: tenant subdomain,
  Knox API key, app slug, optional Context7 key. Triggers: "setup taruvi",
  "configure MCP", "taruvi plugin setup", "connect to Taruvi". Codex only.
---

# Codex setup (Taruvi MCP)

Walk the user through configuring this plugin’s MCP servers.

Codex does not yet use the same `variables` / `userConfig` wiring as Cursor or
Claude in this package. For now:

1. Ask for **all three Taruvi values in one message** — they're in a single copyable block on the
   app's **Connect** page:

   `https://<console-host>/organizations/<org-slug>/sites/<site-slug>/apps/<app-slug>/settings?section=connect`

   Tell the user to click **Generate API Key** first (without it the key renders as
   `<your-api-key>`), then copy the **Environment** tab block and paste all three lines back:

   ```bash
   TARUVI_SITE_URL=https://<tenant>.taruvi.cloud
   TARUVI_APP_SLUG=<app-slug>
   TARUVI_API_KEY=<generated-key>
   ```

   Optionally a Context7 key, or `skip`. Don't guess org/site/app slugs to build a clickable link —
   give the pattern, or Console → org → site → app → **Settings → Connect**.
2. Tell the user to replace placeholders in `.mcp.json` **locally** (do not commit secrets). The
   tenant is the subdomain of `TARUVI_SITE_URL`:
   - `<YOUR_TARUVI_TENANT_NAME>`
   - `<YOUR_TARUVI_API_KEY>`
   - `<YOUR_TARUVI_APP_SLUG>`
   - `<YOUR_CONTEXT7_API_KEY>`
3. Ensure `.mcp.json` is gitignored for local overrides, or keep secrets only in a
   machine-local copy of the plugin.
4. Reload / reinstall the Codex plugin per Codex docs.
5. Verify with: “List the datatables in this app.”

Plugin root for Codex is the `codex/` directory.
