---
name: taruvi-functions
description: Write Python function bodies that run inside Taruvi's serverless runtime using the `taruvi` SDK (v0.1.9, sync+async via unasync codegen). Use when authoring code for `def main(params, user_data, sdk_client)`, calling `client.database`/`.storage`/`.secrets`/`.auth`/`.policy`/`.users`/`.analytics`/`.functions`/`.settings`/`.app`, handling the immutable auth pattern (signInWithToken returns a NEW client, never mutates in place), or using the `log(...)` builtin. TRIGGERS include "Taruvi function", "def main params user_data sdk_client", "taruvi Python SDK", "signInWithToken", "TARUVI_FUNCTION_RUNTIME", "function body Taruvi", "serverless handler Taruvi", "Celery Taruvi function", "@taruvi function". SKIP when provisioning backend resources (use taruvi-backend-provisioning) or building Refine UI (use taruvi-refine-frontend). Covers runtime detection, the 10 SDK modules, immutable auth, sync vs async, runtime context vars, log vs print, and the common gotchas that bite function authors.
license: Apache-2.0
compatibility: Function body runs inside Taruvi's Python runtime. Expects the `taruvi` PyPI package v0.1.9+ and the env var `TARUVI_FUNCTION_RUNTIME=true` set by the runtime.
metadata:
  author: EOX Vantage
  version: "1.0.0"
  organization: Taruvi
---

# Taruvi functions (Python SDK)

Write Python code that runs inside Taruvi's serverless function runtime. This skill covers the function signature, the SDK module surface, the immutable auth pattern, runtime detection, and the execution model (sync vs async).

This skill is for the **body of a deployed function**. If you're registering a function's metadata (name, description, environment), switch to `taruvi-backend-provisioning` and use `manage_function`. If you're building the frontend that triggers the function, switch to `taruvi-refine-frontend`.

**Compliance rule:** This skill's prescribed patterns (exact function signature, SDK usage, mode selection) are mandatory. Do not invent SDK methods, skip validation, or hardcode secrets. If a requirement cannot be met, stop and ask the user.

## Core principles

1. **The function signature is fixed.** Always `def main(params, user_data, sdk_client)`. Don't rename parameters; the runtime binds them positionally.
2. **`sdk_client` is already authenticated** with the calling user's context. Do not re-authenticate for the common case. Only call `signInWithToken` when you need to act as a different principal.
3. **Immutable auth.** `signInWithToken()` returns a **new client**. Reassigning the variable is mandatory. Mutating operations on the original client won't reflect the new auth.
4. **Use `log()`, not `print()`.** `log()` routes to Taruvi's structured logging and shows up in the function's invocation record. `print()` goes to stdout, which is harder to surface.
5. **Prefer sync in function bodies.** The runtime auto-detects mode; async is only worth it when you're fanning out concurrent I/O. Sync is simpler and faster for the common case.

## Function signature

```python
def main(params, user_data, sdk_client):
    """
    params     — dict, whatever the caller passed in `execute_function(params=...)`.
    user_data  — dict or None. The calling user's context (id, username, roles, ...).
                 None for public functions called without auth.
    sdk_client — a pre-authenticated `taruvi.Client` scoped to the calling user.
    """
    log(f"Running for user={user_data.get('username') if user_data else 'anon'}", level="info")

    # ... do work via sdk_client ...

    return {"status": "ok", "result": ...}
```

Return value is JSON-serialized and delivered to the caller (or stored as the async task result).

## Execution modes and trigger types

A Taruvi function is configured with two orthogonal settings: **execution mode** (who runs the code) and **trigger type** (what causes it to run).

### Execution modes (`execution_mode`)

