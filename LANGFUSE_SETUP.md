# LANGFUSE_SETUP

## Required files
- `.codex/hooks/langfuse_codex_hook.py`
- `.codex/hooks/sync_codex_prompts_to_langfuse.py`
- `tests/test_langfuse_codex_hook.py`

## Hook wiring
`.codex/config.toml` includes templates for:
- `PreToolUse` -> `langfuse_codex_hook.py`
- `PostToolUse` -> `langfuse_codex_hook.py`
- `Stop` -> `langfuse_codex_hook.py`
- `SessionStart` -> `sync_codex_prompts_to_langfuse.py`

## app_slug extraction order
1. `.env` `X_APP_SLUG`
2. `.env` `APP_SLUG`
3. `.env` `VITE_APP_SLUG`
4. `.codex/config.toml` `X-App-Slug`
5. fallback `project_slug`

## Prompt sync
Prompt sync reads Codex user prompts from:
- `~/.codex/logs_2.sqlite`

It emits `user_prompt` span events and keeps trace name `codex_session`.
