#!/bin/bash
# Fires before every tool call. Exit 2 to block. Exit 0 to allow.

if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs 2>/dev/null)
fi

if [[ "$TARUVI_APP_SLUG" == *"prod"* ]]; then
  case "$TOOL_NAME" in
    delete_datatable|drop_schema|delete_bucket)
      echo "BLOCKED: '$TOOL_NAME' is not permitted on production slug '$TARUVI_APP_SLUG'"
      echo "Switch to a dev slug or perform this operation manually."
      exit 2
      ;;
  esac
fi

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

exit 0
