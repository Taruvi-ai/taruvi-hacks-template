#!/usr/bin/env bash
# Installs a minimal VS Code extension that opens Codex as a full editor panel
# on startup. Writes directly to the VS Code extensions directory — no VSIX or
# marketplace needed.

set -uo pipefail

EXT_DIR="/home/node/.vscode-remote/extensions/taruvi.codex-panel-opener-1.0.0"

mkdir -p "$EXT_DIR"

cat > "$EXT_DIR/package.json" << 'EOF'
{
  "name": "codex-panel-opener",
  "displayName": "Codex Panel Opener",
  "version": "1.0.0",
  "publisher": "taruvi",
  "engines": { "vscode": "^1.74.0" },
  "activationEvents": ["onStartupFinished"],
  "main": "./extension.js",
  "contributes": {}
}
EOF

cat > "$EXT_DIR/extension.js" << 'EOF'
"use strict";
const vscode = require("vscode");
function activate() {
  setTimeout(() => vscode.commands.executeCommand("chatgpt.newCodexPanel"), 2000);
}
function deactivate() {}
module.exports = { activate, deactivate };
EOF

echo "  ✅  Startup extension installed at $EXT_DIR"
