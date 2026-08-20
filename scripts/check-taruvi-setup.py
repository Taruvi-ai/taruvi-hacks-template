#!/usr/bin/env python3
"""Verify the two Taruvi config outputs exist and agree with each other.

  1. MCP config  -> connects the agent to the platform
  2. app .env    -> connects the running app to the platform

Exits 0 when both are usable, 1 when something needs fixing.
Never prints a secret value; keys are masked to their last 4 characters.

Run directly, or via the "Check Taruvi Setup" Kiro hook.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REQUIRED_ENV_KEYS = ("TARUVI_SITE_URL", "TARUVI_APP_SLUG", "TARUVI_API_KEY")

problems: list[str] = []
warnings: list[str] = []
notes: list[str] = []


def mask(value: str) -> str:
    """Render a secret as ...abcd so it is identifiable but not usable."""
    if not value:
        return "(empty)"
    return f"…{value[-4:]}" if len(value) > 4 else "…"


def is_placeholder(value: str) -> bool:
    v = value.strip().strip("\"'")
    if not v:
        return True
    if v.startswith("<") and v.endswith(">"):
        return True
    lowered = v.lower()
    return any(
        marker in lowered
        for marker in ("your-api-key", "your_api_key", "changeme", "paste", "xxxx", "tenant>")
    )


def git(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["git", *args],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )


def strip_json_comments(text: str) -> str:
    """Tolerate // line comments, which show up in hand-edited MCP configs."""
    return re.sub(r"^\s*//.*$", "", text, flags=re.MULTILINE)


def load_json(path: Path) -> dict | None:
    try:
        return json.loads(strip_json_comments(path.read_text()))
    except json.JSONDecodeError as exc:
        problems.append(f"{path} is not valid JSON ({exc.msg} at line {exc.lineno}).")
    except OSError as exc:
        problems.append(f"{path} could not be read ({exc.strerror}).")
    return None


def parse_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.removeprefix("export ").partition("=")
        values[key.strip()] = value.strip().strip("\"'")
    return values


def check_file_hygiene(path: Path, label: str) -> None:
    """A file holding real credentials must be ignored by git and not world-readable."""
    rel = path.relative_to(ROOT) if path.is_relative_to(ROOT) else path

    if git("rev-parse", "--is-inside-work-tree").returncode == 0:
        if git("ls-files", "--error-unmatch", str(rel)).returncode == 0:
            problems.append(
                f"{label} ({rel}) is tracked by git. Its key is in history — "
                f"rotate it, then `git rm --cached {rel}` and add it to .gitignore."
            )
        elif git("check-ignore", "-q", str(rel)).returncode != 0:
            problems.append(f"{label} ({rel}) is not gitignored. Add `{rel}` to .gitignore.")

    mode = path.stat().st_mode & 0o777
    if mode & 0o077:
        warnings.append(f"{label} ({rel}) is mode {mode:o}; run `chmod 600 {rel}`.")


def tenant_from_site_url(site_url: str) -> str | None:
    match = re.match(r"^https?://([^/]+)", site_url.strip())
    return match.group(1) if match else None


def expand_vars(text: str) -> str:
    """Resolve ${VAR} against the environment, the way Kiro does at load time.

    Left as-is when unset, so cross-config comparisons are skipped rather than
    reported as a bogus mismatch against a literal '${VAR}'.
    """
    return re.sub(
        r"\$\{(\w+)\}",
        lambda m: os.environ.get(m.group(1)) or m.group(0),
        text,
    )


# ---------------------------------------------------------------- output 1: .env

env_path = ROOT / ".env"
env_values: dict[str, str] = {}

if not env_path.exists():
    example = ROOT / ".env.example"
    hint = " Start from `cp .env.example .env`." if example.exists() else ""
    problems.append(
        f".env is missing, so the app cannot start — src/taruviClient.ts will throw "
        f'"Missing required environment variable".{hint}'
    )
else:
    env_values = parse_env(env_path)
    for key in REQUIRED_ENV_KEYS:
        value = env_values.get(key, "")
        if key not in env_values:
            problems.append(f".env is missing {key}.")
        elif is_placeholder(value):
            problems.append(f".env has {key} unset or still a placeholder.")

    site_url = env_values.get("TARUVI_SITE_URL", "")
    if site_url and not is_placeholder(site_url):
        if not site_url.startswith(("http://", "https://")):
            problems.append(
                f"TARUVI_SITE_URL must be a full URL (https://<tenant>.taruvi.cloud), got "
                f"'{site_url}'. The bare subdomain form belongs in the MCP config, not .env."
            )
        if site_url.rstrip("/").endswith("/mcp"):
            problems.append("TARUVI_SITE_URL should be the site root, not the /mcp/ endpoint.")

    check_file_hygiene(env_path, ".env")

# ------------------------------------------------------------ output 2: MCP config

mcp_candidates = [
    (ROOT / ".kiro" / "settings" / "mcp.json", "workspace"),
    (Path.home() / ".kiro" / "settings" / "mcp.json", "user"),
]

taruvi_server: dict | None = None
taruvi_source: Path | None = None
found_any_config = False

