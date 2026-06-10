const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');

function openCodexLayout() {
  // Delay so VS Code finishes initialising before we open the sidebar.
  // The ChatGPT webview is heavy — Chrome may show "Pages Unresponsive"
  // on first load; clicking Wait will let it finish.
  setTimeout(() => {
    vscode.window.showInformationMessage(
      'Codex is loading. If Chrome shows "Pages Unresponsive" — click Wait, it will finish loading.'
    );
    vscode.commands.executeCommand('workbench.action.closePanel');
    vscode.commands.executeCommand('chatgpt.openSidebar');
  }, 5000);
}

exports.activate = function (context) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
  if (!workspaceRoot) return;

  const marker   = path.join(workspaceRoot, '.codespace', '.setup-complete');
  const authFile = path.join(os.homedir(), '.config', 'openai', 'auth.json');

  // Setup done and auth ready — open Codex sidebar (with stabilisation delay).
  if (fs.existsSync(marker) && fs.existsSync(authFile)) {
    openCodexLayout();
    return;
  }

  // Setup done but auth.json not yet on disk — write-codex-auth.sh in
  // postStartCommand races with VS Code loading. Poll up to 20 s; when the
  // file appears, reload once so openai.chatgpt starts fresh with auth on disk.
  // After the reload the first branch fires — no loop possible.
  if (fs.existsSync(marker)) {
    const AUTH_WAIT_MS = 20000;
    const authStarted  = Date.now();
    let reloaded = false;

    const authInterval = setInterval(() => {
      if (fs.existsSync(authFile)) {
        clearInterval(authInterval);
        if (!reloaded) {
          reloaded = true;
          setTimeout(() => vscode.commands.executeCommand('workbench.action.reloadWindow'), 500);
        }
      } else if (Date.now() - authStarted > AUTH_WAIT_MS) {
        clearInterval(authInterval);
        vscode.window.showWarningMessage(
          'Codex auth was not written in time. Open Codex and sign in manually, or use 🔁 Retry Setup.'
        );
        vscode.commands.executeCommand('chatgpt.openSidebar');
      }
    }, 500);

    context.subscriptions.push({ dispose: () => clearInterval(authInterval) });
    return;
  }

  // First attach: setup still running. Poll until setup marker appears, then
  // reload so openai.chatgpt starts with auth.json already on disk.
  const POLL_MS    = 2000;
  const TIMEOUT_MS = 10 * 60 * 1000;
  const started    = Date.now();

  const interval = setInterval(() => {
    if (fs.existsSync(marker)) {
      clearInterval(interval);
      setTimeout(() => vscode.commands.executeCommand('workbench.action.reloadWindow'), 1000);
    } else if (Date.now() - started > TIMEOUT_MS) {
      clearInterval(interval);
      vscode.window.showWarningMessage(
        'Codespace setup did not complete in 10 minutes. Use the 🔁 Retry Setup button to try again.'
      );
      vscode.commands.executeCommand('chatgpt.openSidebar');
    }
  }, POLL_MS);

  context.subscriptions.push({ dispose: () => clearInterval(interval) });
};

exports.deactivate = function () {};
