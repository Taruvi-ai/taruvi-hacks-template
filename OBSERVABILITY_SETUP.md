# Observability Setup

Reusable Codex framework assets layered on top of the Taruvi hackathon template (see [`README.MD`](README.MD)): Langfuse observability hooks, prompt sync, local guardrail hooks, and shared subagents.

For how the pipeline works internally (trace correlation, payloads, spans, scores, sanitization), see [`OBSERVABILITY_INTERNALS.md`](OBSERVABILITY_INTERNALS.md).

## Layout

| Path | Purpose |
|---|---|
| `.agent/hooks/` | Local shell guardrails (production-slug protection, TS checks, MCP audit log) |
| `.agent/subagents/` | **Canonical subagents** (`spec-writer`, `qa-agent`) — `.codex/subagents`, `.cursor/subagents`, `.kiro/subagents`, and `.claude/agents` are symlinks to this directory |
| `.codex/hooks/langfuse_session_tracer.py` | Behavior hook: PreToolUse / PostToolUse / Stop → Langfuse |
| `.codex/hooks/langfuse_prompt_sync.py` | SessionStart hook: syncs Codex user prompts to Langfuse |
| `.codex/config.toml` | Codex config template — hook wiring, MCP servers, `X-App-Slug` |
| `.agents/skills/` | Skill packs, exposed to tools through `.codex/skills/` |
| `.codex/log/` | Local hook state (gitignored): `codex_trace_correlation.json`, `synced_prompt_ids.json` |
| `tests/test_langfuse_hooks.py` | Hook test suite |
| `.mcp.example.json`, `.vscode/mcp.json`, `.env.example` | Config templates |

## Setup

1. **Clone and configure env**
   ```bash
   git clone https://github.com/kjeox/taruvi-hacks-template.git
   cd taruvi-hacks-template
   cp .env.example .env
   ```
   Fill in the Langfuse keys (`LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL`) and Taruvi values in `.env`.

2. **Configure Codex**
   Edit `.codex/config.toml` with your endpoints and keys, and set `X-App-Slug`.

3. **Enable hooks** in `.codex/config.toml`:
   - `PreToolUse` → `langfuse_session_tracer.py`
   - `PostToolUse` → `langfuse_session_tracer.py`
   - `Stop` → `langfuse_session_tracer.py`
   - `SessionStart` → `langfuse_prompt_sync.py` (prompt sync)

4. **Verify**: run one Codex tool action, then check Langfuse for events filtered by `app_slug`.

## Behavior spans

`hook_execution`, `user_prompt`, `assistant_response`, `mcp_tool_call`, `bash_command`, `read_agents_md`, `spec_writer_run`, `qa_check`, `file_change`, `skill_selection`, `subagent_selection`, `final_summary`

## Dashboard filter fields

Every trace/span carries: `app_slug`, `user_email`, `project_slug`, `conversation_id`, `session_id`, `trace_source`, `current_stage`, `risk_level`

## app_slug resolution order

1. `TARUVI_APP_SLUG` → 2. `VITE_TARUVI_APP_SLUG` → 3. `X_APP_SLUG` → 4. `APP_SLUG` → 5. `VITE_APP_SLUG` (each checked in `.env.local`, then `.env`, then process env) → 6. `.codex/config.toml` `X-App-Slug` → 7. project folder name

## Prompt sync

Reads Codex user prompts from `~/.codex/logs_2.sqlite`, emits `user_prompt` spans under trace `codex_session`, and stores synced row IDs in `.codex/log/synced_prompt_ids.json` (idempotent — do not delete this file unless you want a full re-sync).

## Subagents

`spec-writer` runs read-only analysis before any build and returns a structured spec; `qa-agent` reviews a finished build against the template's schema/function/Refine-v5/UI rules. Edit them only in `.agent/subagents/` — every other location is a symlink.
