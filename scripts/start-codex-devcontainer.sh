#!/usr/bin/env bash

set -euo pipefail

cd "${WORKSPACE_FOLDER:-$PWD}"

export XDG_CONFIG_HOME=/tmp

if [ ! -f .env ]; then
  cp .env.example .env
fi

load_env_file() {
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%$'\r'}"

    case "$line" in
      '' | [[:space:]]*'#'*)
        continue
        ;;
    esac

    case "$line" in
      *=*)
        ;;
      *)
        continue
        ;;
    esac

    key="${line%%=*}"
    value="${line#*=}"

    key="$(echo "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    value="$(echo "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"

    if [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      export "$key=$value"
    fi
  done < .env
}

while true; do
  load_env_file

  MISSING_VARS=""
  for var_name in VITE_TARUVI_BASE_URL VITE_TARUVI_API_KEY VITE_TARUVI_APP_SLUG; do
    var_value="${!var_name:-}"
    if [ -z "${var_value//[[:space:]]/}" ]; then
      MISSING_VARS="$MISSING_VARS $var_name"
    fi
  done

  if [ -z "$MISSING_VARS" ]; then
    break
  fi

  echo "Missing required .env values:$MISSING_VARS"
  echo "Do you want to continue anyway without these values? [y/N]"
  read -r continue_without_env

  case "${continue_without_env:-}" in
    [Yy] | [Yy][Ee][Ss])
      echo "Continuing without all required env values."
      break
      ;;
    *)
      echo "Populate .env, then press Enter to retry."
      read -r
      ;;
  esac
done

BASE_URL="${VITE_TARUVI_BASE_URL%/}"

export CODEX_HOME="${CODEX_HOME:-$PWD/.codex}"
mkdir -p "$CODEX_HOME/projects"

cat > "$CODEX_HOME/config.toml" <<EOF
[mcp_servers.taruvi]
url = "${BASE_URL}/mcp/"

[mcp_servers.taruvi.http_headers]
Accept = "application/json, text/event-stream"
Authorization = "Api-Key ${VITE_TARUVI_API_KEY}"
X-App-Slug = "${VITE_TARUVI_APP_SLUG}"

[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]
env_vars = ["CONTEXT7_API_KEY"]

[mcp_servers.playwright]
command = "npx"
args = ["@playwright/mcp@latest"]

[mcp_servers.chrome-devtools]
command = "npx"
args = ["@anthropic-ai/chrome-devtools-mcp@latest"]
EOF

if [ -f /root/.codex/auth.json ] && [ ! -f "$CODEX_HOME/auth.json" ]; then
  cp /root/.codex/auth.json "$CODEX_HOME/auth.json"
fi

AUTH_PATH="$CODEX_HOME/auth.json"
if [ ! -f "$AUTH_PATH" ]; then
  echo "please copy auth.json to $AUTH_PATH and press Enter"
  read -r
fi

source /usr/local/share/nvm/nvm.sh
nvm install 22
nvm use 22

command -v codex >/dev/null 2>&1 || npm install -g @openai/codex

echo "=== Codex config written to $CODEX_HOME/config.toml ==="

VSCODE_EXTENSION_ID="${CODEX_VSCODE_EXTENSION_ID:-openai.chatgpt}"
if command -v code >/dev/null 2>&1; then
  code --install-extension "$VSCODE_EXTENSION_ID" --force || true
elif command -v code-server >/dev/null 2>&1; then
  code-server --install-extension "$VSCODE_EXTENSION_ID" --force || true
else
  echo "VS Code CLI not found; skipping extension install ($VSCODE_EXTENSION_ID)."
fi

echo "=== Launching Codex ==="

exec codex --sandbox danger-full-access
