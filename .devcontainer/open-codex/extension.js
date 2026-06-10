const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');

function openCodexLayout() {
  vscode.commands.executeCommand('workbench.action.closePanel');
  vscode.commands.executeCommand('chatgpt.openSidebar');
}

exports.activate = function (context) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
  if (!workspaceRoot) return;

  const marker   = path.join(workspaceRoot, '.codespace', '.setup-complete');
  const authFile = path.join(os.homedir(), '.config', 'openai', 'auth.json');

  // Setup already done and auth is in place — open Codex with panel closed.
  if (fs.existsSync(marker) && fs.existsSync(authFile)) {
    openCodexLayout();
    return;
  }

  // Setup done but auth missing (e.g. container rebuilt) — open sidebar anyway,
  // don't reload (would cause an infinite loop).
  if (fs.existsSync(marker) && !fs.existsSync(authFile)) {
    vscode.commands.executeCommand('chatgpt.openSidebar');
    return;
  }

  // First attach: setup still running. Poll for both markers, then reload so
  // the openai.chatgpt extension starts with auth.json already on disk.
  const POLL_MS    = 2000;
  const TIMEOUT_MS = 10 * 60 * 1000;
  const started    = Date.now();

  const interval = setInterval(() => {
    if (fs.existsSync(marker) && fs.existsSync(authFile)) {
      clearInterval(interval);
      setTimeout(() => {
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      }, 1500);
    } else if (fs.existsSync(marker) && !fs.existsSync(authFile)) {
      // Setup finished but auth write failed — open without auth, no reload loop.
      clearInterval(interval);
      vscode.commands.executeCommand('chatgpt.openSidebar');
    } else if (Date.now() - started > TIMEOUT_MS) {
      clearInterval(interval);
      vscode.commands.executeCommand('chatgpt.openSidebar');
    }
  }, POLL_MS);

  context.subscriptions.push({ dispose: () => clearInterval(interval) });
};

exports.deactivate = function () {};
