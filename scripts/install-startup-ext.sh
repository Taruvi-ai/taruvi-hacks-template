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
const http = require("http");

function checkPort() {
  return new Promise(resolve => {
    const req = http.get("http://localhost:5173", r => { r.resume(); resolve(true); });
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
    req.end();
  });
}

async function activate() {
  setTimeout(async () => {
    vscode.commands.executeCommand("workbench.action.closeSidebar");
    vscode.commands.executeCommand("workbench.action.closePanel");
    vscode.commands.executeCommand("chatgpt.newCodexPanel");

    // Start Vite via VS Code task if not already running
    const already = await checkPort();
    if (!already) {
      const task = new vscode.Task(
        { type: "shell" },
        vscode.TaskScope.Workspace,
        "Dev Server",
        "npm",
        new vscode.ShellExecution("npm run dev -- --host 0.0.0.0 --port 5173"),
        []
      );
      task.presentationOptions = { reveal: vscode.TaskRevealKind.Silent, focus: false };
      vscode.tasks.executeTask(task);
    }

    // Poll until Vite responds, then open Simple Browser
    const deadline = Date.now() + 30000;
    const timer = setInterval(async () => {
      const ready = await checkPort();
      if (ready || Date.now() > deadline) {
        clearInterval(timer);
        if (ready) {
          try {
            const ext = await vscode.env.asExternalUri(vscode.Uri.parse("http://localhost:5173"));
            vscode.commands.executeCommand("simpleBrowser.show", ext.toString());
          } catch (_) {}
        }
      }
    }, 2000);
  }, 2000);
}

function deactivate() {}
module.exports = { activate, deactivate };
EOF

echo "  ✅  Startup extension installed at $EXT_DIR"
