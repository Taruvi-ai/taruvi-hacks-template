#!/usr/bin/env bash
set -euo pipefail

if [ -z "${CODESPACE_NAME:-}" ]; then
  echo "Not running in a Codespace — open http://localhost:5173 in your browser."
  exit 0
fi

URL="https://${CODESPACE_NAME}-5173.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"

echo ""
echo "  Opening preview: $URL"
echo ""

# Opens in VS Code's Simple Browser panel.
code --open-url "$URL" 2>/dev/null || echo "  If preview did not open, visit the URL above in a browser tab."
