const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');

function launchCodexTerminal() {
  const terminal = vscode.window.createTerminal({ name: 'Codex' });
  terminal.sendText('bash -c \'set -a; [ -f .env ] && source .env; set +a; codex\'');
  terminal.show();
}

exports.activate = function (context) {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
  if (!workspaceRoot) return;

  const marker   = path.join(workspaceRoot, '.codespace', '.setup-complete');
  const authFile = path.join(os.homedir(), '.config', 'openai', 'auth.json');

  // Setup done and auth ready — launch Codex terminal immediately.
  if (fs.existsSync(marker) && fs.existsSync(authFile)) {
    launchCodexTerminal();
    return;
  }

  // Setup done but auth.json not yet on disk — write-codex-auth.sh runs in
  // postStartCommand in parallel with VS Code loading, so it may still be
  // in flight. Poll up to 20 s; launch terminal once it appears.
  if (fs.existsSync(marker)) {
    const AUTH_WAIT_MS = 20000;
    const authStarted  = Date.now();
    let launched = false;

    const authInterval = setInterval(() => {
      if (fs.existsSync(authFile)) {
        clearInterval(authInterval);
        if (!launched) { launched = true; launchCodexTerminal(); }
      } else if (Date.now() - authStarted > AUTH_WAIT_MS) {
        clearInterval(authInterval);
        if (!launched) { launched = true; launchCodexTerminal(); }
      }
    }, 500);

    context.subscriptions.push({ dispose: () => clearInterval(authInterval) });
    return;
  }

  // First attach: setup still running. Poll until setup + auth are both ready,
  // then launch terminal. Falls back to launching without auth after 10 min.
  const POLL_MS    = 2000;
  const TIMEOUT_MS = 10 * 60 * 1000;
  const started    = Date.now();
  let launched = false;

  const interval = setInterval(() => {
    const markerReady = fs.existsSync(marker);
    const authReady   = fs.existsSync(authFile);

    if (markerReady) {
      clearInterval(interval);
      if (authReady) {
        if (!launched) { launched = true; launchCodexTerminal(); }
      } else {
        // Auth may still be writing — hand off to auth-wait above by
        // reloading so the second branch picks it up cleanly.
        setTimeout(() => vscode.commands.executeCommand('workbench.action.reloadWindow'), 500);
      }
    } else if (Date.now() - started > TIMEOUT_MS) {
      clearInterval(interval);
      if (!launched) { launched = true; launchCodexTerminal(); }
    }
  }, POLL_MS);

  context.subscriptions.push({ dispose: () => clearInterval(interval) });
};

exports.deactivate = function () {};
