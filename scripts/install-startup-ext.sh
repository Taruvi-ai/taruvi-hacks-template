#!/usr/bin/env bash
# Installs a minimal VS Code extension that opens Codex in a fullscreen
# terminal (as a maximized editor tab) on startup. Writes directly to the
# VS Code extensions directory — no VSIX or marketplace needed.

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
async function activate() {
  // Hide the sidebar for a clean, focused layout
  vscode.commands.executeCommand("workbench.action.closeSidebar");
  vscode.commands.executeCommand("workbench.action.closePanel");
  // Open Codex directly as an editor tab (not the bottom panel)
  const terminal = vscode.window.createTerminal({
    name: "Codex",
    location: vscode.TerminalLocation.Editor,
    // Source .env so no manual key entry is needed, then launch codex.
    // Falls back to a shell if codex exits so the terminal stays open.
    shellPath: "/bin/bash",
    shellArgs: [
      "-lc",
      "set -a; [ -f .env ] && source .env; set +a; codex; exec bash"
    ]
  });
  terminal.show();

  // Maximize the editor group so the terminal fills the window
  await vscode.commands.executeCommand("workbench.action.maximizeEditor");
}
function deactivate() {}
module.exports = { activate, deactivate };
EOF

echo "  ✅  Startup extension installed at $EXT_DIR"
