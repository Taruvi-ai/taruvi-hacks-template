---
name: taruvi-backend-provisioning
description: Provision Taruvi backend resources via the Taruvi MCP server — datatables with Frictionless schemas, storage buckets, users, roles, Cerbos policies, serverless functions, analytics queries, secrets, tags, and audited raw SQL. Use when the user wants to create a datatable, add a role, write a Cerbos policy, provision a bucket, upsert schema, assign a role, register a function, run an analytics query, or otherwise change Taruvi's backend state. TRIGGERS include "Taruvi datatable", "Frictionless schema", "Cerbos policy", "manage_policies", "provision Taruvi", "upsert rows", "multi-tenant table", "Taruvi MCP tools", "create_update_schema", "delete_datatable", "execute_raw_sql". SKIP when writing Python code that runs inside a Taruvi function (use taruvi-functions) or building Refine UI (use taruvi-refine-frontend). Knows all 24 MCP tool contracts, correct invocation order, destructive-op protocol, and the Frictionless/Cerbos essentials the tools expect.
license: Apache-2.0
compatibility: Requires the Taruvi MCP server to be connected. Tools are prefixed `Taruvi:` when fully qualified.
metadata:
  author: EOX Vantage
  version: "1.0.0"
  organization: Taruvi
---

# Taruvi backend provisioning

Use the **Taruvi MCP server** to provision and modify backend resources. This skill covers tool selection, invocation order, the shapes the tools expect, and the gotchas that don't come through in tool descriptions.

This skill is the **control plane**. If you're writing Python that runs inside a deployed function, switch to `taruvi-functions`. If you're building a Refine frontend, switch to `taruvi-refine-frontend`.

**Compliance rule:** This skill's prescribed patterns (Frictionless schemas, MCP tool invocation order, destructive-op protocol) are mandatory. Do not invent endpoints, skip validation, or hardcode secrets. If a requirement cannot be met, stop and ask the user.

## Core principles

1. **Trust the MCP tool, not your memory.** The MCP server is authoritative for Taruvi's current behavior. Read tool responses carefully — they return structured IDs, slugs, and status you need for the next step.
2. **Verify before destructive ops.** `delete_datatable`, schema changes that drop columns, policy overwrites, and raw SQL DDL all cause irreversible or hard-to-reverse changes. Always plan → validate → execute for these.
3. **Frictionless schemas are upserts, not merges.** `create_update_schema` replaces table definitions — fields missing from your new payload are **dropped**, not preserved. Always inspect the current schema first.
4. **Cerbos policies are REPLACEMENTS.** `manage_policies(action="create_update")` fully replaces the policy body, not merged.
5. **Tenant context is ambient.** The MCP server resolves tenant + app from the session context. Do not try to pass tenant slugs in tool arguments unless a specific tool accepts `app_slug`.

## Tool index (24 tools)

Grouped by domain. See [references/mcp-tool-quickref.md](references/mcp-tool-quickref.md) for one-line signatures.

**Datatables (5):** `get_datatable_schema`, `create_update_schema`, `datatable_data`, `datatable_edges`, `delete_datatable`
**Storage (1):** `manage_storage` (sub-actions: list_buckets, create_bucket, list_objects, get_quota)
**Secrets (4):** `list_secrets`, `get_secret`, `create_update_secret`, `manage_secret_types`
**Users (3):** `list_users`, `create_user`, `update_user`
**User attributes (1):** `user_attributes_schema`
**Roles (2):** `manage_roles`, `manage_role_assignments`
**Functions (2):** `manage_function`, `execute_function`
**Policies (1):** `manage_policies`
**Analytics (2):** `manage_query`, `execute_query`
**Raw SQL (1):** `execute_raw_sql`
**Meta (2):** `manage_tags`, `get_ai_docs`

## Datatable provisioning

The most common workflow. See [references/datatable-schema-patterns.md](references/datatable-schema-patterns.md) for the full Frictionless reference.

### Creating a new datatable

1. **Inspect existing schema** (if the table might exist):
   ```
   get_datatable_schema(table_name="orders")
   ```
   Returns the current definition or a NOT_FOUND error.

2. **Prepare a Frictionless Data Package**. Minimal shape:
   ```json
   {
     "resources": [
       {
         "name": "orders",
         "schema": {
           "fields": [
             {"name": "id", "type": "string", "format": "uuid", "constraints": {"required": true}},
             {"name": "customer_id", "type": "string", "format": "uuid"},
             {"name": "total", "type": "number"},
             {"name": "created_at", "type": "datetime"}
           ],
           "primaryKey": ["id"]
         }
       }
     ]
   }
   ```

