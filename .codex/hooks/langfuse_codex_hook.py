#!/usr/bin/env python3
import hashlib
import json
import os
import re
import subprocess
import sys
import traceback
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from requests.auth import HTTPBasicAuth

MAX_TEXT_LEN = 1200
PREVIEW_TEXT_LEN = 2000
MAX_LIST_ITEMS = 25
MAX_DICT_ITEMS = 40
MAX_DEPTH = 6
REQUEST_TIMEOUT_SEC = 4
CORRELATION_PATH = Path(".codex") / "log" / "codex_trace_correlation.json"
CORRELATION_LOOKBACK_MINUTES = 10
CODEX_CONFIG_PATH = Path(".codex") / "config.toml"
APP_SLUG_KEYS = (
    "TARUVI_APP_SLUG",
    "VITE_TARUVI_APP_SLUG",
    "X_APP_SLUG",
    "APP_SLUG",
    "VITE_APP_SLUG",
)

SPAN_NAMES = [
    "user_prompt",
    "assistant_response",
    "skill_selection",
    "subagent_selection",
    "mcp_tool_call",
    "hook_execution",
    "bash_command",
    "file_change",
    "qa_check",
    "final_summary",
]

SCORE_NAMES = [
    "agents_md_read",
    "spec_writer_ran",
    "skill_selected",
    "subagent_selected",
    "mcp_used",
    "qa_passed",
    "repeated_node_count",
    "unnecessary_rerun_count",
    "final_quality",
]

SENSITIVE_KEY_RE = re.compile(
    r"(secret|token|api[_-]?key|password|authorization|cookie|credential|passwd)",
    re.IGNORECASE,
)
SENSITIVE_VALUE_PATTERNS = [
    re.compile(r"\b(sk|pk)-lf-[A-Za-z0-9_\-]{8,}\b", re.IGNORECASE),
    re.compile(r"\bBearer\s+[A-Za-z0-9\-._=]{12,}\b", re.IGNORECASE),
    re.compile(r"\bApi[- ]?Key\s+[A-Za-z0-9\-._=]{12,}\b", re.IGNORECASE),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(r"\bghp_[A-Za-z0-9]{20,}\b"),
]

KNOWN_SKILLS = [
    "taruvi-app-developer",
    "taruvi-refine-providers",
]

SKILL_PATH_RE = re.compile(r"(?:\.codex|\.agents)?/skills/([A-Za-z0-9_.-]+)", re.IGNORECASE)
SKILL_JSON_RE = re.compile(r"""["'](?:selected_skill|skill)["']\s*:\s*["']([^"']+)["']""", re.IGNORECASE)
SKILL_PHRASE_RE = re.compile(r"\busing\s+skill\s+([A-Za-z0-9_.-]+)", re.IGNORECASE)

# Quick test payload example for skill extraction validation.
SKILL_EXTRACTION_TEST_PAYLOAD = {
    "hook_event_name": "PreToolUse",
    "tool_name": "Bash",
    "tool_input": {"command": "cat .codex/skills/taruvi-app-developer/SKILL.md"},
}


def now_iso() -> str:
    return (
        datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    )


def short_print(message: str) -> None:
    # Keep function for compatibility; route all debug output to file instead of stdout.
    debug_log(project_root(), f"langfuse: {message}")


def debug_log(root: Path, message: str) -> None:
    try:
        log_path = root / ".codex" / "log" / "langfuse_hook_debug.log"
        log_path.parent.mkdir(parents=True, exist_ok=True)
        with log_path.open("a", encoding="utf-8") as fp:
            fp.write(f"{now_iso()} {message}\n")
    except Exception:
        # Never fail hook execution because debug logging failed.
        pass


def emit_stop_approval_json() -> None:
    # Codex Stop hooks require strict JSON output.
    sys.stdout.write(json.dumps({"continue": True}, ensure_ascii=True, separators=(",", ":")))
    sys.stdout.flush()


def project_root() -> Path:
    # Script lives at <project>/.codex/hooks/langfuse_codex_hook.py
    return Path(__file__).resolve().parents[2]


def project_slug(root: Path) -> str:
    return root.name


def is_placeholder_value(value: str) -> bool:
    text = value.strip()
    return not text or (text.startswith("<") and text.endswith(">"))


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
    return None if is_placeholder_value(value) else value


def resolve_app_slug(root: Path) -> str:
    dotenv_local = parse_dotenv(root / ".env.local")
    dotenv = parse_dotenv(root / ".env")
    for source in (dotenv_local, dotenv, os.environ):
        for key in APP_SLUG_KEYS:
            value = str(source.get(key) or "").strip()
            if not is_placeholder_value(value):
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
    result: dict[str, str] = {}
    if not dotenv_path.exists():
        return result

    for raw in dotenv_path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'\"")
        if key:
            result[key] = value
    return result


def get_env_config(root: Path) -> tuple[str | None, str | None, str | None]:
    dotenv = parse_dotenv(root / ".env")
    public_key = os.getenv("LANGFUSE_PUBLIC_KEY") or dotenv.get("LANGFUSE_PUBLIC_KEY")
    secret_key = os.getenv("LANGFUSE_SECRET_KEY") or dotenv.get("LANGFUSE_SECRET_KEY")
    base_url = os.getenv("LANGFUSE_BASE_URL") or dotenv.get("LANGFUSE_BASE_URL")
    return public_key, secret_key, base_url


def normalize_base_url(base_url: str) -> str:
    base = base_url.strip().rstrip("/")
    if base.endswith("/api/public"):
        return base
    return f"{base}/api/public"


def truncate_string(value: str, limit: int = MAX_TEXT_LEN) -> str:
    if len(value) <= limit:
        return value
    removed = len(value) - limit
    return f"{value[:limit]}...[truncated:{removed}]"


