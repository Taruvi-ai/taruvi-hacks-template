#!/usr/bin/env python3
"""Sync Codex user prompt logs from ~/.codex/logs_2.sqlite to Langfuse ingestion API."""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sqlite3
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

DB_PATH = Path.home() / ".codex" / "logs_2.sqlite"
SYNC_IDS_PATH = Path(".codex") / "log" / "synced_prompt_ids.json"
DEBUG_LOG_PATH = Path(".codex") / "log" / "prompt_sync_debug.log"
CORRELATION_PATH = Path(".codex") / "log" / "codex_trace_correlation.json"
CODEX_CONFIG_PATH = Path(".codex") / "config.toml"
REQUEST_TIMEOUT_SEC = 10
PROMPT_PREVIEW_MAX = 4000
DEBUG_BODY_MAX = 6000


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def project_slug(root: Path) -> str:
    return root.name


def extract_app_slug_from_codex_config(config_path: Path) -> str | None:
    if not config_path.exists():
        return None
    try:
        text = config_path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return None

    section_match = re.search(
        r"(?ms)^\[mcp_servers\.taruvi\.http_headers\]\s*(.*?)(?:^\[|\Z)",
        text,
    )
    target = section_match.group(1) if section_match else text
    key_match = re.search(
        r'(?m)^\s*X-App-Slug\s*=\s*["\']([^"\']+)["\']\s*$',
        target,
    )
    if not key_match:
        return None
    value = key_match.group(1).strip()
    return value or None


def resolve_app_slug(root: Path) -> str:
    dotenv = parse_dotenv(root / ".env")
    for key in ("X_APP_SLUG", "APP_SLUG", "VITE_APP_SLUG"):
        value = str(dotenv.get(key) or "").strip()
        if value:
            return value
    config_value = extract_app_slug_from_codex_config(root / CODEX_CONFIG_PATH)
    if config_value:
        return config_value
    return project_slug(root)


def get_git_user_email(root: Path) -> str | None:
    try:
        result = subprocess.run(
            ["git", "-C", str(root), "config", "user.email"],
            capture_output=True,
            text=True,
            check=False,
            timeout=1,
        )
    except Exception:
        return None
    if result.returncode != 0:
        return None
    email = (result.stdout or "").strip()
    return email or None


def parse_dotenv(dotenv_path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not dotenv_path.exists():
        return values

    for raw in dotenv_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        if "=" not in line:
            continue
        key, val = line.split("=", 1)
        key = key.strip()
        val = val.strip().strip("\"'")
        if key:
            values[key] = val
    return values


def load_langfuse_config(root: Path) -> tuple[str | None, str | None, str | None]:
    dotenv = parse_dotenv(root / ".env")

    # Required precedence: project .env first, then process environment.
    public_key = dotenv.get("LANGFUSE_PUBLIC_KEY") or os.getenv("LANGFUSE_PUBLIC_KEY")
    secret_key = dotenv.get("LANGFUSE_SECRET_KEY") or os.getenv("LANGFUSE_SECRET_KEY")
    base_url = dotenv.get("LANGFUSE_BASE_URL") or os.getenv("LANGFUSE_BASE_URL")

    return public_key, secret_key, base_url


def normalize_ingestion_url(base_url: str) -> str:
    base = base_url.strip().rstrip("/")
    if base.endswith("/api/public"):
        return f"{base}/ingestion"
    if base.endswith("/api/public/ingestion"):
        return base
    return f"{base}/api/public/ingestion"


def load_synced_ids(path: Path) -> set[int]:
    if not path.exists():
        return set()
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return set()

    if isinstance(payload, list):
        return {int(x) for x in payload if isinstance(x, (int, str)) and str(x).isdigit()}

    if isinstance(payload, dict):
        raw_ids = payload.get("synced_ids", [])
        if isinstance(raw_ids, list):
            return {int(x) for x in raw_ids if isinstance(x, (int, str)) and str(x).isdigit()}
    return set()


def save_synced_ids(path: Path, ids: set[int]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "synced_ids": sorted(ids),
        "updated_at": now_iso(),
    }
    path.write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")


def load_correlation(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"updated_at": now_iso(), "latest_conversation_id": None, "conversations": {}}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"updated_at": now_iso(), "latest_conversation_id": None, "conversations": {}}

    if not isinstance(payload, dict):
        return {"updated_at": now_iso(), "latest_conversation_id": None, "conversations": {}}

    conversations = payload.get("conversations")
    if not isinstance(conversations, dict):
        conversations = {}

    return {
        "updated_at": str(payload.get("updated_at") or now_iso()),
        "latest_conversation_id": payload.get("latest_conversation_id"),
        "conversations": conversations,
    }


