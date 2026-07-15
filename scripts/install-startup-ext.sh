"use strict";
const vscode = require("vscode");
async function activate() {
  vscode.commands.executeCommand("workbench.action.closeSidebar");

  const terminal = vscode.window.createTerminal({
    name: "Codex",
    location: vscode.TerminalLocation.Editor,   // open as an editor tab
    shellPath: "/bin/bash",
    shellArgs: [
      "-lc",
      "set -a; [ -f .env ] && source .env; set +a; codex; exec bash"
    ]
  });
  terminal.show();

  await vscode.commands.executeCommand("workbench.action.maximizeEditor");
}