# Kiro merges user < workspace, so the workspace entry wins.
for path, scope in mcp_candidates:
    if not path.exists():
        continue
    found_any_config = True
    config = load_json(path)
    if not config:
        continue
    server = (config.get("mcpServers") or {}).get("taruvi")
    if server is not None and taruvi_server is None:
        taruvi_server, taruvi_source = server, path
    notes.append(f"MCP config found ({scope}): {path}")
    if path.is_relative_to(ROOT):
        check_file_hygiene(path, "MCP config")

if not found_any_config:
    problems.append(
        "No MCP config found at .kiro/settings/mcp.json or ~/.kiro/settings/mcp.json. "
        'Run the kiro-setup skill ("setup taruvi").'
    )
elif taruvi_server is None:
    problems.append(
        "MCP config exists but declares no `taruvi` server under mcpServers, so no Taruvi "
        "tools are available."
    )
else:
    raw_headers = taruvi_server.get("headers") or {}
    # Compare against expanded values so an approved ${VAR} is judged on its real value.
    headers = {k: expand_vars(str(v)) for k, v in raw_headers.items()}
    url = expand_vars(taruvi_server.get("url", ""))

    if not url:
        problems.append("MCP `taruvi` server has no `url`.")
    elif not url.rstrip("/").endswith("/mcp"):
        warnings.append(
            f"MCP `taruvi` url is '{url}' — expected it to end in /mcp/."
        )

    auth = headers.get("Authorization", "")
    if not auth:
        problems.append("MCP `taruvi` server is missing the `Authorization` header.")
    elif not auth.startswith("Api-Key "):
        problems.append(
            "MCP `taruvi` Authorization header must be formatted `Api-Key <key>`."
        )
    elif is_placeholder(auth.removeprefix("Api-Key ")):
        problems.append(
            "MCP `taruvi` API key is still a placeholder — click Generate API Key on the "
            "app's Connect page."
        )

    if not headers.get("X-App-Slug"):
        problems.append(
            "MCP `taruvi` server is missing the `X-App-Slug` header; requests will have no "
            "app context."
        )

    if taruvi_server.get("disabled") is True:
        problems.append("MCP `taruvi` server is present but `disabled: true`.")

    # Kiro only expands ${VAR} for variables on the approved allowlist.
    for var in sorted(set(re.findall(r"\$\{(\w+)\}", json.dumps(taruvi_server)))):
        if os.environ.get(var):
            notes.append(f"${{{var}}} will expand (exported, value {mask(os.environ[var])}).")
        else:
            problems.append(
                f"MCP config references ${{{var}}} but it is not exported in this shell. "
                f"Export it, add it to Kiro settings → 'Mcp Approved Env Vars', and relaunch "
                f"Kiro from that shell."
            )

    # The two configs must point at the same tenant and app.
    env_site = env_values.get("TARUVI_SITE_URL", "")
    if env_site and url and not is_placeholder(env_site) and "${" not in url:
        env_host = tenant_from_site_url(env_site)
        mcp_host = tenant_from_site_url(url)
        if env_host and mcp_host and env_host != mcp_host:
            problems.append(
                f"Tenant mismatch: .env points at {env_host}, MCP config at {mcp_host}. "
                f"Both must be the same tenant (.env uses the full URL, MCP the same host)."
            )

    env_slug = env_values.get("TARUVI_APP_SLUG", "")
    mcp_slug = headers.get("X-App-Slug", "")
    if (
        env_slug
        and mcp_slug
        and not is_placeholder(env_slug)
        and "${" not in mcp_slug
        and env_slug != mcp_slug
    ):
        problems.append(
            f"App slug mismatch: .env has '{env_slug}', MCP X-App-Slug has '{mcp_slug}'."
        )

    env_key = env_values.get("TARUVI_API_KEY", "")
    mcp_key = auth.removeprefix("Api-Key ").strip()
    if (
        env_key
        and mcp_key
        and not is_placeholder(env_key)
        and not is_placeholder(mcp_key)
        and "${" not in mcp_key
        and env_key != mcp_key
    ):
        warnings.append(
            f"API keys differ between .env ({mask(env_key)}) and MCP config ({mask(mcp_key)}). "
            f"That is valid if you issued two keys, but usually means one is stale."
        )

# ------------------------------------------------------------------------ report

if problems:
    print("Taruvi setup is incomplete.\n")
    for item in problems:
        print(f"  [x] {item}")
    if warnings:
        print()
        for item in warnings:
            print(f"  [!] {item}")
    print(
        '\nFix with the kiro-setup skill ("setup taruvi"). After editing .env, restart the dev '
        "server — Vite bakes these in at build time."
    )
    sys.exit(1)

if warnings:
    print("Taruvi setup is usable, with warnings.\n")
    for item in warnings:
        print(f"  [!] {item}")
    sys.exit(0)

app_slug = env_values.get("TARUVI_APP_SLUG", "?")
site_url = env_values.get("TARUVI_SITE_URL", "?")
print(f"Taruvi setup OK — .env and MCP config both point at {app_slug} on {site_url}.")
if "-v" in sys.argv or "--verbose" in sys.argv:
    for item in notes:
        print(f"  - {item}")
sys.exit(0)
