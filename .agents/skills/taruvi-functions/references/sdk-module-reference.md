# Taruvi Python SDK — full module reference

Every module exposed via `sdk_client.<module>` inside a function body. The SDK generates sync + async versions from the same source (via `_unasync.py`); the method names are identical across modes.

## `sdk_client.database` — `AsyncDatabaseModule` / `SyncDatabaseModule`

Fluent builder on `.from_(table_name)`. Chain methods, end with `.execute()`.

### Query

```python
client.database.from_("orders") \
    .filter("status", "eq", "pending") \
    .filter("total", "gte", 100) \
    .sort("created_at", "desc") \
    .page_size(50) \
    .page(2) \
    .populate(["customer"]) \
    .search("urgent") \
    .execute()
```

Returns `{"data": [...], "total": 100, "pagination": {...}}`.

### Convenience methods

```python
client.database.get("orders", "42")         # single row by PK
client.database.create("orders", data)       # create (bypasses builder)
client.database.update("orders", "42", data) # update
client.database.delete("orders", "42")       # delete

# Builder equivalents:
client.database.from_("orders").get("42").execute()
client.database.from_("orders").create(data).execute()
```

### Builder methods

| Method | Purpose |
|---|---|
| `.from_(table)` | Select table |
| `.get(id)` | Fetch single row by PK |
| `.filter(field, op, value)` | Add filter (multiple calls = AND) |
| `.sort(field, order)` | `"asc"` or `"desc"` |
| `.page_size(n)` | Rows per page |
| `.page(n)` | Page number (1-indexed) |
| `.populate(fields)` | Expand FKs: `["author", "category"]` or `"*"` |
| `.search(query)` | Full-text search on declared `search_fields` |
| `.aggregate(*expressions)` | `"sum(total)"`, `"count(*)"` |
| `.group_by(*fields)` | Group by |
| `.having(condition)` | Filter aggregates |
| `.create(data)` | Insert row(s) |
| `.upsert(data)` | Upsert by PK |
| `.update(data)` | Update — use `.get(id).update(data).execute()` to target a single record |
| `.delete(id_or_ids)` | Delete by PK; accepts a single ID or a list for bulk |
| `.edges()` | Graph edge sub-API |
| `.format(fmt)` | Graph: `"tree"` or `"graph"` |
| `.include(dir)` | Graph: `"descendants"` / `"ancestors"` / `"both"` |
| `.depth(n)` | Graph depth |
| `.execute()` | Fire the request |
| `.first()` | Shorthand: page_size(1), return first or None |
| `.count()` | Shorthand: return total count |

## `sdk_client.storage` — Storage

Fluent on `.from_(bucket)`.

### Object ops

```python
# Upload
client.storage.from_("uploads").upload(
    files=[file_obj1, file_obj2],
    paths=["a/b.pdf", "c/d.pdf"],
    metadatas=[{"owner": "alice"}, {"owner": "bob"}],
).execute()

# Download (returns bytes)
data = client.storage.from_("uploads").download("a/b.pdf").execute()

# Metadata only
meta = client.storage.from_("uploads").metadata("a/b.pdf").execute()

# List
client.storage.from_("uploads").filter({
    "prefix": "alice/",
    "size__gte": 1000,
    "mimetype": "image/png",
}).execute()

# Delete
client.storage.from_("uploads").delete(["a/b.pdf", "c/d.pdf"]).execute()

# Copy / move
client.storage.from_("uploads").copy_object(src="a.pdf", dst="archive/a.pdf").execute()
client.storage.from_("uploads").move_object(src="a.pdf", dst="archive/a.pdf").execute()
```

### Bucket ops

```python
client.storage.list_buckets()
client.storage.create_bucket(name="new-bucket", visibility="private", app_category="attachments")
client.storage.get_bucket("uploads")
client.storage.update_bucket("uploads", visibility="public")
client.storage.delete_bucket("uploads")
```

## `sdk_client.secrets` — Secrets

```python
# Single (returns {key, value, secret_type, ...})
secret = client.secrets.get("STRIPE_KEY")

# With options
secret = client.secrets.get("STRIPE_KEY", app="my-app", tags=["prod"])

# Batch
batch = client.secrets.list(keys=["STRIPE_KEY", "API_URL"])
# batch["data"]["STRIPE_KEY"]["value"]

# Filter by type, tags, search
results = client.secrets.list(
    search="API",
    secret_type="api-key",
    tags=["prod"],
    page_size=20,
)

# Update a value
client.secrets.update("STRIPE_KEY", value="sk_new_...")
```