def redact_string(value: str) -> str:
    redacted = value
    for pattern in SENSITIVE_VALUE_PATTERNS:
        redacted = pattern.sub("[REDACTED]", redacted)
    return redacted


def sanitize(value: Any, depth: int = 0, text_limit: int = MAX_TEXT_LEN) -> Any:
    if depth > MAX_DEPTH:
        return "[TRUNCATED_DEPTH]"

    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for idx, (k, v) in enumerate(value.items()):
            if idx >= MAX_DICT_ITEMS:
                out["__truncated_keys__"] = len(value) - MAX_DICT_ITEMS
                break
            key = str(k)
            if SENSITIVE_KEY_RE.search(key):
                out[key] = "[REDACTED]"
            else:
                out[key] = sanitize(v, depth + 1, text_limit=text_limit)
        return out

    if isinstance(value, list):
        items = [sanitize(v, depth + 1, text_limit=text_limit) for v in value[:MAX_LIST_ITEMS]]
        if len(value) > MAX_LIST_ITEMS:
            items.append(f"[TRUNCATED_ITEMS:{len(value) - MAX_LIST_ITEMS}]")
        return items

    if isinstance(value, str):
        return truncate_string(redact_string(value), limit=text_limit)

    if isinstance(value, (int, float, bool)) or value is None:
        return value

    return truncate_string(redact_string(str(value)), limit=text_limit)


def sanitize_preview_text(value: str) -> str:
    return truncate_string(redact_string(value), limit=PREVIEW_TEXT_LEN)


def extract_text_candidate(value: Any) -> str | None:
    if isinstance(value, str):
        text = value.strip()
        return text if text else None

    if isinstance(value, list):
        parts: list[str] = []
        for item in value:
            text = extract_text_candidate(item)
            if text:
                parts.append(text)
        if not parts:
            return None
        return "\n".join(parts)

    if isinstance(value, dict):
        # Common OpenAI/Codex content payloads can be plain text or typed content blocks.
        if value.get("type") == "text" and isinstance(value.get("text"), str):
            text = value["text"].strip()
            return text if text else None

        for key in (
            "content",
            "text",
            "message",
            "prompt",
            "input",
            "output",
            "response",
            "assistant_response",
            "final_response",
            "last_assistant_message",
        ):
            if key in value:
                text = extract_text_candidate(value.get(key))
                if text:
                    return text
    return None


def extract_prompt_and_response(payload: dict[str, Any]) -> tuple[str | None, str | None]:
    user_prompt: str | None = None
    assistant_response: str | None = None

    messages = payload.get("messages")
    if isinstance(messages, list):
        for msg in reversed(messages):
            if not isinstance(msg, dict):
                continue
            role = str(msg.get("role") or msg.get("author") or "").strip().lower()
            message_text = extract_text_candidate(msg)
            if role in {"assistant", "model"} and not assistant_response and message_text:
                assistant_response = message_text
            elif role in {"user", "human"} and not user_prompt and message_text:
                user_prompt = message_text
            if user_prompt and assistant_response:
                break

    if not user_prompt:
        for key in ("user_prompt", "prompt", "input", "user_input", "last_user_message"):
            if key in payload:
                text = extract_text_candidate(payload.get(key))
                if text:
                    user_prompt = text
                    break

    if not assistant_response:
        for key in (
            "assistant_response",
            "final_response",
            "response",
            "output",
            "last_assistant_message",
        ):
            if key in payload:
                text = extract_text_candidate(payload.get(key))
                if text:
                    assistant_response = text
                    break

    if user_prompt:
        user_prompt = sanitize_preview_text(user_prompt)
    if assistant_response:
        assistant_response = sanitize_preview_text(assistant_response)
    return user_prompt, assistant_response


def normalize_skill_name(value: str) -> str | None:
    text = value.strip().strip("\"'`")
    if not text:
        return None
    text = text.replace("\\", "/")

    path_match = SKILL_PATH_RE.search(text)
    if path_match:
        text = path_match.group(1)

    text = text.strip().strip("/").split("/")[0]
    text = re.sub(r"[.,;:)\]}]+$", "", text).strip()
    if not text:
        return None

    if not re.fullmatch(r"[A-Za-z0-9_.-]+", text):
        return None
    return text.lower()


def collect_skill_from_structure(value: Any, source: str, out: list[dict[str, Any]]) -> None:
    if isinstance(value, dict):
        for key, inner in value.items():
            key_str = str(key).strip().lower()
            if key_str == "selected_skill":
                text = extract_text_candidate(inner)
                if text:
                    skill = normalize_skill_name(text)
                    if skill:
                        out.append(
                            {
                                "skill": skill,
                                "detected_from": f"{source}.selected_skill",
                                "confidence": 1.0,
                            }
                        )
            elif key_str == "skill":
                text = extract_text_candidate(inner)
                if text:
                    skill = normalize_skill_name(text)
                    if skill:
                        out.append(
                            {
                                "skill": skill,
                                "detected_from": f"{source}.skill",
                                "confidence": 0.95,
                            }
                        )
            collect_skill_from_structure(inner, source, out)
        return

    if isinstance(value, list):
        for item in value:
            collect_skill_from_structure(item, source, out)


def collect_skill_from_text(text: str, source: str, out: list[dict[str, Any]]) -> None:
    if not text:
        return

    for match in SKILL_PATH_RE.finditer(text):
        skill = normalize_skill_name(match.group(1))
        if skill:
            out.append({"skill": skill, "detected_from": f"{source}.path", "confidence": 0.9})

    for match in SKILL_JSON_RE.finditer(text):
        skill = normalize_skill_name(match.group(1))
        if skill:
            key = "selected_skill" if "selected_skill" in match.group(0).lower() else "skill"
            conf = 1.0 if key == "selected_skill" else 0.95
            out.append({"skill": skill, "detected_from": f"{source}.{key}", "confidence": conf})

    for match in SKILL_PHRASE_RE.finditer(text):
        skill = normalize_skill_name(match.group(1))
        if skill:
            out.append({"skill": skill, "detected_from": f"{source}.phrase", "confidence": 0.85})


