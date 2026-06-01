#!/bin/bash
# Fires after every tool call.

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

case "$TOOL_NAME" in
  create_datatable|alter_datatable|create_record|update_record|delete_record|deploy_function|set_secret|create_bucket)
    mkdir -p .agent
    echo "{\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"tool\":\"$TOOL_NAME\"}" >> .agent/mcp-audit.log
    ;;
esac

exit 0