3. **Apply**:
   ```
   create_update_schema(datapackage={...})
   ```
   Materializes the physical PostgreSQL table automatically. Returns created/updated/error counts.

### Adding indexes, FKs, search, graph

Advanced features (indexes, foreign keys, populate, search, hierarchy/graph edges, column renames) live in [references/datatable-schema-patterns.md](references/datatable-schema-patterns.md). Read that file before authoring non-trivial schemas — the Frictionless shape has a lot of Taruvi-specific extensions (`indexes`, `hierarchy`, `graph`, `search_fields`, `x-rename-from`).

### CRUD on rows

```
datatable_data(action="query", table_name="orders", filters={"total__gte": 100}, limit=100)
datatable_data(action="upsert", table_name="orders", data=[{...}, {...}], unique_fields="id")
datatable_data(action="delete", table_name="orders", ids=[1, 2, 3])
datatable_data(action="delete", table_name="orders", filters={"status": "cancelled"})
```

(`limit` defaults to 100, capped at 1000. Omit the arg to use the default.)

Delete accepts `ids` **or** `filters` (exactly one, not both).

Filter operators follow DRF conventions: `field__gte`, `field__in=1,2,3`, `field__contains=foo`, `field__null=true`, etc.

### Graph edges (for hierarchy/graph-enabled tables)

```
datatable_edges(action="list", table_name="categories")
datatable_edges(action="create", table_name="categories", edges=[{"from_id": 1, "to_id": 2, "type": "parent"}])
datatable_edges(action="delete", table_name="categories", edge_ids=[10])
```

The table must have been created with graph/hierarchy enabled in its Frictionless schema.

### Deleting a datatable

**Destructive.** Drops the physical table, the edges table (if any), and the metadata row.

```
delete_datatable(table_name="orders")               # fails on FK dependencies
delete_datatable(table_name="orders", force=True)   # bypass FK checks — DANGEROUS
```

Always confirm with the user before passing `force=True`. Prefer the non-force call first so the error tells you what depends on the table.

## Users, roles, and policies

See [references/cerbos-policy-cookbook.md](references/cerbos-policy-cookbook.md) for policy authoring.

### Creating a user

`create_user` accepts `username`, `email`, optional `password` (generate one if omitted), `attributes` dict, and `role_slugs` list.

If the user hasn't specified roles, **list them first**:
```
manage_roles(action="list")
```
Pick an appropriate role from the response and assign via `role_slugs=["..."]` in the create call. **Do not prompt the user to select a role** — auto-select based on context (admin-level for admin users, least-privileged for regular users).

### Roles

```
manage_roles(action="list")
manage_roles(action="create", name="editor", description="...", parent_slug="viewer")
manage_roles(action="bulk_create", roles=[{"name": "..."}, ...])
manage_roles(action="delete", role_slug="editor")  # fails if role has members or children
```

### Role assignments

```
manage_role_assignments(action="assign", roles=["editor"], usernames=["alice", "bob"])
manage_role_assignments(action="revoke", roles=["editor"], usernames=["alice"])
```

Both `roles` and `usernames` accept a single value or list. Assignment supports `expires_at` (ISO datetime).

### User attributes schema

```
user_attributes_schema(action="get")
user_attributes_schema(action="update", schema={...})   # REPLACES the entire schema
```

Requires `manage_site` cloud permission. The schema is JSON Schema Draft 2020-12 and is tenant-wide (singleton). **Required:** call `get_ai_docs(category="users", topic="attributes")` before authoring a schema from scratch.

### Cerbos policies

```
manage_policies(action="create_update", policy_data={...})  # REPLACES, does not merge
manage_policies(action="get", policy_id="...")
manage_policies(action="get", name_regexp="order.*")        # list with filter
manage_policies(action="enable", policy_id="...")
manage_policies(action="disable", policy_id="...")
```

Policy authoring is non-trivial. **Required:** before writing a policy from scratch, call `get_ai_docs(category="policies", topic="guide")` or load [references/cerbos-policy-cookbook.md](references/cerbos-policy-cookbook.md).

## Storage

```
manage_storage(action="list_buckets")
manage_storage(action="create_bucket", name="uploads", visibility="private", app_category="attachments", max_size_bytes=10485760)
manage_storage(action="list_objects", bucket_slug="uploads", prefix="2026/", limit=50)
manage_storage(action="get_quota", bucket_slug="uploads")
```

`app_category` is required for `create_bucket` and must be `"assets"` or `"attachments"`. The bucket's RLS policy is created automatically by the serializer.

## Secrets

See [references/secrets-and-types.md](references/secrets-and-types.md).

Before creating a secret, **a secret type must exist** that matches the value's shape. System types (OAuth creds, API keys, etc.) are pre-provisioned; create custom types as needed:

