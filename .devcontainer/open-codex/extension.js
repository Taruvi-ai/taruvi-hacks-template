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

  // Setup done and auth ready — open Codex sidebar with panel closed.
  if (fs.existsSync(marker) && fs.existsSync(authFile)) {
    openCodexLayout();
    return;
  }

  // Setup done but auth.json not yet on disk — write-codex-auth.sh runs in
  // postStartCommand in parallel with VS Code loading, so it may still be
  // in flight. Poll up to 20 s; reload once when it appears so
  // openai.chatgpt starts fresh with auth.json on disk.
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
        // Auth never arrived — open sidebar anyway (user may sign in manually).
        vscode.commands.executeCommand('chatgpt.openSidebar');
      }
    }, 500);

    context.subscriptions.push({ dispose: () => clearInterval(authInterval) });
    return;
  }

  // First attach: setup still running. Poll until both markers are ready,
  // then reload so openai.chatgpt starts with auth.json already on disk.
  const POLL_MS    = 2000;
  const TIMEOUT_MS = 10 * 60 * 1000;
  const started    = Date.now();

  const interval = setInterval(() => {
    const markerReady = fs.existsSync(marker);
    const authReady   = fs.existsSync(authFile);

    if (markerReady) {
      clearInterval(interval);
      if (authReady) {
        setTimeout(() => vscode.commands.executeCommand('workbench.action.reloadWindow'), 1500);
      } else {
        // Setup finished but auth not yet present — reload so the
        // auth-wait branch above picks it up after the window comes back.
        setTimeout(() => vscode.commands.executeCommand('workbench.action.reloadWindow'), 500);
      }
    } else if (Date.now() - started > TIMEOUT_MS) {
      clearInterval(interval);
      vscode.commands.executeCommand('chatgpt.openSidebar');
    }
  }, POLL_MS);

  context.subscriptions.push({ dispose: () => clearInterval(interval) });
};

exports.deactivate = function () {};