def save_correlation(path: Path, correlation: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    correlation["updated_at"] = now_iso()
    path.write_text(json.dumps(correlation, ensure_ascii=True, indent=2), encoding="utf-8")


def update_correlation(
    correlation: dict[str, Any],
    *,
    conversation_id: str,
    trace_id: str,
    prompt_preview: str,
    prompt_timestamp: str,
    user_email: str | None,
    model: str | None,
    project_slug_value: str,
    app_slug_value: str,
) -> None:
    conversations = correlation.setdefault("conversations", {})
    if not isinstance(conversations, dict):
        conversations = {}
        correlation["conversations"] = conversations

    conversations[conversation_id] = {
        "trace_id": trace_id,
        "latest_prompt_preview": prompt_preview,
        "latest_prompt_timestamp": prompt_timestamp,
        "user_email": user_email,
        "model": model,
        "project_slug": project_slug_value,
        "app_slug": app_slug_value,
        "updated_at": now_iso(),
    }
    correlation["latest_conversation_id"] = conversation_id


def append_debug_log(path: Path, record: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as fp:
        fp.write(json.dumps(record, ensure_ascii=True, separators=(",", ":")))
        fp.write("\n")


def extract_field(body: str, key: str) -> str | None:
    pattern = re.compile(rf"\b{re.escape(key)}=(?:\"([^\"]*)\"|(\S+))")
    match = pattern.search(body)
    if not match:
        return None
    return (match.group(1) or match.group(2) or "").strip() or None


def extract_prompt(body: str) -> str | None:
    # codex_otel.log_only contains a free-text prompt field with prompt_length=<N>.
    prompt_len: int | None = None
    len_match = re.search(r"\bprompt_length=(\d+)\b", body)
    if len_match:
        try:
            prompt_len = int(len_match.group(1))
        except ValueError:
            prompt_len = None

    marker = re.search(r"\bprompt=(.*?)\s+event\.timestamp=", body, flags=re.DOTALL)
    prompt: str | None = None
    if marker:
        prompt = marker.group(1).strip()
    else:
        fallback = re.search(r"\bprompt=(.*)$", body, flags=re.DOTALL)
        if fallback:
            prompt = fallback.group(1).strip()

    if prompt:
        if prompt.startswith('"') and prompt.endswith('"') and len(prompt) >= 2:
            prompt = prompt[1:-1]
        if prompt_len is not None and prompt_len >= 0 and len(prompt) >= prompt_len:
            prompt = prompt[:prompt_len]
        return prompt

    quoted = re.search(r'\bprompt="(.*?)"', body, flags=re.DOTALL)
    if quoted:
        prompt = quoted.group(1).strip()
        if prompt_len is not None and prompt_len >= 0 and len(prompt) >= prompt_len:
            prompt = prompt[:prompt_len]
        return prompt

    return None


def redact_secrets(prompt: str) -> str:
    text = prompt

    # Authorization and cookies headers.
    text = re.sub(r"(?im)^\s*authorization\s*:\s*[^\r\n]+", "Authorization: [REDACTED]", text)
    text = re.sub(r"(?im)^\s*cookie\s*:\s*[^\r\n]+", "Cookie: [REDACTED]", text)
    text = re.sub(r"(?im)^\s*set-cookie\s*:\s*[^\r\n]+", "Set-Cookie: [REDACTED]", text)

    # Token patterns.
    text = re.sub(r"(?i)\bBearer\s+[A-Za-z0-9\-._~+/]+=*", "Bearer [REDACTED]", text)
    text = re.sub(r"(?i)\bBasic\s+[A-Za-z0-9+/=]{8,}", "Basic [REDACTED]", text)
    text = re.sub(r"\bsk-lf-[A-Za-z0-9._\-]+\b", "[REDACTED]", text)

    # pk-lf-* redaction when prompt also contains secret/sk-lf context.
    if re.search(r"(?i)(\bsecret\b|sk-lf-)", text):
        text = re.sub(r"\bpk-lf-[A-Za-z0-9._\-]+\b", "[REDACTED]", text)

    # API key styles.
    text = re.sub(r"(?i)\bApi[- ]?Key\s+[A-Za-z0-9\-._~+/=]{6,}", "Api-Key [REDACTED]", text)
    text = re.sub(r"(?i)\bx-api-key\s*[:=]\s*[^\s\"'`,;]+", "x-api-key=[REDACTED]", text)

    # Generic sensitive assignments.
    def _sensitive_assignment(match: re.Match[str]) -> str:
        key = match.group(1)
        sep = match.group(2)
        return f"{key}{sep}[REDACTED]"

    text = re.sub(
        r"(?i)\b(api[_-]?key|password|passwd|token|secret|access[_-]?token|refresh[_-]?token|authorization|cookie)\b\s*([:=])\s*(?:\"[^\"]*\"|'[^']*'|[^\s,;]+)",
        _sensitive_assignment,
        text,
    )

    return text


def redact_for_log(value: str) -> str:
    return truncate_prompt_preview(redact_secrets(value))[:DEBUG_BODY_MAX]


def truncate_prompt_preview(prompt: str) -> str:
    if len(prompt) <= PROMPT_PREVIEW_MAX:
        return prompt
    return prompt[:PROMPT_PREVIEW_MAX]


def deterministic_trace_id(conversation_id: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"codex-conversation:{conversation_id}"))


def deterministic_span_id(log_row_id: int) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"codex-user-prompt-row:{log_row_id}"))


