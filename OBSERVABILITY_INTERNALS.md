# Observability Internals — How the Codex → Langfuse Pipeline Works

Setup instructions live in [`OBSERVABILITY_SETUP.md`](OBSERVABILITY_SETUP.md). This document explains the runtime flow.

This repo contains two related hook systems:

- `.agent/hooks/*.sh`: local guardrails for Taruvi/Codex workflows.
- `.codex/hooks/*.py`: Langfuse observability hooks wired through `.codex/config.toml`.

The active Langfuse wiring is:

```text
PreToolUse    -> .codex/hooks/langfuse_session_tracer.py
PostToolUse   -> .codex/hooks/langfuse_session_tracer.py
Stop          -> .codex/hooks/langfuse_session_tracer.py
SessionStart  -> .codex/hooks/langfuse_prompt_sync.py
```

## Session Start And Prompt Sync

At session start, `.codex/hooks/langfuse_prompt_sync.py` runs.

It reads Codex user prompt logs from:

```text
~/.codex/logs_2.sqlite
```

It queries rows where:

```text
target = codex_otel.log_only
event.name = codex.user_prompt
```

For each prompt row, it extracts:

- prompt text
- `conversation.id`
- `session.id`
- `turn.id`
- `event.timestamp`
- `user.email`
- `model`
- `app.version`
- `originator`
- `terminal.type`

The prompt is redacted and sent to Langfuse with both the full redacted text and a compact preview:

- `trace-create`
  - trace name: `codex_session`
  - deterministic trace id from `conversation.id`
- `span-create`
  - span name: `user_prompt`
  - input: `{ prompt, prompt_preview }`

Synced prompt row IDs are stored in:

```text
.codex/log/synced_prompt_ids.json
```

This makes prompt sync idempotent.

## Trace Correlation

Prompt sync writes correlation state to:

```text
.codex/log/codex_trace_correlation.json
```

That file maps Codex conversation IDs to Langfuse trace IDs, latest prompt previews, timestamps, user email, model, project slug, and app slug.

The behavior hook uses this file to attach tool events to the same trace as the user prompt. Trace selection order is:

1. Match `session_id` to a known conversation id.
2. Match the payload conversation id, if present.
3. Use the latest recent conversation within a 10-minute lookback.
4. Fall back to a deterministic trace id from `session_id`.

This is important because normal tool hook payloads do not always include the original user prompt.

## Tool Hook Runtime

For every `PreToolUse`, `PostToolUse`, and `Stop`, Codex passes JSON on stdin to:

```text
.codex/hooks/langfuse_session_tracer.py
```

The hook:

1. Reads and parses the hook payload.
2. Loads Langfuse config from `.env` or process env.
3. Loads per-session local state.
4. Resolves trace correlation.
5. Sanitizes inputs and outputs.
6. Builds Langfuse trace/span/score events.
7. Sends the batch to Langfuse.
8. Saves updated local state.

Per-session state is stored under:

```text
.codex/log/langfuse_sessions/<hashed-session-id>.json
```

The state tracks:

- trace id
- whether the trace was created
- emitted spans
- tools used
- files changed
- selected skill
- selected subagent
- prompt/response availability
- prompt/response previews
- repeated hook/tool counts
- repeated command counts
- QA status
- final quality score
- blocked reason

The hook is non-blocking. Missing credentials, invalid payloads, network failures, and Langfuse errors are logged locally and do not stop Codex.

Debug logs are written to:

```text
.codex/log/langfuse_hook_debug.log
```

For `Stop`, the hook immediately emits:

```json
{"continue":true}
```

Codex Stop hooks require strict JSON output.

## Langfuse Payloads

The behavior hook sends events to:

```text
{LANGFUSE_BASE_URL}/api/public/ingestion
```

Auth uses:

```text
LANGFUSE_PUBLIC_KEY
LANGFUSE_SECRET_KEY
LANGFUSE_BASE_URL
```

Trace metadata includes:

- `conversation_id`
- `session_id`
- `turn_id`
- `user_email`
- `project_slug`
- `app_slug`
- `project_path`
- `trace_source`
- `trace_id_source`
- `model`
- `started_at`
- `current_stage`
- `risk_level`
- `cwd`
- `permission_mode`

`app_slug` is resolved from `.env.local`, then `.env`, then process env:

1. `TARUVI_APP_SLUG`
2. `VITE_TARUVI_APP_SLUG`
3. `X_APP_SLUG`
4. `APP_SLUG`
5. `VITE_APP_SLUG`
6. `.codex/config.toml` `X-App-Slug`
7. project folder name

## Spans

The behavior hook can emit these spans:

- `hook_execution`
- `user_prompt`
- `assistant_response`
- `mcp_tool_call`
- `bash_command`
- `read_agents_md`
- `spec_writer_run`
- `qa_check`
- `file_change`
- `skill_selection`
- `subagent_selection`
- `final_summary`

The final summary span includes:

- selected skill
- selected subagent
- MCP tools used
- files changed
- QA passed
- final quality
- repeated node count
- unnecessary rerun count
- risk level
- whether the prompt was linked
- latest prompt preview
- blocked reason

## Scores

At stop time, the hook emits these Langfuse scores:

- `agents_md_read`
- `spec_writer_ran`
- `skill_selected`
- `subagent_selected`
- `mcp_used`
- `qa_passed`
- `repeated_node_count`
- `unnecessary_rerun_count`
- `final_quality`

`final_quality` starts at 40, gains points for expected workflow signals, and loses points for repeated node/tool behavior.

## Sanitization

The hook sanitizes data before sending it to Langfuse.

It redacts keys matching:

- secret
- token
- API key
- password
- authorization
- cookie
- credential

It also redacts values that look like:

- Langfuse keys
- bearer tokens
- API keys
- AWS-style keys
- GitHub personal access tokens

Payloads are also bounded by:

- max text length
- max list size
- max dict size
- max object depth

Prompt sync has prompt-specific redaction for auth headers, cookies, bearer/basic tokens, Langfuse keys, API key assignments, and generic secret/token/password assignments.

## Skill And Subagent Detection

The hook does not spawn skills or subagents. It detects evidence that they were used.

Skill detection scans:

- structured `selected_skill`
- structured `skill`
- skill paths like `.codex/skills/<name>`
- phrases like `using skill <name>`
- known Taruvi skills:
  - `taruvi-app-developer`
  - `taruvi-refine-providers`

Subagent detection scans for:

- `selected_subagent`
- `subagent`
- `subagent_type`
- `agent_type`
- raw payload text containing `subagent`, `agent_type`, or `agent_id`

If detected, the hook emits `skill_selection` or `subagent_selection` spans and updates metrics.

## Local Shell Hooks

The `.agent/hooks` scripts are separate from Langfuse.

`.agent/hooks/PreToolUse.sh`:

- loads `.env.local`
- blocks destructive operations on production slugs
- asks for confirmation before schema operations

`.agent/hooks/PostToolUse.sh`:

- runs TypeScript/prettier checks after TS/TSX writes
- logs selected MCP operations to `.agent/mcp-audit.log`

`.agent/hooks/SessionStart.sh`:

- prints app slug and site URL
- warns on production slug
- checks Taruvi reachability
- warns if `logs/frontend.ndjson` has unread browser errors

## Important Caveats

The Langfuse Python scripts read `.env.local`, `.env`, and process env for app slug resolution. Langfuse credentials are still read from `.env` or process env.

The user prompt is primarily managed through Codex's local OTEL SQLite database, not through normal tool hook payloads.

The correlation file is what connects the prompt trace to later tool events.

The hook is designed to fail open. Observability failures are logged locally and do not block Codex execution.
