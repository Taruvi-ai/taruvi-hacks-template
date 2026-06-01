# OBSERVABILITY

## Components
- Behavior hook: `.codex/hooks/langfuse_codex_hook.py`
- Prompt sync hook: `.codex/hooks/sync_codex_prompts_to_langfuse.py`
- Correlation file: `.codex/log/codex_trace_correlation.json` (local, ignored)

## Behavior Spans
- `hook_execution`
- `bash_command`
- `skill_selection`
- `subagent_selection`
- `mcp_tool_call`
- `file_change`
- `assistant_response`
- `final_summary`

## Dashboard Filter Fields
Each trace/span metadata includes:
- `app_slug`
- `user_email`
- `project_slug`
- `conversation_id`
- `session_id`
- `trace_source`
- `current_stage`
- `risk_level`
