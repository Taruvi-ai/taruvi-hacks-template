#!/bin/bash
# PostToolUse.sh — quality + audit hook that fires AFTER every tool call.
#
# The agent runtime invokes this script once a tool call has completed,
# passing the same variables as PreToolUse.sh:
#   $TOOL_NAME  — name of the tool that just ran
#   $TOOL_INPUT — the tool's arguments as a JSON string
#
# Exit code is informational only — this hook never blocks anything.
#
# It does two jobs:
#   1. Type-check + auto-format any TypeScript file the agent just wrote.
#   2. Append every state-changing MCP operation to a local audit log.

# Job 1: TypeScript feedback loop.
# When the agent writes or edits a file, extract the target path from the
# JSON tool input. If it's a .ts/.tsx file, run the compiler in check-only
# mode so type errors surface immediately (instead of at build time), then
# normalize formatting with Prettier.
if [[ "$TOOL_NAME" == "write_file" || "$TOOL_NAME" == "str_replace_based_edit" ]]; then
  FILE=$(echo "$TOOL_INPUT" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('path', ''))
except:
    pass
" 2>/dev/null)

  if [[ "$FILE" == *.tsx || "$FILE" == *.ts ]]; then
    echo "Checking $FILE..."
    if npx tsc --noEmit 2>&1; then
      echo "✓ TypeScript OK"
    else
      echo "✗ TypeScript errors — fix before continuing"
    fi
    npx prettier --write "$FILE" 2>/dev/null && echo "✓ Formatted"
  fi
fi

# Job 2: audit trail.
# Every MCP tool that mutates platform state (schema, records, functions,
# secrets, buckets) gets a timestamped NDJSON line in .agent/mcp-audit.log,
# so there is a local record of what the agent changed and when.
case "$TOOL_NAME" in
  create_datatable|alter_datatable|create_record|update_record|delete_record|deploy_function|set_secret|create_bucket)
    mkdir -p .agent
    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"tool\":\"$TOOL_NAME\"}" >> .agent/mcp-audit.log
    ;;
esac

exit 0
