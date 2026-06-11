#!/bin/bash
# PreToolUse.sh — safety gate that fires BEFORE every tool call.
#
# The agent runtime invokes this script each time the assistant is about to
# run a tool (MCP call, file write, shell command, ...). The runtime passes:
#   $TOOL_NAME  — name of the tool about to run (e.g. "delete_datatable")
#   $TOOL_INPUT — the tool's arguments as a JSON string
#
# Exit code contract:
#   exit 0 → allow the tool call to proceed
#   exit 2 → BLOCK the tool call (anything printed is shown to the agent/user)
#
# This hook enforces two guardrails:
#   1. Hard-block destructive operations when a production app slug is active.
#   2. Require interactive human confirmation for schema-changing operations.

# Load the Taruvi environment (TARUVI_APP_SLUG, TARUVI_SITE_URL, ...) so we
# know which app this session is pointed at. Comments in .env.local are skipped.
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs 2>/dev/null)
fi

# Guardrail 1: production protection.
# If the active slug looks like production (contains "prod"), refuse the
# irreversible operations outright — there is no confirmation option here,
# the operation must be done manually or against a dev slug.
if [[ "$TARUVI_APP_SLUG" == *"prod"* ]]; then
  case "$TOOL_NAME" in
    delete_datatable|drop_schema|delete_bucket)
      echo "BLOCKED: '$TOOL_NAME' is not permitted on production slug '$TARUVI_APP_SLUG'"
      echo "Switch to a dev slug or perform this operation manually."
      exit 2
      ;;
  esac
fi

# Guardrail 2: human-in-the-loop for schema changes.
# Creating or altering a datatable is allowed on any slug, but only after the
# operator sees the exact tool input and explicitly confirms. Anything other
# than y/Y cancels the call.
case "$TOOL_NAME" in
  create_datatable|alter_datatable)
    echo ""
    echo "Schema operation: $TOOL_NAME"
    echo "Input: $TOOL_INPUT"
    echo ""
    printf "Confirm this operation? (y/n): "
    read -r CONFIRM
    if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
      echo "Cancelled."
      exit 2
    fi
    ;;
esac

# Everything else passes through untouched.
exit 0