def detect_selected_skill(
    payload: dict[str, Any],
    raw_payload_text: str,
    tool_name: str,
    tool_input: Any,
    tool_response: Any,
) -> dict[str, Any]:
    hits: list[dict[str, Any]] = []

    collect_skill_from_structure(payload, "payload", hits)
    collect_skill_from_structure(tool_input, "tool_input", hits)
    collect_skill_from_structure(tool_response, "tool_response", hits)

    collect_skill_from_text(raw_payload_text, "raw_payload_text", hits)
    collect_skill_from_text(json.dumps(payload, ensure_ascii=True, default=str), "payload_text", hits)
    collect_skill_from_text(str(tool_name or ""), "tool_name", hits)

    if isinstance(tool_input, str):
        collect_skill_from_text(tool_input, "tool_input_text", hits)
    elif tool_input is not None:
        collect_skill_from_text(json.dumps(tool_input, ensure_ascii=True, default=str), "tool_input_text", hits)

    if isinstance(tool_response, str):
        collect_skill_from_text(tool_response, "tool_response_text", hits)
    elif tool_response is not None:
        collect_skill_from_text(
            json.dumps(tool_response, ensure_ascii=True, default=str),
            "tool_response_text",
            hits,
        )

    for known_skill in KNOWN_SKILLS:
        if known_skill in raw_payload_text.lower():
            hits.append(
                {
                    "skill": known_skill,
                    "detected_from": "raw_payload_text.known_skill_match",
                    "confidence": 0.92,
                }
            )

    dedup: dict[str, dict[str, Any]] = {}
    for hit in hits:
        skill = str(hit.get("skill") or "").strip().lower()
        if not skill:
            continue
        current = dedup.get(skill)
        if current is None or float(hit.get("confidence", 0.0)) > float(current.get("confidence", 0.0)):
            dedup[skill] = {
                "selected_skill": skill,
                "detected_from": str(hit.get("detected_from") or "unknown"),
                "confidence": float(hit.get("confidence", 0.0)),
            }

    available_skills = sorted(set(KNOWN_SKILLS) | set(dedup.keys()))
    if not dedup:
        return {
            "selected_skill": None,
            "available_skills": available_skills,
            "detected_from": "none",
            "confidence": 0.0,
            "skill_selected": False,
        }

    best = max(dedup.values(), key=lambda item: float(item.get("confidence", 0.0)))
    selected_skill = str(best.get("selected_skill") or "")
    confidence = float(best.get("confidence", 0.0))
    if selected_skill in KNOWN_SKILLS and confidence < 0.9:
        confidence = 0.9

    return {
        "selected_skill": selected_skill,
        "available_skills": available_skills,
        "detected_from": str(best.get("detected_from") or "unknown"),
        "confidence": round(max(0.0, min(1.0, confidence)), 3),
        "skill_selected": True,
    }


def state_dir(root: Path) -> Path:
    return root / ".codex" / "log" / "langfuse_sessions"


def safe_session_filename(session_id: str) -> str:
    digest = hashlib.sha256(session_id.encode("utf-8")).hexdigest()[:24]
    return f"{digest}.json"


def initial_state(session_id: str) -> dict[str, Any]:
    started_at = now_iso()
    return {
        "session_id": session_id,
        "trace_id": str(uuid.uuid5(uuid.NAMESPACE_URL, f"codex-session:{session_id}")),
        "trace_created": False,
        "started_at": started_at,
        "updated_at": now_iso(),
        "last_node": "",
        "command_counts": {},
        "emitted_spans": [],
        "mcp_tools_used": [],
        "files_changed": [],
        "selected_subagent": None,
        "blocked_reason": None,
        "metrics": {
            "agents_md_read": 0,
            "spec_writer_ran": 0,
            "skill_selected": 0,
            "subagent_selected": 0,
            "mcp_used": 0,
            "qa_passed": 0,
            "repeated_node_count": 0,
            "unnecessary_rerun_count": 0,
            "final_quality": 0,
        },
        "user_prompt_available": False,
        "assistant_response_available": False,
        "prompt_preview": "",
        "response_preview": "",
        "selected_skill": None,
        "skill_selected": False,
        "trace_id_source": "session_fallback",
        "conversation_id": None,
        "prompt_linked": False,
        "latest_prompt_preview": None,
    }


def load_state(root: Path, session_id: str) -> tuple[dict[str, Any], Path]:
    folder = state_dir(root)
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / safe_session_filename(session_id)
    if not path.exists():
        return initial_state(session_id), path
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return initial_state(session_id), path
        return data, path
    except Exception:
        return initial_state(session_id), path


def save_state(path: Path, state: dict[str, Any]) -> None:
    state["updated_at"] = now_iso()
    path.write_text(json.dumps(state, ensure_ascii=True, indent=2), encoding="utf-8")


def hash_command(command: str) -> str:
    return hashlib.sha256(command.encode("utf-8")).hexdigest()[:16]


def get_command_from_payload(payload: dict[str, Any]) -> str:
    tool_input = payload.get("tool_input")
    if isinstance(tool_input, dict):
        command = tool_input.get("command")
        if isinstance(command, str):
            return command
    command = payload.get("command")
    if isinstance(command, str):
        return command
    return ""


def make_event_envelope(event_type: str, body: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": event_type,
        "id": str(uuid.uuid4()),
        "timestamp": now_iso(),
        "body": body,
    }


