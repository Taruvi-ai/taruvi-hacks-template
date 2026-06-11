#!/usr/bin/env bash
# Builds and installs a minimal VS Code extension that opens Codex as a full
# editor panel on startup. Runs in postStartCommand before VS Code attaches.

set -uo pipefail

python3 - << 'PYEOF'
import zipfile

pkg = """{
  "name": "codex-panel-opener",
  "displayName": "Codex Panel Opener",
  "version": "1.0.0",
  "publisher": "taruvi",
  "engines": { "vscode": "^1.74.0" },
  "activationEvents": ["onStartupFinished"],
  "main": "./extension.js",
  "contributes": {}
}"""

ext_js = """"use strict";
const vscode = require("vscode");
function activate() {
  setTimeout(() => vscode.commands.executeCommand("chatgpt.newCodexPanel"), 2000);
}
function deactivate() {}
module.exports = { activate, deactivate };
"""

content_types = """<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension=".vsixmanifest" ContentType="text/xml"/>
  <Default Extension=".json" ContentType="application/json"/>
  <Default Extension=".js" ContentType="application/javascript"/>
</Types>"""

manifest = """<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011">
  <Metadata>
    <Identity Language="en-US" Id="codex-panel-opener" Version="1.0.0" Publisher="taruvi"/>
    <DisplayName>Codex Panel Opener</DisplayName>
    <Description>Opens Codex as a full panel on startup</Description>
    <Tags/><Categories>Other</Categories>
    <GalleryFlags>Public</GalleryFlags>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code" Version="[1.74.0,)"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/>
  </Assets>
</PackageManifest>"""

vsix = "/tmp/codex-panel-opener.vsix"
with zipfile.ZipFile(vsix, "w", zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml", content_types)
    z.writestr("extension.vsixmanifest", manifest)
    z.writestr("extension/package.json", pkg)
    z.writestr("extension/extension.js", ext_js)

print("  ✅  VSIX built:", vsix)
PYEOF

code --install-extension /tmp/codex-panel-opener.vsix 2>/dev/null \
  && echo "  ✅  Startup extension installed." \
  || echo "  ⚠️   Extension install skipped (will retry on next start)."
