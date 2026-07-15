"use strict";
const vscode = require("vscode");
async function activate() {
  // Close sidebar + panel, then open Codex in a dedicated terminal
  vscode.commands.executeCommand("workbench.action.closeSidebar");
  vscode.commands.executeCommand("workbench.action.closePanel");

  const terminal = vscode.window.createTerminal({
    name: "Codex",
    shellPath: "/bin/bash",
    shellArgs: [
      "-lc",
      "set -a; [ -f .env ] && source .env; set +a; codex; exec bash"
    ]
  });
  terminal.show();
}
function deactivate() {}
module.exports = { activate, deactivate };
