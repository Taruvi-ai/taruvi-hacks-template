#!/usr/bin/env bash

# Writes Codex auth.json from the provider API key.
# Runs as a background process from postStartCommand with a retry loop.
# github-create-codespace injects codespace_configs right when the codespace
# becomes Available — the retry loop catches it during the 2-min warm-up window.

set -uo pipefail

CODEX_HOME="${CODEX_HOME:-$PWD/.codex}"

_write_auth() {
  local key="$1"
  mkdir -p "$HOME/.config/openai" "$CODEX_HOME"
  if printf '%s' "$key" | python3 -c "import sys,json; json.load(sys.stdin)" 2>/dev/null; then
    printf '%s\n' "$key" | tee "$HOME/.config/openai/auth.json" "$CODEX_HOME/auth.json" > /dev/null
  else
    printf '{"apiKey":"%s"}\n' "$key" | tee "$HOME/.config/openai/auth.json" "$CODEX_HOME/auth.json" > /dev/null
  fi
  echo "  ✅  Codex auth written."
}

# ── Path A: env vars injected as Codespace secrets ────────────────────────────
for _var in OPENAI_API_KEY ANTHROPIC_API_KEY; do
  _val=$(printenv "$_var" 2>/dev/null || true)
  if [ -n "${_val:-}" ]; then
    _write_auth "$_val"
    exit 0
  fi
done
unset _var _val

# ── Path B: fetch from Taruvi config API with retry ───────────────────────────
[ -z "${CODESPACE_NAME:-}" ] && exit 0

MAX_RETRIES=20
RETRY_INTERVAL=30
attempt=0

while [ $attempt -lt $MAX_RETRIES ]; do
  _resp=$(curl -sf -X POST \
    "https://hackathonsite.taruvi.cloud/api/apps/hackathonapp/functions/get-codespace-config/execute/" \
    -H "Content-Type: application/json" \
    -d "{\"async\":false,\"params\":{\"codespace_name\":\"$CODESPACE_NAME\"}}" \
    2>/dev/null) || true

  for _var in OPENAI_API_KEY ANTHROPIC_API_KEY; do
    _val=$(printf '%s' "${_resp:-}" | jq -r ".data.config.${_var} // empty" 2>/dev/null || true)
    if [ -n "${_val:-}" ]; then
      _write_auth "$_val"
      exit 0
    fi
  done
  unset _var _val _resp

  attempt=$((attempt + 1))
  if [ $attempt -lt $MAX_RETRIES ]; then
    echo "  ⏳  No config yet (attempt $attempt/$MAX_RETRIES), retrying in ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
  fi
done

echo "  ⚠️   Could not get provider key after $MAX_RETRIES attempts."
exit 0
