# TEMPLATE_AUDIT

## Scope
Repository was converted to a reusable Codex app-development template with Langfuse observability hooks and prompt-sync integration.

## Files Included (staged additions/modifications)
- `AGENTS.md`
- `.agents/` (skill packs and references)
- `.agent/hooks/` and `.agent/subagents/`
- `.codex/config.toml` (sanitized template)
- `.codex/hooks/langfuse_codex_hook.py`
- `.codex/hooks/sync_codex_prompts_to_langfuse.py`
- `.codex/subagents/`
- `skills/`
- `subagents/`
- `.mcp.example.json`
- `.vscode/mcp.json`
- `.env.example`
- `.gitignore`
- `README.md`
- `INSTALL.md`
- `QUICKSTART.md`
- `OBSERVABILITY.md`
- `LANGFUSE_SETUP.md`
- `TEMPLATE_STRUCTURE.md`
- `tests/test_langfuse_codex_hook.py`

## Files Excluded (staged removals)
- App source code: `src/**`
- Frontend runtime/build config files
- CI and deployment scaffolding not required for the reusable template
- Local/editor/runtime files with sensitive values
- Generated artifacts and logs

## Secret Scan Result
Scan command run on staged content:
```bash
for pat in 'sk-lf-' 'pk-lf-' 'Api-Key' 'Authorization' 'ctx7sk' 'auth.json' 'LANGFUSE_SECRET_KEY' 'OPENAI_API_KEY' 'password' 'token'; do
  git grep -n --cached -F "$pat" -- .
done
```

Results summary:
- `sk-lf-`, `pk-lf-`: found only in redaction regex logic inside `.codex/hooks/sync_codex_prompts_to_langfuse.py`
- `ctx7sk`: no matches
- `Api-Key`, `Authorization`: matches are placeholders/templates and documentation text
- `LANGFUSE_SECRET_KEY`, `OPENAI_API_KEY`: variable names/placeholders only
- `auth.json`: found in `.gitignore` exclusion rules
- `password`, `token`: documentation/code vocabulary matches (no exposed credential values)

No concrete Langfuse/Taruvi/Context7/OpenAI secrets were found in staged files.

## App Source Confirmation
Confirmed: staged changes remove application source (`src/**`) and related frontend app artifacts from the repository.

## Langfuse Hook Confirmation
Confirmed included:
- `.codex/hooks/langfuse_codex_hook.py`
- `.codex/hooks/sync_codex_prompts_to_langfuse.py`
- `tests/test_langfuse_codex_hook.py`

## Setup Instructions (for another developer)
1. Clone repository.
2. Copy `.env.example` to `.env` and fill placeholders.
3. Configure `.codex/config.toml` placeholders (Langfuse + Taruvi + MCP).
4. Ensure PreToolUse/PostToolUse/Stop hooks point to `.codex/hooks/langfuse_codex_hook.py`.
5. Optionally enable SessionStart prompt sync with `.codex/hooks/sync_codex_prompts_to_langfuse.py`.
6. Run `python3 -m unittest discover -s tests -p 'test_langfuse_codex_hook.py' -v`.
7. Verify Langfuse dashboard filters by `app_slug`.