def make_span_event(
    trace_id: str,
    name: str,
    meta: dict[str, Any],
    input_value: Any = None,
    output_value: Any = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "traceId": trace_id,
        "name": name,
        "startTime": now_iso(),
        "endTime": now_iso(),
        "metadata": meta,
    }
    if input_value is not None:
        body["input"] = input_value
    if output_value is not None:
        body["output"] = output_value
    return make_event_envelope("span-create", body)


def extract_payload_conversation_id(payload: dict[str, Any]) -> str | None:
    for key in ("conversation_id", "conversationId"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    conversation = payload.get("conversation")
    if isinstance(conversation, dict):
        value = conversation.get("id")
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def parse_iso8601(value: str | None) -> datetime | None:
    if not isinstance(value, str) or not value.strip():
        return None
    text = value.strip()
    if text.endswith("Z"):
        text = f"{text[:-1]}+00:00"
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def load_trace_correlation(root: Path) -> dict[str, Any]:
    path = root / CORRELATION_PATH
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


def deterministic_session_trace_id(session_id: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"codex-session:{session_id}"))


def resolve_trace_from_correlation(
    *,
    session_id: str,
    payload_conversation_id: str | None,
    correlation: dict[str, Any],
) -> dict[str, Any]:
    conversations = correlation.get("conversations")
    if not isinstance(conversations, dict):
        conversations = {}

    def _entry_for(conversation_id: str | None) -> tuple[str | None, dict[str, Any] | None]:
        if not conversation_id:
            return None, None
        entry = conversations.get(conversation_id)
        if isinstance(entry, dict):
            return conversation_id, entry
        return None, None

    matched_conversation_id: str | None = None
    matched_entry: dict[str, Any] | None = None

    # 1) session id can equal conversation id. This must win when present.
    matched_conversation_id, matched_entry = _entry_for(session_id)

    # 2) payload conversation id
    if matched_entry is None:
        matched_conversation_id, matched_entry = _entry_for(payload_conversation_id)

    # 3) latest recent conversation
    if matched_entry is None:
        latest_id = correlation.get("latest_conversation_id")
        latest_entry = conversations.get(latest_id) if isinstance(latest_id, str) else None
        if isinstance(latest_entry, dict):
            ts = parse_iso8601(str(latest_entry.get("latest_prompt_timestamp") or ""))
            if ts is not None:
                now_dt = datetime.now(timezone.utc)
                ts_utc = ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
                age_sec = (now_dt - ts_utc).total_seconds()
                if 0 <= age_sec <= CORRELATION_LOOKBACK_MINUTES * 60:
                    matched_conversation_id = str(latest_id)
                    matched_entry = latest_entry

    if matched_entry is not None:
        trace_id = str(matched_entry.get("trace_id") or "").strip()
        if not trace_id and matched_conversation_id:
            trace_id = str(
                uuid.uuid5(uuid.NAMESPACE_URL, f"codex-conversation:{matched_conversation_id}")
            )
        return {
            "trace_id": trace_id,
            "conversation_id": matched_conversation_id or payload_conversation_id or session_id,
            "trace_id_source": "conversation_correlation",
            "prompt_linked": True,
            "latest_prompt_preview": matched_entry.get("latest_prompt_preview"),
        }

    fallback_conversation_id = payload_conversation_id or session_id
    return {
        "trace_id": deterministic_session_trace_id(session_id),
        "conversation_id": fallback_conversation_id,
        "trace_id_source": "session_fallback",
        "prompt_linked": False,
        "latest_prompt_preview": None,
    }


def apply_trace_correlation_migration(
    *,
    state: dict[str, Any],
    state_path: Path,
    session_id: str,
    trace_context: dict[str, Any],
    root: Path,
) -> None:
    trace_id = str(trace_context.get("trace_id") or "")
    trace_id_source = str(trace_context.get("trace_id_source") or "session_fallback")
    conversation_id = str(trace_context.get("conversation_id") or session_id)
    prompt_linked = bool(trace_context.get("prompt_linked"))
    latest_prompt_preview = trace_context.get("latest_prompt_preview")

    previous_trace_id = str(state.get("trace_id") or "")
    previous_source = str(state.get("trace_id_source") or "")
    previous_prompt_linked = bool(state.get("prompt_linked"))

    # Correlated trace id must override any previous fallback state.
    state["trace_id"] = trace_id
    state["trace_id_source"] = trace_id_source
    state["conversation_id"] = conversation_id
    state["prompt_linked"] = prompt_linked
    state["latest_prompt_preview"] = latest_prompt_preview

    migrated = (
        trace_id_source == "conversation_correlation"
        and previous_source == "session_fallback"
        and (previous_trace_id != trace_id or not previous_prompt_linked)
    )

    if previous_trace_id and previous_trace_id != trace_id:
        state["trace_created"] = False

    if migrated:
        try:
            save_state(state_path, state)
            debug_log(
                root,
                "state_migrated_to_conversation_correlation "
                f"(session_id={session_id}, old_trace_id={previous_trace_id}, new_trace_id={trace_id})",
            )
        except Exception as exc:
            debug_log(root, f"state_migration_error ({exc.__class__.__name__}: {exc})")


