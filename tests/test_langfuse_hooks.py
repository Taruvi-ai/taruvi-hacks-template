import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
HOOK_PATH = ROOT / ".codex" / "hooks" / "langfuse_session_tracer.py"

spec = importlib.util.spec_from_file_location("langfuse_session_tracer", HOOK_PATH)
assert spec is not None and spec.loader is not None
hook = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hook)

PROMPT_SYNC_PATH = ROOT / ".codex" / "hooks" / "langfuse_prompt_sync.py"
prompt_sync_spec = importlib.util.spec_from_file_location("langfuse_prompt_sync", PROMPT_SYNC_PATH)
assert prompt_sync_spec is not None and prompt_sync_spec.loader is not None
prompt_sync = importlib.util.module_from_spec(prompt_sync_spec)
prompt_sync_spec.loader.exec_module(prompt_sync)


class LangfuseTraceCorrelationTests(unittest.TestCase):
    def test_session_id_correlation_overrides_fallback_and_persists(self) -> None:
        session_id = "019e8488-525f-7d22-afd0-1d01a297d076"
        expected_trace_id = "1eb0c1e2-22d1-52d6-a162-2c0a82cbd989"

        correlation = {
            "updated_at": "2026-06-01T19:22:54.914Z",
            "latest_conversation_id": "019e8412-b682-7892-a5fb-6057efa3c097",
            "conversations": {
                session_id: {
                    "trace_id": expected_trace_id,
                    "latest_prompt_preview": "CORRELATION TEST 001: read AGENTS.md and run pwd only.",
                    "latest_prompt_timestamp": "2026-06-01T19:22:25.251Z",
                },
                "019e842c-cab0-7a90-8407-a8fa6e689ff7": {
                    "trace_id": "e703f300-e1e8-585a-b0d4-f5f616d7349e",
                    "latest_prompt_preview": "OTHER",
                    "latest_prompt_timestamp": "2026-06-01T17:13:32.160Z",
                },
            },
        }

        # Payload conversation id points at another valid conversation; session id match must still win.
        trace_context = hook.resolve_trace_from_correlation(
            session_id=session_id,
            payload_conversation_id="019e842c-cab0-7a90-8407-a8fa6e689ff7",
            correlation=correlation,
        )

        self.assertEqual(trace_context["trace_id"], expected_trace_id)
        self.assertEqual(trace_context["trace_id_source"], "conversation_correlation")
        self.assertTrue(trace_context["prompt_linked"])
        self.assertEqual(trace_context["conversation_id"], session_id)

        state = hook.initial_state(session_id)
        state["trace_id"] = hook.deterministic_session_trace_id(session_id)
        state["trace_id_source"] = "session_fallback"
        state["prompt_linked"] = False
        state["latest_prompt_preview"] = None
        state["trace_created"] = True

        with tempfile.TemporaryDirectory() as tmp_dir:
            state_path = Path(tmp_dir) / "state.json"
            state_path.write_text(json.dumps(state), encoding="utf-8")

            hook.apply_trace_correlation_migration(
                state=state,
                state_path=state_path,
                session_id=session_id,
                trace_context=trace_context,
                root=Path(tmp_dir),
            )

            persisted = json.loads(state_path.read_text(encoding="utf-8"))

        self.assertEqual(persisted["trace_id"], expected_trace_id)
        self.assertEqual(persisted["trace_id_source"], "conversation_correlation")
        self.assertTrue(persisted["prompt_linked"])
        self.assertEqual(
            persisted["latest_prompt_preview"],
            "CORRELATION TEST 001: read AGENTS.md and run pwd only.",
        )
        self.assertEqual(persisted["conversation_id"], session_id)
        self.assertFalse(persisted["trace_created"])

    def test_app_slug_from_config_and_final_summary_output(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / ".codex").mkdir(parents=True, exist_ok=True)
            (root / ".codex" / "config.toml").write_text(
                '[mcp_servers.taruvi.http_headers]\nX-App-Slug = "kj_test"\n',
                encoding="utf-8",
            )

            app_slug = hook.resolve_app_slug(root)
            self.assertEqual(app_slug, "kj_test")

        summary_output = hook.build_final_summary_output(
            app_slug="kj_test",
            conversation_id="019e8488-525f-7d22-afd0-1d01a297d076",
            trace_id_source="conversation_correlation",
            prompt_linked=True,
            latest_prompt_preview="preview",
            stop_hook_active=True,
            risk_level="low",
            blocked_reason=None,
            selected_skill=None,
            selected_subagent=None,
            mcp_tools_used=[],
            files_changed=[],
            qa_passed=True,
            final_quality=95,
            repeated_node_count=0,
            unnecessary_rerun_count=0,
        )
        self.assertEqual(summary_output["app_slug"], "kj_test")
        self.assertEqual(summary_output["current_stage"], "final_summary")

    def test_app_slug_prefers_env_local_taruvi_slug_and_ignores_placeholders(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / ".codex").mkdir(parents=True, exist_ok=True)
            (root / ".env").write_text(
                "X_APP_SLUG=<your-app-slug>\nAPP_SLUG=env_app\n",
                encoding="utf-8",
            )
            (root / ".env.local").write_text(
                "TARUVI_APP_SLUG=env_local_taruvi_app\n",
                encoding="utf-8",
            )
            (root / ".codex" / "config.toml").write_text(
                '[mcp_servers.taruvi.http_headers]\nX-App-Slug = "<APP_SLUG>"\n',
                encoding="utf-8",
            )

            self.assertEqual(hook.resolve_app_slug(root), "env_local_taruvi_app")
            self.assertEqual(prompt_sync.resolve_app_slug(root), "env_local_taruvi_app")

    def test_app_slug_falls_back_past_placeholders_to_project_slug(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            (root / ".codex").mkdir(parents=True, exist_ok=True)
            (root / ".env").write_text(
                "TARUVI_APP_SLUG=<your-app-slug>\nAPP_SLUG=\n",
                encoding="utf-8",
            )
            (root / ".codex" / "config.toml").write_text(
                '[mcp_servers.taruvi.http_headers]\nX-App-Slug = "<APP_SLUG>"\n',
                encoding="utf-8",
            )

            self.assertEqual(hook.resolve_app_slug(root), root.name)
            self.assertEqual(prompt_sync.resolve_app_slug(root), root.name)

    def test_prompt_sync_payload_includes_full_prompt_and_preview(self) -> None:
        full_prompt = f"{'A' * 4100} sk-lf-secret-value"
        body = (
            'event.name="codex.user_prompt" '
            f"prompt_length={len(full_prompt)} "
            f"prompt={full_prompt} "
            "event.timestamp=2026-06-08T19:03:53.019Z "
            "conversation.id=conversation-123 "
            "session.id=session-123 "
            "turn.id=turn-123 "
            "model=gpt-5.5"
        )

        with tempfile.TemporaryDirectory() as tmp_dir:
            root = Path(tmp_dir)
            record = prompt_sync.build_record(123, body, root)

        self.assertIsNotNone(record)
        assert record is not None
        span_body = record["payload"]["batch"][1]["body"]
        self.assertIn("prompt", span_body["input"])
        self.assertIn("prompt_preview", span_body["input"])
        self.assertIn("[REDACTED]", span_body["input"]["prompt"])
        self.assertGreater(len(span_body["input"]["prompt"]), prompt_sync.PROMPT_PREVIEW_MAX)
        self.assertEqual(len(span_body["input"]["prompt_preview"]), prompt_sync.PROMPT_PREVIEW_MAX)

    def test_hook_prompt_extraction_keeps_full_prompt_beyond_preview_limit(self) -> None:
        full_prompt = "x" * (hook.PREVIEW_TEXT_LEN + 250)
        extracted_prompt, _ = hook.extract_prompt_and_response({"user_prompt": full_prompt})

        self.assertEqual(extracted_prompt, full_prompt)
        self.assertGreater(len(extracted_prompt or ""), hook.PREVIEW_TEXT_LEN)

    def test_prompt_sync_legacy_synced_ids_are_resynced_for_schema_change(self) -> None:
        with tempfile.TemporaryDirectory() as tmp_dir:
            path = Path(tmp_dir) / "synced_prompt_ids.json"
            path.write_text(json.dumps({"synced_ids": [123]}), encoding="utf-8")

            self.assertEqual(prompt_sync.load_synced_ids(path), set())

            prompt_sync.save_synced_ids(path, {123})
            self.assertEqual(prompt_sync.load_synced_ids(path), {123})


if __name__ == "__main__":
    unittest.main()
