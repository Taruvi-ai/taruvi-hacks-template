# Taruvi Plugin — Cursor

Plugin root for Cursor. See the [repo README](../README.md) for multi-host overview.

```bash
cp -a /path/to/taruvi-plugin/cursor ~/.cursor/plugins/local/taruvi-plugin
```

Then **Developer: Reload Window**.

## Configure MCP (interactive)

1. Run the **taruvi-setup** agent, or the `/setup-taruvi` command, or ask “setup taruvi” (loads **cursor-setup** skill).
2. Answer tenant → API key → app slug → optional Context7 **one at a time**.
3. Paste values into **Plugins → taruvi-plugin → Configure** (do not commit secrets into `mcp.json`).
4. Reload if needed; approve MCP servers; verify with “List the datatables in this app.”
