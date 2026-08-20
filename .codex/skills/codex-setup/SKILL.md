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

1. Ask **one question at a time** for tenant, API key, app slug, optional Context7 key.
2. Tell the user to replace placeholders in `.mcp.json` **locally** (do not commit secrets):
   - `<YOUR_TARUVI_TENANT_NAME>`
   - `<YOUR_TARUVI_API_KEY>`
   - `<YOUR_TARUVI_APP_SLUG>`
   - `<YOUR_CONTEXT7_API_KEY>`
3. Ensure `.mcp.json` is gitignored for local overrides, or keep secrets only in a
   machine-local copy of the plugin.
4. Reload / reinstall the Codex plugin per Codex docs.
5. Verify with: “List the datatables in this app.”

Plugin root for Codex is the `codex/` directory.