**Inside a function body**, values decrypt transparently. Non-public secrets return `[ENCRYPTED]` when accessed via the MCP surface but return cleartext inside a function body.

## `sdk_client.users` — Users

```python
alice = client.users.get("alice")
me = client.auth.get_current_user()   # shortcut

# CRUD
client.users.create({
    "username": "bob",
    "email": "bob@example.com",
    "password": "...",
    "role_slugs": ["editor"],
})
client.users.update("bob", {"email": "bob-new@example.com"})
client.users.delete("bob")

# List
client.users.list(search="alice", is_active=True, page_size=50)

# Apps
client.users.apps("alice")

# Roles
client.users.assign_roles(roles=["editor"], usernames=["alice", "bob"], expires_at=None)
client.users.revoke_roles(roles=["editor"], usernames=["alice"])

# Preferences
prefs = client.users.get_preferences()
client.users.update_preferences({"theme": "dark", "language": "en"})
```

## `sdk_client.functions` — Functions (invoking other functions)

```python
# Sync execute
result = client.functions.execute(
    "send-email",
    params={"to": "x@y.com", "subject": "Hello"},
    is_async=False,
)
# result["data"]["result"] contains the return value

# Async
async_result = client.functions.execute("long-job", params={...}, is_async=True)
task_id = async_result["invocation"]["celery_task_id"]

# Poll for async result
import time
while True:
    status = client.functions.get_result(task_id)
    if status["data"]["status"] in ("SUCCESS", "FAILURE"):
        break
    time.sleep(2)

# List / inspect
client.functions.list()
client.functions.get("send-email")
client.functions.list_invocations("send-email")
client.functions.get_invocation(invocation_id)
```

## `sdk_client.auth` — Auth

```python
me = client.auth.get_current_user()

# Sign in — RETURNS A NEW CLIENT (immutable)
# Note: the auth module uses `email=` (not `username=`) despite older docstrings
new_client = client.auth.signInWithPassword(email="alice@example.com", password="...")
new_client = client.auth.signInWithToken(token="...", token_type="jwt")
new_client = client.auth.signInWithToken(token="...", token_type="api_key")

# Refresh — requires the refresh token explicitly
new_client = client.auth.refreshToken(refresh_token="your_refresh_jwt")

# Sign out
client.auth.signOut()
```

Token types: `"jwt"`, `"api_key"` (Knox), `"session_token"`.

## `sdk_client.policy` — Cerbos policy checks

```python
result = client.policy.check_resources(
    principal={"id": "alice", "roles": ["user"]},
    resources=[
        {"resource": "post:42", "actions": ["read", "update"]},
        {"resource": "post:43", "actions": ["read"]},
    ],
    aux_data={"region": "us-east"},   # optional
)

# result.results[i].actions — dict of action → "EFFECT_ALLOW"/"EFFECT_DENY"
```

## `sdk_client.analytics` — Analytics queries

```python
rows = client.analytics.execute(
    "daily-revenue",
    params={"start_date": "2026-04-01", "end_date": "2026-04-17"},
)
# rows["data"] — list of result rows
```

## `sdk_client.settings` — Site settings

```python
site = client.settings.get()        # site metadata singleton
```

## `sdk_client.app` — App-scoped resources

```python
roles = client.app.roles(app_slug="my-app")           # app-specific roles
settings = client.app.settings(app_slug="my-app")     # app settings
```

## Return shapes

All methods return `dict` (TypedDict under the hood — no Pydantic validation at runtime). Standard envelope:

```python
{"data": [...] or {...}, "total": int, "pagination": {...}, "status": "success"}
```

Errors raise typed exceptions from `taruvi.exceptions`:

```python
from taruvi.exceptions import (
    TaruviError,              # base
    ValidationError,          # 422
    AuthenticationError,      # 401 (missing/invalid credentials)
    NotAuthenticatedError,    # 401 (specific: no credentials at all)
    AuthorizationError,       # 403 (authenticated but not permitted)
    NotFoundError,            # 404
    ConflictError,            # 409
    RateLimitError,           # 429
    TimeoutError,             # 504
    NetworkError,             # network-level
)
```

Each exception has: `code`, `status_code`, `detail`, `errors` (field-keyed dict), `data`.
