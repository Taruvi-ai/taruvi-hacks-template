# Python SDK — Full Resource Reference

The injected `sdk_client` in APP mode functions is a pre-authenticated `SyncClient`. Use it directly — never re-authenticate.

---

## Database

### Query Builder

```python
# Simple query
result = sdk_client.database.from_("users").execute()
# Returns: {"data": [...], "total": N}

# With filters, sort, pagination
result = (
    sdk_client.database.from_("users")
    .filter("is_active", "eq", True)
    .filter("age", "gte", 18)
    .sort("created_at", "desc")
    .page(1)
    .page_size(20)
    .execute()
)
```

**Filter operators:** `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `contains`, `startswith`, `endswith`

### CRUD Helpers

```python
# Create — single or bulk
sdk_client.database.create("users", {"username": "alice", "email": "alice@example.com"})
sdk_client.database.create("users", [{"username": "alice"}, {"username": "bob"}])

# Get by ID
sdk_client.database.get("users", record_id=123)

# First match
first = sdk_client.database.from_("users").filter("email", "eq", params["email"]).first()

# Count
total = sdk_client.database.from_("users").filter("is_active", "eq", True).count()

# Update single
sdk_client.database.update("users", record_id=123, data={"is_active": False})
# Bulk update (each dict must include "id")
sdk_client.database.update("users", record_id=[{"id": 1, "status": "x"}, {"id": 2, "status": "y"}])

# Delete by ID / bulk / filter
sdk_client.database.delete("users", record_id=123)
sdk_client.database.delete("users", ids=[123, 456])
sdk_client.database.delete("users", filter={"is_active": False})
```

### Aggregations

```python
result = (
    sdk_client.database.from_("orders")
    .aggregate("sum(total_amount)", "count(*)")
    .group_by("status")
    .having("count(*) > 5")
    .execute()
)
# result["data"] → [{ status, sum_total_amount, count }]
```

Supported functions: `sum`, `avg`, `count`, `min`, `max`, `array_agg`, `string_agg`, `json_agg`, `stddev`, `variance`

### Full-Text Search

```python
result = (
    sdk_client.database.from_("articles")
    .search("machine learning")
    .page_size(10)
    .execute()
)
# Requires a search_vector field (PostgreSQL tsvector)
```

### Populate (Foreign Keys)

```python
result = (
    sdk_client.database.from_("orders")
    .populate("customer", "product")
    .execute()
)
```

### Edges (Graph Relationships)

```python
# Create edges
result = (
    sdk_client.database.from_("employees")
    .edges()
    .create([
        {"source_id": 1, "target_id": 2, "relationship_type": "manager"},
    ])
    .execute()
)

# Query edges with filter
result = (
    sdk_client.database.from_("employees")
    .edges()
    .filter("relationship_type", "eq", "manager")
    .execute()
)

# Update / Delete edge
sdk_client.database.from_("employees").edges().get(5).update({"relationship_type": "dotted_line"}).execute()
sdk_client.database.from_("employees").edges().delete([5, 6, 7]).execute()
```

### Graph Traversal

```python
result = (
    sdk_client.database.from_("employees")
    .get(1)
    .format("tree")           # "tree" or "graph"
    .include("descendants")   # "descendants", "ancestors", "both"
    .depth(3)
    .types(["manager"])
    .execute()
)
```

---

## Functions

```python
# Execute sync (wait for result)
result = sdk_client.functions.execute("send-email", params={"to": "a@b.com"})

# Execute async (fire and forget — returns task_id)
result = sdk_client.functions.execute("heavy-task", params={...}, is_async=True)
task_id = result["invocation"]["celery_task_id"]

# Poll async result
task_result = sdk_client.functions.get_result(task_id)
# status: "SUCCESS", "FAILURE", "PENDING"

# Function management
sdk_client.functions.list(limit=50, offset=0)
sdk_client.functions.get("process-order")
sdk_client.functions.get_invocation("invocation-uuid")
sdk_client.functions.list_invocations(function_slug="process-order", status="SUCCESS", limit=20)
```

---

## Storage

### Bucket Management

```python
sdk_client.storage.list_buckets(search="images", visibility="public", page=1, page_size=20)

sdk_client.storage.create_bucket(
    "User Uploads",
    slug="user-uploads",
    visibility="private",
    file_size_limit=10485760,       # 10MB per file
    allowed_mime_types=["image/jpeg", "image/png"],
    max_size_bytes=1073741824,      # 1GB total
    max_objects=1000
)

sdk_client.storage.get_bucket("user-uploads")
sdk_client.storage.update_bucket("user-uploads", visibility="public", file_size_limit=20971520)
sdk_client.storage.delete_bucket("old-bucket")  # WARNING: deletes all files
```

### File Operations

```python
import io

# List files
files = sdk_client.storage.from_("user-uploads").filter(mimetype_category="image").list()

# Upload
uploaded = sdk_client.storage.from_("user-uploads").upload(
    files=[("photo.jpg", io.BytesIO(params["file_data"]))],
    paths=["users/123/photo.jpg"],
    metadatas=[{"description": "Profile photo"}]
)

# Download
file_bytes = sdk_client.storage.from_("user-uploads").download("users/123/photo.jpg")