```
manage_secret_types(action="list")
manage_secret_types(action="create", name="stripe-cred", description="...", schema={...}, sensitivity_level="sensitive")
```

Use `manage_secret_types` for type CRUD. `list_secrets(list_types=True)` is a convenience alias for listing types only.

Then:
```
create_update_secret(key="STRIPE_KEY", value="sk_live_...", secret_type="stripe-cred", tags=["prod"])
get_secret(key="STRIPE_KEY")              # returns [ENCRYPTED] for non-public sensitivities
list_secrets(secret_type="stripe-cred")
```

Sensitivity levels: `public` (value returned verbatim), `private`, `sensitive` (value masked in responses).

## Functions (registration)

```
manage_function(action="list")
manage_function(
    action="create_update",
    name="send-email",
    execution_mode="app",
    code="def main(params, user_data, sdk_client): ...",
    description="...",
    is_active=True,
    is_public=False,        # if True, function is callable without authentication
    async_mode=False,        # if True, execution returns a task_id instead of a result
    config={...},            # optional runtime config (timeouts, env)
    auth_config={...},       # optional auth policy override
    headers={...},           # optional default request headers
    tags=["notifications"],  # optional tag slugs
)
manage_function(action="get", function_slug="send-email")
manage_function(action="delete", function_slug="send-email")
execute_function(function_slug="send-email", params={...}, async_mode=False)
```

Execution modes: `app` (Python body runs in Taruvi runtime), `proxy` (forwards to `webhook_url`), `system` (privileged).

**Security note on `is_public=True`:** public functions run unauthenticated (`user_data` is `None`). Verify a shared secret or signature from the caller in the function body before trusting `params`. The function body should assume the input is adversarial.

**For writing the actual function body**, switch to `taruvi-functions`. This skill only registers the metadata; the body must follow the runtime conventions documented there.

## Analytics queries

```
manage_query(action="create", name="daily-revenue", query_text="SELECT ...", connection_type="internal", tags=["reporting"])
manage_query(action="list")
manage_query(action="get", query_slug="daily-revenue")
manage_query(action="update", query_slug="daily-revenue", query_text="SELECT ...", description="Updated")
manage_query(action="delete", query_slug="daily-revenue")
execute_query(query_slug="daily-revenue", params={"date": "2026-04-17"})
```

`connection_type` is `"internal"` (against tenant DB) or `"external"` (requires a `secret_key` that resolves to a DB credential). **Default is `"external"`** — pass `connection_type="internal"` explicitly when you want to query the tenant DB. For external queries, create the credential secret first.

## Raw SQL

See [references/raw-sql-safety.md](references/raw-sql-safety.md).

```
execute_raw_sql(sql="SELECT ...", params={"min_total": 100}, max_rows=1000)
execute_raw_sql(sql="ALTER TABLE orders ADD COLUMN ...", auto_reflect=True)
```

