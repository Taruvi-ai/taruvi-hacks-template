# Taruvi Plugin — Cursor

Plugin root for Cursor. See the [repo README](../README.md) for multi-host overview.

```bash
cp -a /path/to/taruvi-plugin/cursor ~/.cursor/plugins/local/taruvi-plugin
```

Then **Developer: Reload Window**.

## Configure MCP (interactive)

1. Run the **taruvi-setup** agent, or the `/setup-taruvi` command, or ask “setup taruvi” (loads **cursor-setup** skill).
2. It asks once: generate an API key on the app’s **Connect** page, then paste the whole
   `TARUVI_SITE_URL` / `TARUVI_APP_SLUG` / `TARUVI_API_KEY` block back (plus optional Context7).
3. Paste values into **Plugins → taruvi-plugin → Configure** (do not commit secrets into `mcp.json`).
4. Reload if needed; approve MCP servers; verify with “List the datatables in this app.”