# Update metadata / visibility
sdk_client.storage.from_("user-uploads").update(
    "users/123/photo.jpg",
    metadata={"description": "Updated"},
    visibility="public"
)

# Delete (bulk)
sdk_client.storage.from_("user-uploads").delete(["photo1.jpg", "photo2.jpg"])

# Copy / Move
sdk_client.storage.from_("user-uploads").copy_object("photo.jpg", "photo-backup.jpg", destination_bucket="backups")
sdk_client.storage.from_("user-uploads").move_object("photo.jpg", "archive/old-photo.jpg")
```

---

## Secrets

```python
# Get single secret (2-tier inheritance via client's app_slug)
secret = sdk_client.secrets.get("DATABASE_URL")
# Access value: secret["value"]

# Get with explicit app context or tag validation
secret = sdk_client.secrets.get("STRIPE_KEY", app="production")
secret = sdk_client.secrets.get("API_KEY", tags=["payment", "production"])

# List all secrets
result = sdk_client.secrets.list()
# result["data"] → list of secrets, result["total"] → count

# List with filters
result = sdk_client.secrets.list(search="API", secret_type="api_key", tags=["production"], page_size=50)

# Batch get by keys (single request)
result = sdk_client.secrets.list(keys=["API_KEY", "DATABASE_URL", "STRIPE_KEY"])
result = sdk_client.secrets.list(keys=["API_KEY"], include_metadata=True)
```

---

## Users

```python
# List users
users = sdk_client.users.list()
active = sdk_client.users.list(search="alice", is_active=True, roles="admin,editor", page=1, page_size=20)
dept_users = sdk_client.users.list(department_id=123, is_active=True)

# Get by username or ID
user = sdk_client.users.get("alice")

# Create
new_user = sdk_client.users.create({
    "username": "bob", "email": "bob@example.com",
    "password": "secret", "confirm_password": "secret",
    "first_name": "Bob", "last_name": "Smith", "is_active": True
})

# Update
sdk_client.users.update("bob", {"email": "bob.new@example.com", "is_active": False})

# Delete
sdk_client.users.delete("bob")

# Role management (max 100 roles/usernames per call)
sdk_client.users.assign_roles(roles=["editor"], usernames=["alice", "bob"], expires_at="2025-12-31T23:59:59Z")
sdk_client.users.revoke_roles(roles=["editor"], usernames=["alice"])

# Get user apps
apps = sdk_client.users.apps("alice")

# User preferences
prefs = sdk_client.users.get_preferences()
sdk_client.users.update_preferences({"theme": "dark", "timezone": "Asia/Kolkata"})
```

---

## Analytics

```python
result = sdk_client.analytics.execute("monthly-revenue", params={
    "start_date": "2024-01-01",
    "end_date": "2024-12-31"
})
# result["data"] → query results
```

---

## App Settings & Site Settings

```python
# App settings (display_name, colors, icon, URLs, etc.)
settings = sdk_client.app.settings()

# App roles
roles = sdk_client.app.roles()

# Site metadata
site_settings = sdk_client.settings.get()
```

---

## Policy (Authorization)

Always pass `principal=None` — the server auto-resolves the authenticated user.
The `kind` field format: `entity_type:resource_name` (e.g., `"datatable:orders"`).

```python
# Check resources
result = sdk_client.policy.check_resources(
    resources=[{
        "resource": {"kind": "datatable:orders", "id": "orders"},
        "actions": ["read", "update", "delete"]
    }],
    principal=None
)
# result["results"][0]["actions"]["read"] → "EFFECT_ALLOW" or "EFFECT_DENY"

# Custom entity type with attributes
result = sdk_client.policy.check_resources(
    resources=[{
        "resource": {
            "kind": "invoice:sales_invoices",
            "id": "inv_001",
            "attr": {"owner_id": user_data["id"], "status": "pending"}
        },
        "actions": ["read", "approve", "delete"]
    }],
    principal=None
)

# Filter to only allowed resources
allowed = sdk_client.policy.filter_allowed(
    resources=[
        {"kind": "datatable:users", "id": "users"},
        {"kind": "datatable:orders", "id": "orders"},
    ],
    actions=["read", "update"],
    principal=None
)

# Get allowed actions for one resource
allowed_actions = sdk_client.policy.get_allowed_actions(
    {"kind": "datatable:users", "id": "users"},
    actions=["read", "create", "update", "delete"]
)
```

---

## Allowed Modules in Sandbox

Standard library: `json`, `datetime`, `re`, `math`, `random`, `collections`, `itertools`, `functools`, `string`, `decimal`, `uuid`, `base64`, `hashlib`, `urllib`, `heapq`, `bisect`, `csv`, `statistics`, `copy`, `warnings`, `time`, `io`, `logging`

HTTP: `requests`, `httpx`, `urllib3`

Data: `numpy`, `pandas`

Formats: `yaml`, `tomli`, `tomllib`, `xml`

Date/Time: `dateutil`, `pytz`

Text: `jinja2`, `markdown`

Crypto: `cryptography`, `jwt`

Validation: `pydantic`, `jsonschema`

Database: `psycopg2`, `sqlalchemy`

Cloud: `boto3`, `botocore`

AI/LLM: `openai`, `anthropic`, `langchain`
