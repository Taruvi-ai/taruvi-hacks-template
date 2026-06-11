#!/bin/bash
# SessionStart.sh — environment banner that fires once when a session begins.
#
# Purely informational: it never blocks anything. Its job is to make the
# session's context obvious before any work starts, so the operator (and the
# agent reading the output) immediately knows:
#   - which Taruvi app slug and site this session will touch
#   - whether that target is PRODUCTION (destructive ops will be blocked
#     by PreToolUse.sh)
#   - whether the Taruvi backend is actually reachable
#   - whether there are captured browser errors waiting to be read

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Taruvi Dev — Session Start"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Load the Taruvi environment from .env.local (comments skipped).
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs 2>/dev/null)
fi

# Show which app and site this session is pointed at. "NOT SET" here is the
# first thing to fix — nothing Taruvi-related will work without these.
echo ""
echo "  App slug : ${TARUVI_APP_SLUG:-NOT SET}"
echo "  Site URL : ${TARUVI_SITE_URL:-NOT SET}"

# Loud warning when the slug looks like production. PreToolUse.sh enforces
# the actual blocking; this banner just makes sure nobody is surprised by it.
if [[ "$TARUVI_APP_SLUG" == *"prod"* ]]; then
  echo ""
  echo "  ⚠  WARNING: PRODUCTION SLUG IS ACTIVE"
  echo "  Destructive MCP operations are blocked"
fi

# Quick reachability probe (3s timeout) so connectivity problems surface now,
# not as a confusing MCP failure mid-task.
if [ -n "$TARUVI_SITE_URL" ]; then
  if curl -s --max-time 3 "$TARUVI_SITE_URL" > /dev/null 2>&1; then
    echo ""
    echo "  ✓ Taruvi MCP reachable"
  else
    echo ""
    echo "  ✗ Taruvi MCP not reachable — check .env.local"
  fi
fi

# The frontend writes captured browser/console errors to logs/frontend.ndjson
# (see AGENTS.md). If any are queued, point the agent at them — they are the
# first place to look when investigating UI issues.
if [ -f logs/frontend.ndjson ] && [ -s logs/frontend.ndjson ]; then
  COUNT=$(wc -l < logs/frontend.ndjson | tr -d ' ')
  echo ""
  echo "  ⚠  $COUNT unread browser error(s) in logs/frontend.ndjson"
  echo "  Read these before investigating any UI issue"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
