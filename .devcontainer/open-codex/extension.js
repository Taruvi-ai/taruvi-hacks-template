const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');

exports.activate = function (context) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
  if (!workspaceRoot) return;

  // Close the file explorer sidebar and bottom panel by default so the
  // workspace opens clean — Codex sidebar is all participants need.
  vscode.commands.executeCommand('workbench.action.closeSidebar');
  vscode.commands.executeCommand('workbench.action.closePanel');

  const marker   = path.join(workspaceRoot, '.codespace', '.setup-complete');
  const authFile = path.join(os.homedir(), '.config', 'openai', 'auth.json');

  // Setup already done and auth is in place — just open the sidebar.
  if (fs.existsSync(marker) && fs.existsSync(authFile)) {
    vscode.commands.executeCommand('chatgpt.openSidebar');
    return;
  }

  // Setup is still running. Show a status bar message so users know Codex
  // isn't broken — it's waiting for the workspace to finish initialising.
  const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusItem.text = '$(loading~spin) Setting up your workspace…';
  statusItem.tooltip = 'Installing dependencies and configuring Codex. This takes about a minute on first launch.';
  statusItem.show();
  context.subscriptions.push(statusItem);

  const POLL_MS    = 2000;
  const TIMEOUT_MS = 10 * 60 * 1000;
  const started = Date.now();

  const interval = setInterval(() => {
    if (fs.existsSync(marker)) {
      clearInterval(interval);
      statusItem.text = '$(check) Workspace ready — loading Codex…';
      setTimeout(() => {
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      }, 1500);
    } else if (Date.now() - started > TIMEOUT_MS) {
      clearInterval(interval);
      statusItem.dispose();
      vscode.commands.executeCommand('chatgpt.openSidebar');
    }
  }, POLL_MS);

  context.subscriptions.push({ dispose: () => clearInterval(interval) });
};

exports.deactivate = function () {};