def build_record(log_row_id: int, body: str, root: Path) -> dict[str, Any] | None:
    prompt_raw = extract_prompt(body)
    conversation_id = extract_field(body, "conversation.id")
    event_timestamp = extract_field(body, "event.timestamp")

    if not prompt_raw or not conversation_id or not event_timestamp:
        return None

    user_email = extract_field(body, "user.email") or get_git_user_email(root)
    session_id = extract_field(body, "session.id") or conversation_id
    turn_id = extract_field(body, "turn.id") or str(log_row_id)
    model = extract_field(body, "model")
    app_version = extract_field(body, "app.version")
    originator = extract_field(body, "originator")
    terminal_type = extract_field(body, "terminal.type")

    prompt_preview = truncate_prompt_preview(redact_secrets(prompt_raw))
    trace_id = deterministic_trace_id(conversation_id)
    observation_id = deterministic_span_id(log_row_id)
    app_slug = resolve_app_slug(root)

    meta = {
        "conversation_id": conversation_id,
        "session_id": session_id,
        "turn_id": turn_id,
        "user_email": user_email,
        "project_slug": project_slug(root),
        "app_slug": app_slug,
        "project_path": str(root),
        "trace_source": "codex_otel_prompt_sync",
        "model": model,
        "started_at": event_timestamp,
        "current_stage": "user_prompt",
        "risk_level": "low",
        "app_version": app_version,
        "originator": originator,
        "terminal_type": terminal_type,
        "synced_at": now_iso(),
    }

    trace_event = {
        "type": "trace-create",
        "id": str(uuid.uuid4()),
        "timestamp": now_iso(),
        "body": {
            "id": trace_id,
            "timestamp": event_timestamp,
            "name": "codex_session",
            "sessionId": session_id,
            "metadata": meta,
        },
    }

    span_event = {
        "type": "span-create",
        "id": str(uuid.uuid4()),
        "timestamp": now_iso(),
        "body": {
            "id": observation_id,
            "traceId": trace_id,
            "name": "user_prompt",
            "startTime": event_timestamp,
            "endTime": event_timestamp,
            "input": {"prompt_preview": prompt_preview},
            "metadata": meta,
        },
    }

    return {
        "log_row_id": log_row_id,
        "conversation_id": conversation_id,
        "session_id": session_id,
        "turn_id": turn_id,
        "event_timestamp": event_timestamp,
        "trace_id": trace_id,
        "observation_id": observation_id,
        "user_email": user_email,
        "model": model,
        "project_slug": project_slug(root),
        "app_slug": app_slug,
        "event_types": [trace_event["type"], span_event["type"]],
        "prompt_preview": prompt_preview,
        "payload": {"batch": [trace_event, span_event]},
    }