- Tool rejects cross-tenant access, system schemas, view/trigger/function DDL.
- DDL commits before any following DML in the same batch (don't mix in one call).
- DML is audited to `alembic_revision_history`.
- Prefer `datatable_data` over raw DML. Prefer `create_update_schema` over raw DDL. Use raw SQL only when MCP tools can't express what you need.

## Destructive-op protocol

Always plan-validate-execute for:

- `delete_datatable` (especially with `force=True`)
- `manage_policies(action="create_update")` on an existing policy (full replacement)
- `user_attributes_schema(action="update")` (replaces the whole schema)
- `manage_secret_types(action="delete")`
- `execute_raw_sql` containing `DROP`, `TRUNCATE`, destructive `ALTER`, or `DELETE` without `WHERE`
- `manage_function(action="delete")`, `manage_roles(action="delete")`

Procedure:
1. **Plan** — state what will be deleted/replaced and what depends on it. Use `get_datatable_schema`, `manage_policies(action="get")`, etc. to inspect current state.
2. **Validate** — surface the blast radius to the user in plain language ("This will drop the `orders` table and 3 dependent FK constraints in `invoices`"). Ask for explicit confirmation.
3. **Execute** — only after confirmation. Report back with the tool's response verbatim.

## Gotchas

1. **`create_update_schema` drops missing fields.** Always `get_datatable_schema` first so your new payload preserves fields that must stay.
2. **`create_user` without `role_slugs` creates an unroled user.** See the "Creating a user" section above for the required workflow. Generate a password (12+ chars, mix of classes) if the user didn't provide one.
3. **`manage_policies(action="create_update")` replaces, not merges.** Get the existing policy first if you only want to change part of it.
4. **`delete_datatable` without `force=True` fails on FK deps.** The error lists what depends on the table — read it carefully before suggesting `force=True`.
5. **Secret type `sensitivity_level` is immutable post-create.** System types cannot be modified at all. Choose sensitivity carefully — the only fix is delete and recreate.
6. **`execute_raw_sql` DDL commits immediately**, even if a later statement in the same batch fails. The tool warns when you mix DDL + DML.
7. **`manage_storage(action="create_bucket")` requires `app_category`**. Pick `"assets"` (public-ish static content) or `"attachments"` (user-uploaded files).
8. **User updates don't accept password changes.** Use a separate password-reset flow (outside this MCP surface).
9. **`update_user` attributes are merged, not replaced.** Passing `attributes={"dept": "sales"}` adds/overwrites `dept` but preserves other existing attributes. This is the opposite of `user_attributes_schema(action="update")` which replaces the whole schema.
10. **`manage_role_assignments` accepts strings or lists** for both `roles` and `usernames`. Single-value semantics are fine; check the `is_bulk` flag in the response.
11. **The `is_active=True` default on `list_users`** silently hides inactive users. Pass `is_active=False` or a different filter if you need all users.
12. **`manage_function(action="get")` only returns active functions.** A deactivated function returns "not found", not "inactive". Use `manage_function(action="list")` to see all functions including inactive ones.

## Verification checklist

After any provisioning task, confirm before reporting done:

- [ ] For new/updated tables: `get_datatable_schema(table_name=...)` returns the expected shape (fields, PK, FKs, indexes).
- [ ] For any new table with data-plane consumers: a Cerbos policy exists (`manage_policies(action="get", name_regexp="^datatable:<name>$")`) and is enabled.
- [ ] For new roles: `manage_roles(action="list")` shows the role with the correct parent (if hierarchical).
- [ ] For role assignments: verify a test user has the role via `list_users(role_slug=...)` or the user's apps/roles lookup.
- [ ] If Cerbos policies were created or access control is configured: ALWAYS create test users for each role via `create_user` with `role_slugs` (app roles from `manage_roles`). Report their usernames and passwords so the user can test login and verify permissions work correctly. Do not skip this unless the user explicitly says no user creation.
- [ ] If NO access control is configured: still create at least one test user so the user can log in and test the app. Report username and password.
- [ ] Test user naming must be deterministic: `qa_<role_slug>_<YYYYMMDD>` (example: `qa_warehouse_staff_20260422`).
- [ ] Test user passwords must be strong and unique (12+ chars with upper/lower/digit/symbol), then reported with usernames in the final output.
- [ ] Include cleanup guidance in the final output: either deactivate/delete created `qa_*` users after validation or rotate their passwords.
- [ ] For new buckets: `manage_storage(action="list_buckets")` returns the bucket with the intended `visibility` and `app_category`.
- [ ] For new functions: `manage_function(action="get", function_slug=...)` returns the metadata; if the code was just updated, confirm the `code` field matches. **Then execute it** with `execute_function(function_slug=..., params={...})` to verify it runs without errors. Check the response format — the frontend code must use the exact field names and structure returned. If they don't match, fix the frontend to align with the backend response.
- [ ] For new analytics queries: `manage_query(action="get", query_slug=...)` returns the query. **Then execute it** with `execute_query(query_slug=..., params={...})` to verify it returns data. Check column names and types — the frontend code must reference the exact column names returned. If they don't match, fix the frontend to align with the query response.
- [ ] For new secrets: `get_secret(key=...)` returns the right type and (for public) the expected value.
- [ ] For any destructive op (delete_datatable, raw SQL DROP/TRUNCATE, policy replace): the plan was surfaced to the user and explicit confirmation was captured.
- [ ] No workflow instructions were added to MCP tool descriptions — that content belongs here in the skill.

If any item fails, fix it before presenting the work as done.

## When you get stuck

- Backend query capabilities (filter operators, aggregation, storage/user filters): [references/backend-capabilities.md](references/backend-capabilities.md).
- Tool-level docs: `get_ai_docs(category="policies"|"sdk"|"users", topic="guide"|"attributes")`.
- MCP quickref: [references/mcp-tool-quickref.md](references/mcp-tool-quickref.md).
- Frictionless schema detail: [references/datatable-schema-patterns.md](references/datatable-schema-patterns.md).
- Cerbos policy examples: [references/cerbos-policy-cookbook.md](references/cerbos-policy-cookbook.md).
- Secret type schemas: [references/secrets-and-types.md](references/secrets-and-types.md).
- Raw SQL rules: [references/raw-sql-safety.md](references/raw-sql-safety.md).
- Analytics queries: [references/analytics-queries.md](references/analytics-queries.md).
- Drift check: `bash scripts/check-versions.sh` in this skill directory.
