# Taruvi Plugin — Claude Code

Plugin root for Claude Code. See the [repo README](../README.md) for multi-host overview.

```bash
claude --plugin-dir /path/to/taruvi-plugin/claude
```

Or install from the marketplace with `/plugin install`, then `/reload-plugins` if prompted.

## Configure MCP (interactive)

1. Ask "setup taruvi" to load the **claude-setup** skill.
2. It asks once: generate an API key on the app's **Connect** page, then paste the whole
   `TARUVI_SITE_URL` / `TARUVI_APP_SLUG` / `TARUVI_API_KEY` block back (plus optional Context7).
3. Values go into plugin **`userConfig`** — Claude prompts for `taruvi_tenant`, `taruvi_api_key`,
   `taruvi_app_slug`, and `context7_api_key` when the plugin is enabled. `TARUVI_TENANT` is the
   subdomain of `TARUVI_SITE_URL`. Leave `.mcp.json` placeholders as `${user_config.*}`.
4. Re-run configuration from Claude's plugin settings if values need updating.
5. Verify with "List the datatables in this app."

**Do not commit secrets.** Sensitive `userConfig` values go to Claude's secure storage, not the
repo — `.mcp.json` is gitignored and should stay that way.

## What's Claude-specific

| Piece | Notes |
|---|---|
| `.claude-plugin/plugin.json` | Manifest. Declares `userConfig` — Claude's built-in secret prompt, so keys never land in a config file. |
| `.mcp.json` | Referenced by the manifest via `mcpServers`. Uses `${user_config.*}` interpolation. |
| `skills/` | `claude-setup` + shared product skills (`taruvi-app-developer`, `taruvi-refine-providers`). |

Claude Code also reads a root `CLAUDE.md`, which defers to `AGENTS.md` as the single source of
agent guidance.

**Note:** If Context7 fails because `${user_config.*}` is rejected in stdio `args`, configure
Context7 outside the plugin or omit it. Taruvi HTTP headers still work.