def post_ingestion(
    ingestion_url: str, public_key: str, secret_key: str, payload: dict[str, Any]
) -> tuple[bool, int | None, str]:
    auth = base64.b64encode(f"{public_key}:{secret_key}".encode("utf-8")).decode("ascii")
    request = Request(
        ingestion_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Basic {auth}",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=REQUEST_TIMEOUT_SEC) as resp:
            status = getattr(resp, "status", 0)
            body = resp.read().decode("utf-8", errors="replace")
            ok = int(status) in (200, 201, 202, 207)
            return ok, int(status), body
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return False, int(exc.code), body
    except URLError as exc:
        return False, None, str(exc.reason)
    except TimeoutError:
        return False, None, "timeout"
    except Exception as exc:
        return False, None, f"{exc.__class__.__name__}: {exc}"


def query_prompt_rows(db_path: Path, limit: int | None) -> list[tuple[int, str]]:
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.cursor()
        if limit is None:
            rows = cur.execute(
                """
                SELECT id, feedback_log_body
                FROM logs
                WHERE target = ?
                  AND feedback_log_body IS NOT NULL
                  AND feedback_log_body LIKE '%: event.name="codex.user_prompt" %'
                ORDER BY id DESC
                """,
                ("codex_otel.log_only",),
            ).fetchall()
        else:
            rows = cur.execute(
                """
                SELECT id, feedback_log_body
                FROM logs
                WHERE target = ?
                  AND feedback_log_body IS NOT NULL
                  AND feedback_log_body LIKE '%: event.name="codex.user_prompt" %'
                ORDER BY id DESC
                LIMIT ?
                """,
                ("codex_otel.log_only", int(limit)),
            ).fetchall()
        return [(int(row[0]), str(row[1])) for row in rows]
    finally:
        conn.close()


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync Codex user prompts to Langfuse ingestion.")
    parser.add_argument("--dry-run", action="store_true", help="Print one parsed prompt record and skip ingestion.")
    parser.add_argument("--limit", type=int, default=None, help="Maximum number of prompt rows to process.")
    args = parser.parse_args(argv)
    if args.limit is not None and args.limit <= 0:
        parser.error("--limit must be a positive integer")
    return args


def main() -> int:
    args = parse_args(sys.argv[1:])
    root = project_root()
    sync_path = root / SYNC_IDS_PATH
    debug_path = root / DEBUG_LOG_PATH
    correlation_path = root / CORRELATION_PATH

    synced_prompts = 0
    skipped_existing = 0
    errors = 0

    public_key, secret_key, base_url = load_langfuse_config(root)
    if not public_key or not secret_key or not base_url:
        print("synced_prompts=0")
        print("skipped_existing=0")
        print("errors=1")
        print("debug_log=.codex/log/prompt_sync_debug.log")
        return 0

    if not DB_PATH.exists():
        print("synced_prompts=0")
        print("skipped_existing=0")
        print("errors=1")
        print("debug_log=.codex/log/prompt_sync_debug.log")
        return 0

    ingestion_url = normalize_ingestion_url(base_url)
    synced_ids = load_synced_ids(sync_path)
    correlation = load_correlation(correlation_path)

    try:
        rows = query_prompt_rows(DB_PATH, args.limit)
    except Exception:
        print("synced_prompts=0")
        print(f"skipped_existing={len(synced_ids)}")
        print("errors=1")
        print("debug_log=.codex/log/prompt_sync_debug.log")
        return 0

    if args.dry_run:
        dry_record: dict[str, Any] | None = None
        for log_row_id, body in rows:
            dry_record = build_record(log_row_id, body, root)
            if dry_record is not None:
                update_correlation(
                    correlation,
                    conversation_id=str(dry_record["conversation_id"]),
                    trace_id=str(dry_record["trace_id"]),
                    prompt_preview=str(dry_record["prompt_preview"]),
                    prompt_timestamp=str(dry_record["event_timestamp"]),
                    user_email=(
                        str(dry_record["user_email"])
                        if isinstance(dry_record.get("user_email"), str)
                        else None
                    ),
                    model=(
                        str(dry_record["model"])
                        if isinstance(dry_record.get("model"), str)
                        else None
                    ),
                    project_slug_value=str(dry_record["project_slug"]),
                    app_slug_value=str(dry_record["app_slug"]),
                )
                try:
                    save_correlation(correlation_path, correlation)
                except Exception:
                    pass
                break
        print(
            json.dumps(
                {
                    "log_row_id": dry_record["log_row_id"] if dry_record else None,
                    "conversation_id": dry_record["conversation_id"] if dry_record else None,
                    "event_timestamp": dry_record["event_timestamp"] if dry_record else None,
                    "trace_id": dry_record["trace_id"] if dry_record else None,
                    "observation_id": dry_record["observation_id"] if dry_record else None,
                    "event_types": dry_record["event_types"] if dry_record else None,
                    "prompt_preview": dry_record["prompt_preview"] if dry_record else None,
                },
                ensure_ascii=True,
            )
        )
        return 0

    for log_row_id, body in rows:
        record = build_record(log_row_id, body, root)
        if record is None:
            errors += 1
            continue

        update_correlation(
            correlation,
            conversation_id=str(record["conversation_id"]),
            trace_id=str(record["trace_id"]),
            prompt_preview=str(record["prompt_preview"]),
            prompt_timestamp=str(record["event_timestamp"]),
            user_email=(str(record["user_email"]) if isinstance(record.get("user_email"), str) else None),
            model=(str(record["model"]) if isinstance(record.get("model"), str) else None),
            project_slug_value=str(record["project_slug"]),
            app_slug_value=str(record["app_slug"]),
        )
        try:
            save_correlation(correlation_path, correlation)
        except Exception:
            errors += 1

        if log_row_id in synced_ids:
            skipped_existing += 1
            continue

        ok, status_code, response_body = post_ingestion(
            ingestion_url, public_key, secret_key, record["payload"]
        )
        if ok:
            synced_prompts += 1
            synced_ids.add(int(record["log_row_id"]))
            try:
                save_synced_ids(sync_path, synced_ids)
            except Exception:
                errors += 1
        else:
            errors += 1
            try:
                append_debug_log(
                    debug_path,
                    {
                        "timestamp": now_iso(),
                        "status_code": status_code,
                        "response_body": redact_for_log(response_body),
                        "request_event_types": record["event_types"],
                        "trace_id": record["trace_id"],
                        "observation_id": record["observation_id"],
                    },
                )
            except Exception:
                pass

    print(f"synced_prompts={synced_prompts}")
    print(f"skipped_existing={skipped_existing}")
    print(f"errors={errors}")
    print("debug_log=.codex/log/prompt_sync_debug.log")
    return 0


if __name__ == "__main__":
    sys.exit(main())
