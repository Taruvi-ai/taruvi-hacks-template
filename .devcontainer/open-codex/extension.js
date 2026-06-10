const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');

exports.activate = function (context) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
  if (!workspaceRoot) return;

  const marker  = path.join(workspaceRoot, '.codespace', '.setup-complete');
  const authFile = path.join(os.homedir(), '.config', 'openai', 'auth.json');

  // Setup already done and auth is in place — just open the sidebar.
  if (fs.existsSync(marker) && fs.existsSync(authFile)) {
    vscode.commands.executeCommand('chatgpt.openSidebar');
    return;
  }

  // First attach: setup is still running. Poll for the completion marker, then
  // reload the window so the openai.chatgpt extension starts with auth.json
  // already written (it checks for auth only at load time).
  const POLL_MS   = 2000;
  const TIMEOUT_MS = 10 * 60 * 1000; // give up after 10 min
  const started = Date.now();

  const interval = setInterval(() => {
    if (fs.existsSync(marker)) {
      clearInterval(interval);
      // Brief pause to ensure auth.json is fully flushed before reload.
      setTimeout(() => {
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      }, 1500);
    } else if (Date.now() - started > TIMEOUT_MS) {
      clearInterval(interval);
      // Setup timed out — open sidebar anyway and let the user sign in.
      vscode.commands.executeCommand('chatgpt.openSidebar');
    }
  }, POLL_MS);

  context.subscriptions.push({ dispose: () => clearInterval(interval) });
};

exports.deactivate = function () {};