def extract_selected_subagent(payload: dict[str, Any], payload_text: str) -> str | None:
    for key in ("selected_subagent", "subagent", "subagent_type", "agent_type"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    for regex in (
        re.compile(r'"selected_subagent"\s*:\s*"([^"]+)"', re.IGNORECASE),
        re.compile(r'"subagent_type"\s*:\s*"([^"]+)"', re.IGNORECASE),
        re.compile(r"\bsubagent_type=([A-Za-z0-9_.-]+)\b", re.IGNORECASE),
    ):
        match = regex.search(payload_text)
        if match:
            value = (match.group(1) or "").strip()
            if value:
                return value
    return None


def extract_changed_files(tool_name: str, tool_input: Any) -> list[str]:
    changed: list[str] = []

    if tool_name == "apply_patch" and isinstance(tool_input, str):
        for line in tool_input.splitlines():
            for prefix in ("*** Update File: ", "*** Add File: ", "*** Delete File: "):
                if line.startswith(prefix):
                    path = line[len(prefix) :].strip()
                    if path:
                        changed.append(path)
                    break
        return changed

    if isinstance(tool_input, dict):
        for key in ("file_path", "path", "filepath", "filename"):
            value = tool_input.get(key)
            if isinstance(value, str) and value.strip():
                changed.append(value.strip())

    return changed


def upsert_unique_list(state: dict[str, Any], key: str, values: list[str]) -> None:
    existing_raw = state.get(key)
    existing = set(existing_raw) if isinstance(existing_raw, list) else set()
    for value in values:
        if value:
            existing.add(value)
    state[key] = sorted(existing)


def compute_risk_level(state: dict[str, Any]) -> str:
    metrics = state.get("metrics", {})
    blocked_reason = str(state.get("blocked_reason") or "").strip()
    repeated_count = int(metrics.get("repeated_node_count", 0))
    rerun_count = int(metrics.get("unnecessary_rerun_count", 0))

    if blocked_reason or rerun_count >= 4 or repeated_count >= 6:
        return "high"
    if rerun_count >= 2 or repeated_count >= 3:
        return "medium"
    return "low"


def infer_current_stage(hook_event: str, tool_name: str) -> str:
    if hook_event == "Stop":
        return "final_summary"
    if tool_name.startswith("mcp__"):
        return "mcp_tool_call"
    if tool_name == "Bash":
        return "bash_command"
    if tool_name in ("apply_patch", "Edit", "Write"):
        return "file_change"
    if hook_event in ("PreToolUse", "PostToolUse"):
        return "hook_execution"
    return "unknown"


def build_common_metadata(
    *,
    root: Path,
    payload: dict[str, Any],
    state: dict[str, Any],
    session_id: str,
    conversation_id: str,
    user_email: str | None,
    trace_source: str,
    trace_id_source: str,
    app_slug: str,
    current_stage: str,
    risk_level: str,
) -> dict[str, Any]:
    started_at = str(state.get("started_at") or now_iso())
    return {
        "conversation_id": conversation_id,
        "session_id": session_id,
        "turn_id": payload.get("turn_id"),
        "user_email": user_email,
        "project_slug": project_slug(root),
        "app_slug": app_slug,
        "project_path": str(root),
        "trace_source": trace_source,
        "trace_id_source": trace_id_source,
        "model": payload.get("model"),
        "started_at": started_at,
        "current_stage": current_stage,
        "risk_level": risk_level,
    }


def make_score_event(trace_id: str, name: str, value: int | float) -> dict[str, Any]:
    body = {
        "id": str(uuid.uuid4()),
        "traceId": trace_id,
        "name": name,
        "value": value,
        "dataType": "NUMERIC",
    }
    return make_event_envelope("score-create", body)


def mark_span_emitted(state: dict[str, Any], span_name: str) -> None:
    emitted = state.get("emitted_spans", [])
    if span_name not in emitted:
        emitted.append(span_name)
    state["emitted_spans"] = emitted


def add_span(
    events: list[dict[str, Any]],
    state: dict[str, Any],
    trace_id: str,
    span_name: str,
    payload: dict[str, Any],
    common_meta: dict[str, Any],
    input_value: Any = None,
    output_value: Any = None,
    extra_meta: dict[str, Any] | None = None,
    text_limit: int = MAX_TEXT_LEN,
) -> None:
    meta = {
        "hook_event_name": payload.get("hook_event_name"),
        "tool_name": payload.get("tool_name"),
        "turn_id": payload.get("turn_id"),
    }
    meta.update(common_meta)
    if extra_meta:
        meta.update(extra_meta)
    events.append(
        make_span_event(
            trace_id=trace_id,
            name=span_name,
            meta=sanitize(meta, text_limit=text_limit),
            input_value=sanitize(input_value, text_limit=text_limit) if input_value is not None else None,
            output_value=sanitize(output_value, text_limit=text_limit) if output_value is not None else None,
        )
    )
    mark_span_emitted(state, span_name)


def contains_any(value: str, patterns: list[str]) -> bool:
    low = value.lower()
    return any(p in low for p in patterns)


def build_final_summary_output(
    *,
    app_slug: str,
    conversation_id: str,
    trace_id_source: str,
    prompt_linked: bool,
    latest_prompt_preview: Any,
    stop_hook_active: Any,
    risk_level: str,
    blocked_reason: Any,
    selected_skill: Any,
    selected_subagent: Any,
    mcp_tools_used: list[str],
    files_changed: list[str],
    qa_passed: bool,
    final_quality: int,
    repeated_node_count: int,
    unnecessary_rerun_count: int,
) -> dict[str, Any]:
    return {
        "app_slug": app_slug,
        "current_stage": "final_summary",
        "risk_level": risk_level,
        "blocked_reason": blocked_reason,
        "selected_skill": selected_skill,
        "selected_subagent": selected_subagent,
        "mcp_tools_used": mcp_tools_used,
        "files_changed": files_changed,
        "qa_passed": qa_passed,
        "final_quality": final_quality,
        "repeated_node_count": repeated_node_count,
        "unnecessary_rerun_count": unnecessary_rerun_count,
        "conversation_id": conversation_id,
        "trace_id_source": trace_id_source,
        "prompt_linked": prompt_linked,
        "latest_prompt_preview": latest_prompt_preview,
        "stop_hook_active": stop_hook_active,
    }


def try_mark_metric(state: dict[str, Any], metric: str, value: int) -> None:
    metrics = state.setdefault("metrics", {})
    metrics[metric] = value


def update_rerun_metrics(state: dict[str, Any], node_name: str, command: str) -> None:
    metrics = state.setdefault("metrics", {})

    last_node = state.get("last_node", "")
    if last_node and last_node == node_name:
        metrics["repeated_node_count"] = int(metrics.get("repeated_node_count", 0)) + 1
    state["last_node"] = node_name

    if command:
        cmd_key = hash_command(command)
        command_counts = state.setdefault("command_counts", {})
        count = int(command_counts.get(cmd_key, 0)) + 1
        command_counts[cmd_key] = count
        if count > 1:
            metrics["unnecessary_rerun_count"] = int(
                metrics.get("unnecessary_rerun_count", 0)
            ) + 1


def compute_final_quality(state: dict[str, Any]) -> int:
    metrics = state.get("metrics", {})
    score = 40
    score += 10 if metrics.get("agents_md_read") else 0
    score += 10 if metrics.get("spec_writer_ran") else 0
    score += 10 if metrics.get("skill_selected") else 0
    score += 10 if metrics.get("subagent_selected") else 0
    score += 10 if metrics.get("mcp_used") else 0
    score += 10 if metrics.get("qa_passed") else 0
    score -= min(20, int(metrics.get("repeated_node_count", 0)) * 2)
    score -= min(20, int(metrics.get("unnecessary_rerun_count", 0)) * 4)
    return max(0, min(100, score))


def send_batch(
    base_public_url: str,
    public_key: str,
    secret_key: str,
    batch: list[dict[str, Any]],
) -> tuple[bool, str]:
    if not batch:
        return True, "no-op"

    payload = {"batch": batch}
    url = f"{base_public_url}/ingestion"
    headers = {"Content-Type": "application/json"}
    try:
        resp = requests.post(
            url,
            json=payload,
            headers=headers,
            auth=HTTPBasicAuth(public_key, secret_key),
            timeout=REQUEST_TIMEOUT_SEC,
        )
    except requests.RequestException as exc:
        return False, f"network_error:{exc.__class__.__name__}"

    if resp.status_code in (200, 201, 202, 207):
        return True, f"ok:{resp.status_code}"
    return False, f"http_{resp.status_code}"


def main() -> int:
    root = project_root()
    raw = sys.stdin.read()
    payload: dict[str, Any] | None = None
    hook_event = "unknown"

    try:
        if raw.strip():
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                payload = parsed
                hook_event = str(payload.get("hook_event_name") or "unknown")
    except Exception:
        payload = None
        hook_event = "unknown"

    if hook_event == "Stop":
        emit_stop_approval_json()

    try:
        if not raw.strip():
            debug_log(root, "skipped (empty stdin)")
            return 0

        if payload is None:
            debug_log(root, "error (invalid json or json object expected)")
            return 0

        public_key, secret_key, base_url = get_env_config(root)
        if not public_key or not secret_key or not base_url:
            debug_log(root, "skipped (missing langfuse config)")
            return 0

        session_id = str(payload.get("session_id") or "unknown-session")
        state, state_path = load_state(root, session_id)
        if not state.get("started_at"):
            state["started_at"] = now_iso()

        tool_name = str(payload.get("tool_name") or "")
        tool_input = payload.get("tool_input")
        tool_response = payload.get("tool_response")
        command = get_command_from_payload(payload)
        app_slug = resolve_app_slug(root)
        payload_conversation_id = extract_payload_conversation_id(payload)
        correlation = load_trace_correlation(root)
        trace_context = resolve_trace_from_correlation(
            session_id=session_id,
            payload_conversation_id=payload_conversation_id,
            correlation=correlation,
        )
        apply_trace_correlation_migration(
            state=state,
            state_path=state_path,
            session_id=session_id,
            trace_context=trace_context,
            root=root,
        )
        trace_id = str(state.get("trace_id") or "")
        conversation_id = str(trace_context["conversation_id"] or session_id)
        trace_id_source = str(trace_context["trace_id_source"])
        prompt_linked = bool(trace_context["prompt_linked"])
        latest_prompt_preview = trace_context["latest_prompt_preview"]
        git_email = get_git_user_email(root)
        payload_email = payload.get("user_email")
        user_email = (
            git_email
            or (payload_email.strip() if isinstance(payload_email, str) and payload_email.strip() else None)
        )
        prompt_preview, response_preview = extract_prompt_and_response(payload)
        user_prompt_available = bool(prompt_preview)
        assistant_response_available = bool(response_preview)
        skill_info = detect_selected_skill(payload, raw, tool_name, tool_input, tool_response)
        selected_skill = skill_info.get("selected_skill")
        skill_selected = bool(skill_info.get("skill_selected"))
        payload_text = json.dumps(sanitize(payload), ensure_ascii=True)
        detected_subagent = extract_selected_subagent(payload, payload_text)
        if detected_subagent:
            state["selected_subagent"] = detected_subagent

        blocked_reason_value = payload.get("blocked_reason")
        if isinstance(blocked_reason_value, str) and blocked_reason_value.strip():
            state["blocked_reason"] = blocked_reason_value.strip()

        if tool_name.startswith("mcp__"):
            upsert_unique_list(state, "mcp_tools_used", [tool_name])
        if tool_name in ("apply_patch", "Edit", "Write"):
            upsert_unique_list(state, "files_changed", extract_changed_files(tool_name, tool_input))

        state["user_prompt_available"] = bool(
            state.get("user_prompt_available") or user_prompt_available
        )
        state["assistant_response_available"] = bool(
            state.get("assistant_response_available") or assistant_response_available
        )
        if user_prompt_available:
            state["prompt_preview"] = prompt_preview or ""
        if assistant_response_available:
            state["response_preview"] = response_preview or ""

        if skill_selected and isinstance(selected_skill, str) and selected_skill:
            state["selected_skill"] = selected_skill
            state["skill_selected"] = True
        elif "selected_skill" not in state:
            state["selected_skill"] = None
            state["skill_selected"] = False

        events: list[dict[str, Any]] = []
        current_stage = infer_current_stage(hook_event, tool_name)
        risk_level = compute_risk_level(state)
        common_meta = build_common_metadata(
            root=root,
            payload=payload,
            state=state,
            session_id=session_id,
            conversation_id=conversation_id,
            user_email=user_email,
            trace_source="codex_hook",
            trace_id_source=trace_id_source,
            app_slug=app_slug,
            current_stage=current_stage,
            risk_level=risk_level,
        )

        if not state.get("trace_created"):
            trace_body = {
                "id": trace_id,
                "timestamp": now_iso(),
                "name": "codex_session",
                "sessionId": session_id,
                "input": sanitize(
                    {
                        "hook_event_name": hook_event,
                        "tool_name": tool_name,
                        "turn_id": payload.get("turn_id"),
                    }
                ),
                "metadata": sanitize(
                    {
                        **common_meta,
                        "cwd": payload.get("cwd"),
                        "permission_mode": payload.get("permission_mode"),
                    }
                ),
                "tags": ["codex", "hook", "langfuse"],
            }
            events.append(make_event_envelope("trace-create", trace_body))
            state["trace_created"] = True

        # Always emit hook_execution
        add_span(
            events,
            state,
            trace_id,
            "hook_execution",
            payload,
            common_meta,
            input_value={"tool_input": tool_input, "command": command},
            output_value={"tool_response": tool_response, "hook_event_name": hook_event},
            extra_meta={
                "user_prompt_available": user_prompt_available,
                "assistant_response_available": assistant_response_available,
                "skill_selected": skill_selected,
                "selected_skill": selected_skill,
            },
        )

        if user_prompt_available:
            add_span(
                events,
                state,
                trace_id,
                "user_prompt",
                payload,
                common_meta,
                input_value={"prompt_preview": prompt_preview},
                text_limit=PREVIEW_TEXT_LEN,
            )

        if assistant_response_available:
            add_span(
                events,
                state,
                trace_id,
                "assistant_response",
                payload,
                common_meta,
                output_value={"response_preview": response_preview},
                text_limit=PREVIEW_TEXT_LEN,
            )

        update_rerun_metrics(state, node_name=hook_event, command=command)

        # Detect and emit specific span categories.
        if hook_event in ("PreToolUse", "PostToolUse"):
            if tool_name.startswith("mcp__"):
                add_span(
                    events,
                    state,
                    trace_id,
                    "mcp_tool_call",
                    payload,
                    common_meta,
                    input_value=tool_input,
                    output_value=tool_response,
                )
                try_mark_metric(state, "mcp_used", 1)

            if tool_name == "Bash":
                add_span(
                    events,
                    state,
                    trace_id,
                    "bash_command",
                    payload,
                    common_meta,
                    input_value={"command": command},
                    output_value=tool_response,
                )

                if command and contains_any(command, ["agents.md"]):
                    add_span(
                        events,
                        state,
                        trace_id,
                        "read_agents_md",
                        payload,
                        common_meta,
                        input_value={"command": command},
                        output_value=tool_response,
                    )
                    try_mark_metric(state, "agents_md_read", 1)

                if command and contains_any(command, ["spec_writer", "spec-writer", "spec writer"]):
                    add_span(
                        events,
                        state,
                        trace_id,
                        "spec_writer_run",
                        payload,
                        common_meta,
                        input_value={"command": command},
                        output_value=tool_response,
                    )
                    try_mark_metric(state, "spec_writer_ran", 1)

                if command and contains_any(command, ["pytest", "npm test", "qa", "lint", "typecheck"]):
                    qa_passed = 0
                    if isinstance(tool_response, dict):
                        exit_code = tool_response.get("exit_code")
                        qa_passed = 1 if exit_code == 0 else 0
                    add_span(
                        events,
                        state,
                        trace_id,
                        "qa_check",
                        payload,
                        common_meta,
                        input_value={"command": command},
                        output_value=tool_response,
                        extra_meta={"passed": qa_passed},
                    )
                    if qa_passed:
                        try_mark_metric(state, "qa_passed", 1)

            if tool_name in ("apply_patch", "Edit", "Write"):
                add_span(
                    events,
                    state,
                    trace_id,
                    "file_change",
                    payload,
                    common_meta,
                    input_value=tool_input,
                    output_value=tool_response,
                )

        # Heuristic skill/subagent detection from payload text.
        if skill_selected:
            add_span(
                events,
                state,
                trace_id,
                "skill_selection",
                payload,
                common_meta,
                input_value={
                    "selected_skill": skill_info.get("selected_skill"),
                    "available_skills": skill_info.get("available_skills"),
                    "detected_from": skill_info.get("detected_from"),
                    "confidence": skill_info.get("confidence"),
                },
                output_value={
                    "selected_skill": skill_info.get("selected_skill"),
                    "available_skills": skill_info.get("available_skills"),
                    "detected_from": skill_info.get("detected_from"),
                    "confidence": skill_info.get("confidence"),
                },
            )
            try_mark_metric(state, "skill_selected", 1)
            state["skill_selected"] = True
            state["selected_skill"] = skill_info.get("selected_skill")
        else:
            try_mark_metric(state, "skill_selected", 1 if state.get("selected_skill") else 0)
            state["skill_selected"] = bool(state.get("selected_skill"))
            if not state.get("selected_skill"):
                state["selected_skill"] = None

        if contains_any(payload_text, ["subagent", "agent_type", "agent_id"]):
            add_span(
                events,
                state,
                trace_id,
                "subagent_selection",
                payload,
                common_meta,
                input_value={"detected_from": "payload_text"},
                output_value={"selected_subagent": state.get("selected_subagent")},
            )
            try_mark_metric(state, "subagent_selected", 1)

        # Final summary and score flush on Stop.
        if hook_event == "Stop":
            prompt_preview_for_summary = str(state.get("prompt_preview") or "")
            response_preview_for_summary = str(state.get("response_preview") or "")
            prompt_available_for_summary = bool(state.get("user_prompt_available"))
            response_available_for_summary = bool(state.get("assistant_response_available"))
            selected_skill_for_summary = state.get("selected_skill")
            selected_subagent_for_summary = state.get("selected_subagent")
            blocked_reason_for_summary = state.get("blocked_reason")
            mcp_tools_used_for_summary = list(state.get("mcp_tools_used") or [])
            files_changed_for_summary = list(state.get("files_changed") or [])
            qa_passed_for_summary = bool(state.get("metrics", {}).get("qa_passed", 0))
            repeated_node_count_for_summary = int(
                state.get("metrics", {}).get("repeated_node_count", 0)
            )
            unnecessary_rerun_count_for_summary = int(
                state.get("metrics", {}).get("unnecessary_rerun_count", 0)
            )
            state["metrics"]["final_quality"] = compute_final_quality(state)
            final_quality_for_summary = int(state["metrics"]["final_quality"])
            risk_level_for_summary = compute_risk_level(state)

            add_span(
                events,
                state,
                trace_id,
                "final_summary",
                payload,
                build_common_metadata(
                    root=root,
                    payload=payload,
                    state=state,
                    session_id=session_id,
                    conversation_id=conversation_id,
                    user_email=user_email,
                    trace_source="codex_hook",
                    trace_id_source=trace_id_source,
                    app_slug=app_slug,
                    current_stage="final_summary",
                    risk_level=risk_level_for_summary,
                ),
                input_value={"last_assistant_message": payload.get("last_assistant_message")},
                output_value=build_final_summary_output(
                    app_slug=app_slug,
                    conversation_id=conversation_id,
                    trace_id_source=trace_id_source,
                    prompt_linked=prompt_linked,
                    latest_prompt_preview=latest_prompt_preview,
                    stop_hook_active=payload.get("stop_hook_active"),
                    risk_level=risk_level_for_summary,
                    blocked_reason=blocked_reason_for_summary,
                    selected_skill=selected_skill_for_summary,
                    selected_subagent=selected_subagent_for_summary,
                    mcp_tools_used=mcp_tools_used_for_summary,
                    files_changed=files_changed_for_summary,
                    qa_passed=qa_passed_for_summary,
                    final_quality=final_quality_for_summary,
                    repeated_node_count=repeated_node_count_for_summary,
                    unnecessary_rerun_count=unnecessary_rerun_count_for_summary,
                ),
                extra_meta={
                    "user_prompt_available": prompt_available_for_summary,
                    "assistant_response_available": response_available_for_summary,
                    "prompt_preview": prompt_preview_for_summary,
                    "response_preview": response_preview_for_summary,
                    "selected_skill": selected_skill_for_summary,
                    "selected_subagent": selected_subagent_for_summary,
                    "blocked_reason": blocked_reason_for_summary,
                    "mcp_tools_used_count": len(mcp_tools_used_for_summary),
                    "files_changed_count": len(files_changed_for_summary),
                    "span_chain": [
                        "user_prompt",
                        "assistant_response",
                        "skill_selection",
                        "subagent_selection",
                        "mcp_tool_call",
                        "hook_execution",
                        "bash_command",
                        "file_change",
                        "qa_check",
                        "final_summary",
                    ],
                },
                text_limit=PREVIEW_TEXT_LEN,
            )

            # Ensure each requested span name exists at least once per session.
            emitted = set(state.get("emitted_spans", []))
            missing = [name for name in SPAN_NAMES if name not in emitted]
            for name in missing:
                if name == "user_prompt":
                    continue
                if name == "assistant_response" and not state.get("assistant_response_available"):
                    continue
                if name == "skill_selection" and not state.get("skill_selected"):
                    continue
                add_span(
                    events,
                    state,
                    trace_id,
                    name,
                    payload,
                    build_common_metadata(
                        root=root,
                        payload=payload,
                        state=state,
                        session_id=session_id,
                        conversation_id=conversation_id,
                        user_email=user_email,
                        trace_source="codex_hook",
                        trace_id_source=trace_id_source,
                        app_slug=app_slug,
                        current_stage=name,
                        risk_level=compute_risk_level(state),
                    ),
                    input_value={"detected": False},
                    output_value={"note": "marker span emitted at stop"},
                )

            for score_name in SCORE_NAMES:
                value = state["metrics"].get(score_name, 0)
                if isinstance(value, bool):
                    value = 1 if value else 0
                events.append(make_score_event(trace_id, score_name, float(value)))

        try:
            save_state(state_path, state)
        except Exception as exc:
            debug_log(root, f"state_save_error ({exc.__class__.__name__}: {exc})")

        ok, status = send_batch(
            base_public_url=normalize_base_url(base_url),
            public_key=public_key,
            secret_key=secret_key,
            batch=events,
        )
        if ok:
            debug_log(root, f"ok ({len(events)} events)")
        else:
            debug_log(root, f"error ({status})")
    except Exception as exc:
        debug_log(root, f"uncaught_error ({exc.__class__.__name__}: {exc})")
        debug_log(root, traceback.format_exc())
    return 0


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
    sys.exit(0)
