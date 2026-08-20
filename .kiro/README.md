# Taruvi Plugin — Kiro

Plugin root for Kiro. See the [repo README](../README.md) for the multi-host overview, and
[`INSTRUCTIONS.md`](INSTRUCTIONS.md) for step-by-step install, credential setup, and a test matrix.

```
kiro/
├── .kiro-plugin/plugin.json   # manifest
├── mcp.json                   # MCP servers (placeholders — do not commit secrets)
├── skills/                    # kiro-setup + shared product skills
├── steering/                  # always-on + fileMatch guidance
└── hooks/                     # event-driven automation
```

## Install

Copy this directory into your Kiro plugins folder:

```bash
cp -a /path/to/taruvi-plugin/kiro ~/.kiro/plugins/local/taruvi-plugin
```

Or wire the pieces into a workspace directly:

```bash
cp -a kiro/steering/.  /path/to/project/.kiro/steering/
cp -a kiro/hooks/.     /path/to/project/.kiro/hooks/
cp -a kiro/skills/.    /path/to/project/.kiro/skills/
cp    kiro/mcp.json    /path/to/project/.kiro/settings/mcp.json
```

## Configure MCP (interactive)

1. Ask "setup taruvi" to load the **kiro-setup** skill.
2. Answer tenant → API key → app slug → optional Context7 **one at a time**.
3. The skill writes values into `.kiro/settings/mcp.json` (workspace) or
   `~/.kiro/settings/mcp.json` (user). Kiro merges these with precedence
   `user < workspace`.
4. Reconnect from the **MCP Server** view in the Kiro feature panel — no restart needed.
5. Verify with "List the datatables in this app."

**Keep `.kiro/settings/mcp.json` gitignored.** Unlike Claude Code (`userConfig`) and Cursor
(`variables`), Kiro has no plugin-level secret prompt, so keys land in a local config file.

## What's Kiro-specific

| Piece | Notes |
|---|---|
| `steering/` | Kiro's guidance mechanism. `taruvi-preflight.md` and `functional-app.md` are always on; `refine-v5.md` and `ui-guidelines.md` load conditionally via `inclusion: fileMatch`. |
| `hooks/` | `refine-v5-review` catches v4 hook syntax on save. `taruvi-secret-guard` is a `preToolUse` check against committing API keys. |
| `mcp.json` | Kiro shape — `disabled` and `autoApprove` per server, `url` + `headers` for HTTP servers. |

Kiro also reads a root `AGENTS.md` automatically, so apps scaffolded from the
`agents-md-template.md` reference keep working without duplication. Steering adds conditional
loading that a single `AGENTS.md` cannot express.

## Subagents

Guidance that references an `Explore` subagent maps to Kiro's built-in **context-gatherer**
subagent — no extra config needed.
