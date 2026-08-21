#!/usr/bin/env python3
"""Enumerate the Taruvi MCP servers visible in this workspace, and from where.

Kiro merges MCP config `user < workspace`, so a freshly cloned template with no
usable workspace server silently inherits whatever Taruvi server the user-level
config declares — a different tenant and app, while everything *looks*
configured. Servers under a different name (`taruvi-staging`,
`taruvi-trackit-test`, ...) are never shadowed at all: their tools show up
alongside the workspace ones in the same session.

This module answers "which Taruvi am I talking to, and did anyone choose it?"
without printing a single secret.

    python3 scripts/mcp_scope.py            # full report
    python3 scripts/mcp_scope.py --quiet    # silent unless a decision is needed
    python3 scripts/mcp_scope.py --json     # machine-readable

Config files are not the live connection. Kiro binds MCP servers when the session
starts, so a config written mid-session is inert until the servers are reconnected
— tools keep answering from the previously bound (often inherited) server while
the config on disk looks correct. That is a false green, so this module also
tracks whether the effective config has been *confirmed live*: `--record` stores a
secret-free fingerprint after tools are verified, and a mismatch is reported as
stale rather than OK.

    python3 scripts/mcp_scope.py            # report
    python3 scripts/mcp_scope.py --quiet    # silent unless a decision is needed
    python3 scripts/mcp_scope.py --json     # machine-readable
    python3 scripts/mcp_scope.py --record   # mark current config confirmed live
    python3 scripts/mcp_scope.py -v         # full server inventory

Exit codes:
    0  one unambiguous workspace server, confirmed live     -> proceed
    1  no usable Taruvi server at all                       -> run setup
    2  ambiguous: ask the user which connection to use      -> do not guess
    3  config not confirmed live: reconnect, then re-verify  -> do not trust tools

Also imported by check-taruvi-setup.py, so scope detection has one implementation.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# Later entries lose name collisions to earlier ones: Kiro merges user < workspace.
SCOPES: list[tuple[str, Path]] = [
    ("workspace", ROOT / ".kiro" / "settings" / "mcp.json"),
    ("plugin", ROOT / ".kiro" / "mcp.json"),
    ("user", Path.home() / ".kiro" / "settings" / "mcp.json"),
]

# A preToolUse hook only blocks when its output reads as a refusal, so these lines
# have to stay. Everything else about how to ask lives in steering, where the user
# never has to read it.
DENIAL = "ACCESS NOT GRANTED: Taruvi connection unconfirmed — ask the user which to use."
STALE = "ACCESS NOT GRANTED: MCP config changed since this session bound its servers."

# Records which config the session was confirmed against. Local session state, not
# source: gitignored, holds no secret, safe to delete (worst case: re-verify once).
STATE_PATH = ROOT / ".kiro" / "settings" / ".mcp-scope-state.json"

PLACEHOLDER_MARKERS = (
    "your-api-key",
    "your_api_key",
    "changeme",
    "paste",
    "xxxx",
    "<tenant>",
    "<app-slug>",
    "<key>",
)


def strip_json_comments(text: str) -> str:
    return re.sub(r"^\s*//.*$", "", text, flags=re.MULTILINE)


def expand_vars(text: str) -> str:
    """Resolve ${VAR} the way Kiro does at load time; leave unset ones literal."""
    return re.sub(r"\$\{(\w+)\}", lambda m: os.environ.get(m.group(1)) or m.group(0), text)


def is_placeholder(value: str) -> bool:
    v = (value or "").strip().strip("\"'")
    if not v:
        return True
    if v.startswith("<") and v.endswith(">"):
        return True
    lowered = v.lower()
    return any(marker in lowered for marker in PLACEHOLDER_MARKERS)


def looks_like_taruvi(name: str, server: dict) -> bool:
    """Any server pointed at a Taruvi tenant, not only one literally named `taruvi`."""
    if name == "taruvi" or name.startswith(("taruvi-", "taruvi_")):
        return True
    url = str(server.get("url", ""))
    return "taruvi" in url.lower() or "X-App-Slug" in (server.get("headers") or {})


def host_of(url: str) -> str:
    match = re.match(r"^https?://([^/]+)", url.strip())
    return match.group(1) if match else ""


def describe(server: dict) -> dict:
    """Secret-free identity of a server: tenant, app, and whether its key is real."""
    url = expand_vars(str(server.get("url", "")))
    headers = {k: expand_vars(str(v)) for k, v in (server.get("headers") or {}).items()}
    auth = headers.get("Authorization", "")
    key = auth.removeprefix("Api-Key ").strip()

    unresolved = sorted(set(re.findall(r"\$\{(\w+)\}", json.dumps(server))))
    unresolved = [v for v in unresolved if not os.environ.get(v)]

    if unresolved:
        key_state = f"unresolved ${{{unresolved[0]}}}"
    elif not auth:
        key_state = "missing"
    elif is_placeholder(key):
        key_state = "placeholder"
    else:
        key_state = "set"

    return {
        "host": host_of(url) or url or "(no url)",
        "app_slug": headers.get("X-App-Slug") or "(none)",
        "key_state": key_state,
        # Usable == would actually authenticate against a specific app.
        "usable": key_state == "set" and bool(url) and bool(headers.get("X-App-Slug")),
    }


def collect() -> tuple[list[dict], list[str]]:
    """Return (servers, read_errors). Effective servers only, collisions resolved."""
    servers: list[dict] = []
    errors: list[str] = []
    claimed: set[str] = set()

    for scope, path in SCOPES:
        if not path.exists():
            continue
        try:
            config = json.loads(strip_json_comments(path.read_text()))
        except (json.JSONDecodeError, OSError) as exc:
            errors.append(f"{path}: {exc}")
            continue

        for name, server in (config.get("mcpServers") or {}).items():
            if not isinstance(server, dict) or not looks_like_taruvi(name, server):
                continue
            if name in claimed:
                # Shadowed by a higher-precedence scope; Kiro will never load it.
                continue
            claimed.add(name)
            if server.get("disabled") is True:
                continue
            record = {"name": name, "scope": scope, "path": str(path), **describe(server)}
            # Raw config for callers that must validate headers; never serialized.
            record["_raw"] = server
            servers.append(record)

    return servers, errors


def public(server: dict) -> dict:
    """Drop the raw config so nothing secret can reach stdout or a log."""
    return {k: v for k, v in server.items() if not k.startswith("_")}


def identity(server: dict) -> tuple[str, str]:
    return (server["host"], server["app_slug"])


def fingerprint(servers: list[dict]) -> str:
    """Stable, secret-free digest of the effective Taruvi config.

    Covers name, scope, host and app slug — everything that determines *which*
    app a tool call reaches. Deliberately excludes key material, so the state
    file never holds a credential. A rotated key with the same tenant/app does
    not invalidate the confirmation, which is correct: it still reaches the same
    app.
    """
    material = sorted(f"{s['name']}|{s['scope']}|{s['host']}|{s['app_slug']}" for s in servers)
    return hashlib.sha256("\n".join(material).encode()).hexdigest()[:16]


def read_state() -> dict:
    try:
        return json.loads(STATE_PATH.read_text())
    except (json.JSONDecodeError, OSError):
        return {}


def record_state(servers: list[dict]) -> str:
    """Mark the current effective config as confirmed live against real tools."""
    digest = fingerprint(servers)
    chosen = next(
        (s for s in servers if s["usable"] and s["scope"] == "workspace"),
        next((s for s in servers if s["usable"]), None),
    )
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(
        json.dumps(
            {
                "confirmed_fingerprint": digest,
                # Recorded for the human reading this file, not used in comparison.
                "confirmed_server": chosen["name"] if chosen else None,
                "confirmed_host": chosen["host"] if chosen else None,
                "confirmed_app": chosen["app_slug"] if chosen else None,
            },
            indent=2,
        )
        + "\n"
    )
    return digest


def options(candidates: list[dict]) -> list[str]:
    """The candidate connections, as facts. No instructions on how to ask.

    Kept deliberately terse: this text surfaces in the user's transcript via the
    preToolUse hook, so anything the agent already knows from steering is noise
    the user has to read twice. Phrasing lives in taruvi-preflight.md.
    """
    lines = [
        f"  {i}. {s['name']} ({s['scope']}) -> {s['host']} / app '{s['app_slug']}'"
        for i, s in enumerate(candidates, start=1)
    ]
    # Naming the skill matters: without it the agent tends to invent its own
    # three-question credential ask, which skips "Generate API Key" on the Connect
    # page and sends the user hunting for values that sit in one copyable block.
    lines.append(
        f"  {len(candidates) + 1}. set up a new connection "
        "(run the kiro-setup skill — do not ask for credentials yourself)"
    )
    return lines


def assess(servers: list[dict]) -> tuple[int, str, list[str]]:
    """Classify the situation. Returns (exit_code, verdict, decision lines)."""
    usable = [s for s in servers if s["usable"]]
    workspace_usable = [s for s in usable if s["scope"] == "workspace"]
    inherited_usable = [s for s in usable if s["scope"] != "workspace"]
    broken_workspace = [s for s in servers if s["scope"] == "workspace" and not s["usable"]]

    if not servers:
        return 1, "none", ["No Taruvi MCP server configured. Run setup."]

    if not usable:
        states = ", ".join("{name}: {key_state}".format(**s) for s in servers)
        return 1, "none-usable", [f"No Taruvi server can authenticate ({states}). Run setup."]

    # The clone-and-connect trap: nothing usable belongs to this workspace, so
    # tool calls land on whatever the user-level config happens to point at.
    if not workspace_usable and inherited_usable:
        why = "No workspace Taruvi config; falling back to user-level (merge order user < workspace)."
        if broken_workspace:
            why += " Workspace entry " + ", ".join(
                f"{s['name']} [{s['key_state']}]" for s in broken_workspace
            ) + " cannot authenticate."
        return 2, "inherited", [DENIAL, why, "Candidates:", *options(inherited_usable)]

    # Two workspace servers for different apps: the config itself is undecided.
    if len({identity(s) for s in workspace_usable}) > 1:
        return 2, "multiple", [
            DENIAL,
            "Workspace config declares multiple Taruvi servers for different apps.",
            "Candidates:",
            *options(workspace_usable),
        ]

    # A usable workspace server is an explicit choice — proceed. But servers under a
    # different name are never shadowed, so their tools sit alongside in the same
    # session and can be picked by mistake.
    chosen = workspace_usable[0]
    target = f"{chosen['name']} (workspace) -> {chosen['host']} / app '{chosen['app_slug']}'"

    # A *changed* config is worth flagging: whoever edited it may not have
    # reconnected, so the session could still be bound to the previous server.
    #
    # A config never recorded at all is NOT evidence of staleness — it is the
    # normal state on a fresh clone or after a restart. This script runs in a
    # shell and cannot observe the agent's MCP binding, so treating "unrecorded"
    # as "stale" blocks every healthy session and trains everyone to run --record
    # reflexively, which destroys the signal.
    state = read_state()
    confirmed = state.get("confirmed_fingerprint")
    current = fingerprint(servers)
    if confirmed is not None and confirmed != current:
        was = state.get("confirmed_app")
        return 3, "changed", [
            STALE,
            f"Now on disk: {target}",
            f"Last confirmed: app '{was}' on {state.get('confirmed_host')}",
            "If the config changed during this session, the servers are still bound to the "
            "old one — reconnect (MCP Server view) or restart the session.",
            "Then confirm tool results belong to this app: python3 scripts/mcp_scope.py --record",
        ]

    lines = [target]
    if confirmed is None:
        # Advisory, not a block: cheap to say, and it is the one check a shell
        # script genuinely cannot perform on the caller's behalf.
        lines.append(
            "Unverified: confirm the first tool result belongs to this app "
            "(then: python3 scripts/mcp_scope.py --record)"
        )
    strangers = [s for s in inherited_usable if identity(s) != identity(chosen)]
    if strangers:
        # Worth one line: these tools are callable in this session but wrong.
        lines.append(
            "Do not call: " + "; ".join(f"{s['name']} -> {s['host']}" for s in strangers)
        )
    return 0, "ok", lines


def main() -> int:
    args = set(sys.argv[1:])
    servers, errors = collect()

    if "--record" in args:
        # Only meaningful once tools have actually been checked against this config;
        # recording blind just re-creates the false green this is meant to catch.
        usable = [s for s in servers if s["usable"]]
        if not usable:
            print("Nothing to record: no usable Taruvi server configured.")
            return 1
        # Refuse while the target is still ambiguous — recording here would freeze
        # an unmade decision into "confirmed".
        code, _, _ = assess(servers)
        if code == 2:
            print(
                "Refusing to record: the target connection is still ambiguous. "
                "Resolve it with the user first (python3 scripts/mcp_scope.py)."
            )
            return 2
        digest = record_state(servers)
        state = read_state()
        print(
            f"Recorded {state['confirmed_server']} -> {state['confirmed_host']} / "
            f"app '{state['confirmed_app']}' as confirmed live ({digest})."
        )
        return 0

    code, verdict, decision = assess(servers)

    if "--json" in args:
        print(
            json.dumps(
                {
                    "verdict": verdict,
                    "exit_code": code,
                    "servers": [public(s) for s in servers],
                    "decision": decision,
                    "errors": errors,
                    "fingerprint": fingerprint(servers),
                    "confirmed_fingerprint": read_state().get("confirmed_fingerprint"),
                },
                indent=2,
            )
        )
        return code

    # Quiet mode exists so a preToolUse hook can stay silent when all is well.
    quiet = "--quiet" in args
    if quiet and code == 0 and not errors:
        return 0

    for line in decision:
        print(line)

    for err in errors:
        print(f"Unreadable config: {err}")

    # The full inventory is for a human debugging their setup, not for the hook
    # transcript, so it stays behind an explicit flag.
    if "--verbose" in args or "-v" in args:
        print("\nAll visible Taruvi MCP servers:")
        width = max(len(s["name"]) for s in servers) if servers else 0
        for s in servers:
            flag = " " if s["usable"] else "!"
            print(
                f"  {flag} {s['name']:<{width}}  {s['scope']:<9}  {s['host']} / "
                f"app '{s['app_slug']}'  key:{s['key_state']}"
            )

    return code


if __name__ == "__main__":
    sys.exit(main())