| Mode | What it runs | Required field |
|---|---|---|
| `app` | Your Python code inside Taruvi's sandbox runtime | `code` |
| `proxy` | Forwards the request to an external URL | `webhook_url` |
| `system` | Internal platform logic (you don't author the code) | — (registration-time) |

**This skill is about writing `app` mode bodies.** `proxy` and `system` don't accept Python code.

### Trigger types (`trigger_type` on invocations)

| Trigger | When it fires |
|---|---|
| `api` | Called via `execute_function` from frontend/MCP |
| `schedule` | Cron-scheduled (configured via function config / celery-beat) |
| `event` | Fires automatically when a platform event matches the function's CEL `filter_conditions` |

### Behavior flags (orthogonal to trigger type)

| Flag | Effect |
|---|---|
| `async_mode=True` | Execution returns a `task_id`; caller polls for result (good for long-running work) |
| `is_public=True` | Callable without authentication (`user_data` is `None`); verify caller identity in the body |

Register all of these via `manage_function` (see `taruvi-backend-provisioning`). For event-driven functions, see [references/event-filters.md](references/event-filters.md) for the CEL filter expression language.

## Runtime detection

The runtime sets `TARUVI_FUNCTION_RUNTIME=true` before invoking `main`. The SDK auto-detects this and:

- Skips reading `.env` files
- Pulls auth from runtime-injected headers
- Auto-selects sync mode by default

You rarely need to check the env var yourself. If you do want to gate behavior:

```python
import os
if os.environ.get("TARUVI_FUNCTION_RUNTIME") == "true":
    # ...
```

## SDK module map (10 modules)

`sdk_client` exposes all modules as attributes:

| Module | Accessor | Purpose |
|---|---|---|
| Database | `sdk_client.database` | Datatable CRUD with fluent query builder |
| Storage | `sdk_client.storage` | Bucket ops: upload, download, list, copy/move, bucket CRUD |
| Secrets | `sdk_client.secrets` | Read/write secrets (decrypts transparently) |
| Users | `sdk_client.users` | User CRUD, role assignment, preferences |
| Functions | `sdk_client.functions` | Invoke other functions (sync/async), get results |
| Auth | `sdk_client.auth` | Current user, sign in/out, token refresh |
| Policy | `sdk_client.policy` | Cerbos permission checks |
| Analytics | `sdk_client.analytics` | Execute registered analytics queries |
| Settings | `sdk_client.settings` | Site metadata |
| App | `sdk_client.app` | App-level roles + settings |

See [references/sdk-module-reference.md](references/sdk-module-reference.md) for full API.

## Immutable auth pattern

```python
def main(params, user_data, sdk_client):
    # sdk_client is already scoped to the calling user. Use it directly.
    current = sdk_client.auth.get_current_user()

    # If you need to act as a different principal (e.g., service account),
    # sign in with a token — this returns a NEW client. The original
    # sdk_client is unchanged.
    service_client = sdk_client.auth.signInWithToken(
        token=secrets.get("SERVICE_TOKEN"),
        token_type="jwt",
    )

    # Use service_client for the elevated call
    service_client.database.from_("audit_log").create({
        "event": "admin_action",
        "triggered_by": current["username"],
    }).execute()

    # sdk_client continues to act as the original user
    sdk_client.database.from_("user_activity").create({
        "action": "triggered_admin_action",
    }).execute()
```

See [references/auth-patterns.md](references/auth-patterns.md) for more on token types and scoping.

## Sync vs async

The SDK supports both. In a function body, **sync is the default and usually correct**:

```python
def main(params, user_data, sdk_client):
    rows = sdk_client.database.from_("orders").page_size(100).execute()
    return {"count": len(rows["data"])}
```

Use async when you're fanning out concurrent I/O and the gain outweighs the complexity:

```python
import asyncio

async def main(params, user_data, sdk_client):
    # When main is async, sdk_client auto-detects and runs in async mode
    async def fetch_user_orders(user_id):
        return await sdk_client.database.from_("orders").filter("user_id", "eq", user_id).execute()

    user_ids = params["user_ids"]
    results = await asyncio.gather(*[fetch_user_orders(uid) for uid in user_ids])
    return {"users": [r["data"] for r in results]}
```

The SDK's `Client()` factory detects a running event loop and routes to the async implementation. You don't need to configure anything.

## Database usage (fluent builder)

```python
# Query with filters, sort, pagination, populate
result = (sdk_client.database
    .from_("posts")
    .filter("status", "eq", "published")
    .filter("author_id", "in", [1, 2, 3])
    .sort("created_at", "desc")
    .page_size(50)
    .populate(["author", "category"])
    .execute()
)
# result: {"data": [...], "total": 100, "pagination": {...}}

# Single row
post = sdk_client.database.from_("posts").get("42").execute()

# Create
new = sdk_client.database.from_("posts").create({"title": "...", "body": "..."}).execute()

# Upsert (by PK)
sdk_client.database.from_("users").upsert({"id": 42, "email": "new@x.com"}).execute()

# Update (target a single record via .get(id) first)
sdk_client.database.from_("posts").get("42").update({"status": "archived"}).execute()

# Delete
sdk_client.database.from_("posts").delete("42").execute()
# Bulk delete: pass a list to .delete()
sdk_client.database.from_("posts").delete(["1", "2", "3"]).execute()

# Aggregates
revenue = (sdk_client.database
    .from_("orders")
    .filter("status", "eq", "completed")
    .aggregate("sum(total)", "count(*)")
    .groupBy("customer_id")
    .execute()
)
```

## Storage usage

```python
# Read
blob_bytes = sdk_client.storage.from_("uploads").download("path/to/file.pdf").execute()

# Upload
result = (sdk_client.storage
    .from_("uploads")
    .upload(
        files=[open("local.pdf", "rb")],
        paths=["archive/local.pdf"],
        metadatas=[{"owner": user_data["id"]}],
    )
    .execute()
)

# List
files = sdk_client.storage.from_("uploads").filter({"prefix": "archive/"}).execute()

# Metadata only (no download)
meta = sdk_client.storage.from_("uploads").metadata("path/to/file.pdf").execute()

# Delete
sdk_client.storage.from_("uploads").delete(["a.pdf", "b.pdf"]).execute()
```

## Secrets usage (transparent decrypt at runtime)

In a function body, secrets **decrypt transparently** — unlike the MCP surface where sensitive values are masked.

```python
# Single
stripe_key = sdk_client.secrets.get("STRIPE_KEY").execute()
# stripe_key["value"] — actual decrypted value

# Batch
batch = sdk_client.secrets.list(keys=["STRIPE_KEY", "SMTP_PASSWORD", "API_URL"])
api_url = batch["data"]["API_URL"]["value"]
```

## Logging

```python
# log() is a runtime-injected builtin. Don't import it.
# Signature: log(message, level="info", data=None)
# - message: str (or anything str-able) — the log line
# - level: "debug" | "info" | "warning" | "error" | "critical" (default "info")
# - data: optional dict/list for structured context
log("Processing order", level="info", data={"order_id": 42, "user_id": user_data["id"]})
log("Slow query detected", level="warning", data={"duration_ms": 1200})
log("Failed to send email", level="error", data={"exception": str(exc)})
```

Levels: `debug`, `info`, `warning`, `error`, `critical` (case-insensitive; anything else falls back to `info`). Logs show up in the function's invocation record, surfaced via `execute_function` or `list_invocations`.

`print()` also works but goes to stdout only — less structured, harder to query.

## Policy (Cerbos) checks

```python
allowed = sdk_client.policy.check_resources(
    principal={"id": user_data["id"], "roles": user_data["roles"]},
    resources=[
        {"resource": "post:42", "actions": ["read", "update"]},
    ],
)
# allowed.results[0].actions — {"read": "EFFECT_ALLOW", "update": "EFFECT_DENY"}

if allowed.results[0].actions["update"] != "EFFECT_ALLOW":
    raise PermissionError("Cannot update post 42")
```

## Gotchas

1. **`signInWithToken` returns a new client.** `sdk_client = sdk_client.auth.signInWithToken(...)` is what you want if you're replacing context. Bare `sdk_client.auth.signInWithToken(...)` returns a new client you never capture.
2. **`sdk_client` is pre-authenticated — don't re-authenticate.** Only call `signInWithToken` when you explicitly need a different principal.
3. **`user_data` can be None** for public functions. Always guard: `user_data["id"] if user_data else None`.
4. **`log()` is a builtin**, not imported. If you see `NameError: name 'log' is not defined`, you're probably running outside the function runtime (locally, tests). Either mock it or check `TARUVI_FUNCTION_RUNTIME`.
5. **Sensitive secrets decrypt in function bodies** but are masked via MCP. This is by design — don't try to surface raw sensitive values in a function's return value unless the caller is trusted.
6. **Async main with sync SDK calls will deadlock** (rare, but possible). If you mark `main` async, use the async SDK methods (the same methods work — they return awaitables in async mode).
7. **Timeouts are enforced by the runtime**, not the SDK. The function's registered `timeout` config caps execution. Long-running work should be async-invoked (via `execute_function(async_mode=True)`) or broken into chunks.
8. **Return values must be JSON-serializable.** `datetime`, `Decimal`, and custom objects need explicit serialization. Use ISO 8601 for dates.
9. **Don't mutate `params`.** It's passed by reference; mutations aren't persisted but can confuse later code.
10. **Celery task IDs are opaque.** If your function needs to report progress, write to a datatable (e.g., `function_invocations` extension) — don't rely on Celery task metadata.

## Testing locally

Taruvi doesn't ship a standalone runtime emulator. For local dev:

```python
# test_my_function.py
from taruvi import Client
from my_function import main

def test_happy_path():
    client = Client(
        api_url="http://localhost:8000",
        app_slug="my-app",
    )
    # Note: signInWithPassword on the auth module takes `email=`, not `username=`
    # (despite some older docstrings saying otherwise). Pass the user's email.
    client = client.auth.signInWithPassword(
        email="alice@example.com",
        password="test-password",
    )

    # Stub `log` for local runs
    import builtins
    builtins.log = lambda *a, **kw: print(*a, kw)

    result = main(
        params={"order_id": 42},
        user_data={"id": "alice", "username": "alice", "roles": ["user"]},
        sdk_client=client,
    )

    assert result["status"] == "ok"
```

Important: local runs do **not** have `TARUVI_FUNCTION_RUNTIME=true`, so the SDK auth flow is different. Explicitly sign in for tests.

## Verification checklist

Before reporting a function body as done, confirm:

- [ ] Signature is exactly `def main(params, user_data, sdk_client)` (or `async def main(...)` for async).
- [ ] `user_data is None` is guarded if the function is (or may become) public.
- [ ] Required params are validated at the top; missing-param errors return structured responses, not uncaught KeyErrors.
- [ ] `signInWithToken()` return values are always captured — `client = sdk_client.auth.signInWithToken(...)`, never a bare call.
- [ ] Sensitive secrets accessed via `sdk_client.secrets.get(...)` are not returned verbatim in the response payload unless the caller is trusted.
- [ ] `log()` is used for observability (not `print`); at minimum an info-level entry at start and end of happy path plus error-level on failures.
- [ ] Return value is JSON-serializable (datetimes → ISO strings, Decimals → floats, bytes → base64 or path reference).
- [ ] For async mode: all SDK calls inside `async def main` are awaited; no `time.sleep` (use `asyncio.sleep`).
- [ ] For multi-resource ops: confirm the function is the right tool (see [references/scenarios.md](references/scenarios.md)) — not something that should have been a direct Refine call.
- [ ] Execution was tested via `execute_function(function_slug=..., params=...)` and the response matched expectations.

## When you get stuck

- Full per-module API: [references/sdk-module-reference.md](references/sdk-module-reference.md).
- Immutable auth deep dive: [references/auth-patterns.md](references/auth-patterns.md).
- 5 ready-to-copy skeletons: [references/function-templates.md](references/function-templates.md).
- End-to-end scenarios (right-vs-wrong patterns, frontend + backend together): [references/scenarios.md](references/scenarios.md). Read this when deciding "is this a function or a direct Refine call?"
- Event triggers + CEL filter expressions: [references/event-filters.md](references/event-filters.md). Load when writing event-driven functions (`trigger_type=event`).
- In-skill-to-MCP bridge: if you need the SDK for something exposed in an MCP tool, prefer the MCP tool at registration time and use the SDK at runtime.
