#!/bin/bash
# Fires automatically at the start of every session.

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Taruvi Dev — Session Start"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs 2>/dev/null)
fi

echo ""
echo "  App slug : ${TARUVI_APP_SLUG:-NOT SET}"
echo "  Site URL : ${TARUVI_SITE_URL:-NOT SET}"

if [[ "$TARUVI_APP_SLUG" == *"prod"* ]]; then
  echo ""
  echo "  ⚠  WARNING: PRODUCTION SLUG IS ACTIVE"
  echo "  Destructive MCP operations are blocked"
fi

if [ -n "$TARUVI_SITE_URL" ]; then
  if curl -s --max-time 3 "$TARUVI_SITE_URL" > /dev/null 2>&1; then
    echo ""
    echo "  ✓ Taruvi MCP reachable"
  else
    echo ""
    echo "  ✗ Taruvi MCP not reachable — check .env.local"
  fi
fi

if [ -f logs/frontend.ndjson ] && [ -s logs/frontend.ndjson ]; then
  COUNT=$(wc -l < logs/frontend.ndjson | tr -d ' ')
  echo ""
  echo "  ⚠  $COUNT unread browser error(s) in logs/frontend.ndjson"
  echo "  Read these before investigating any UI issue"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
