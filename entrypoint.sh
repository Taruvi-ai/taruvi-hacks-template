#!/bin/bash
set -e

cd /app

export XDG_CONFIG_HOME=/tmp

# Load .env variables
if [ -f ".env" ]; then
  export $(grep -v '^\s*#' .env | grep -v '^\s*$' | xargs)
fi

TARUVI_SITE_URL="${TARUVI_SITE_URL:-}"
TARUVI_SITE_URL="${TARUVI_SITE_URL%/}"
TARUVI_APP_SLUG="${TARUVI_APP_SLUG:-}"
TARUVI_API_KEY="${TARUVI_API_KEY:-}"

# Setup Codex config with resolved env values
export CODEX_HOME=/app/.codex
mkdir -p "$CODEX_HOME"

cat > "$CODEX_HOME/config.toml" <<EOF
[mcp_servers.taruvi]
url = "${TARUVI_SITE_URL}/mcp/"

[mcp_servers.taruvi.http_headers]
Accept = "application/json, text/event-stream"
Authorization = "Api-Key ${TARUVI_API_KEY}"
X-App-Slug = "${TARUVI_APP_SLUG}"
EOF

# Copy auth.json into CODEX_HOME
cp /root/.codex/auth.json "$CODEX_HOME/auth.json"

echo "=== Codex config written to $CODEX_HOME/config.toml ==="

# Symlink pre-installed deps (instant, works with both CJS and ESM resolution)
ln -sfn /deps/node_modules /app/node_modules
export PATH="/deps/node_modules/.bin:$PATH"
echo "=== Dependencies linked from /deps/node_modules ==="

# Start dev server in background (use npx vite directly — refine CLI can't resolve vite through symlinked node_modules)
echo "=== Starting dev server on http://localhost:5173 ==="
npx vite --host 0.0.0.0 &

# Give dev server a moment to start
sleep 2

# Launch codex in foreground
echo ""
echo "=== Launching Codex ==="
exec codex
