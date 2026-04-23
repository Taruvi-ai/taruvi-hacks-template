# `meta` options cookbook

Every Taruvi-specific meta field with copy-paste examples.

## Core meta fields

### `meta.populate`

Expand foreign-key relations in list/detail responses.

```typescript
// Single field
meta: { populate: "author" }

// Multiple
meta: { populate: "author,category" }
meta: { populate: ["author", "category"] }

// All one-hop FKs
meta: { populate: "*" }

// Nested (dot syntax)
meta: { populate: "author,author.organization" }
```

Maps to `?populate=author,author.organization` in the query string.

### `meta.idColumnName`

Override the PK column name (default `"id"`).

```typescript
useOne({
  resource: "user_profiles",
  id: 123,
  meta: { idColumnName: "user_id" },
});
```

Required for `update`, `updateMany`, `deleteOne`, `deleteMany` on tables with non-`id` PKs.

### `meta.tableName`

Decouple the Refine resource name from the Taruvi table name.

```typescript
resources: [
  { name: "active_users", list: "/users" },   // UI-friendly name
]

// In hooks
useList({
  resource: "active_users",
  meta: { tableName: "users" },           // Actual Taruvi table
  filters: [{ field: "is_active", operator: "eq", value: true }],
});
```

### `meta.headers`

Custom headers on the underlying request. Useful for tracing IDs, correlation IDs, or one-off auth overrides.

```typescript
useList({
  resource: "orders",
  meta: {
    headers: {
      "X-Request-ID": crypto.randomUUID(),
      "X-Correlation-ID": correlationId,
    },
  },
});
```

### `meta.select`

Field projection — tell Taruvi to return only the listed columns. Reduces payload size on wide tables.

```typescript
useList({
  resource: "orders",
  meta: {
    select: ["id", "total", "status"],   // or a single string: "id,total,status"
  },
});
```

Not all providers enforce this; when unsupported, the response includes the full row and `select` is ignored silently.

### `meta.bucketName` (storage provider)

Override storage resource → bucket mapping.

```typescript
useList({
  dataProviderName: "storage",
  resource: "user-assets",
  meta: { bucketName: "user-uploads-prod" },
});
```

### `meta.aggregate`, `meta.groupBy`, `meta.having`

SQL-style aggregation on list queries.

```typescript
useList({
  resource: "orders",
  meta: {
    aggregate: ["sum(total)", "avg(total)", "count(*)"],
    groupBy: ["status", "customer_id"],
    having: [
      { field: "sum(total)", operator: "gte", value: 1000 },
    ],
  },
});
```

Response rows contain the group-by fields + one column per aggregate expression (named as the expression itself).

### `meta.upsert`

Use upsert semantics on `create`. Conflict resolution on the PK (or the unique constraint on `idColumnName` if set).

```typescript
useCreate();
mutate({
  resource: "users",
  values: { id: 42, email: "updated@example.com" },
  meta: { upsert: true },
});
```

### `meta.deleteByFilter`

Delete rows matching filters, rather than by IDs.

```typescript
useDeleteMany();
mutate({
  resource: "sessions",
  meta: {
    deleteByFilter: true,
    filters: [{ field: "expires_at", operator: "lt", value: new Date().toISOString() }],
  },
});
```

Leave `ids` empty when using this; the provider routes on the `deleteByFilter` flag.

### `meta.allowedActions`

Request per-row permissions in list responses. Each row gets `_allowed_actions: ["update", "delete"]` or similar, based on Cerbos evaluation.

```typescript
useList({
  resource: "posts",
  meta: { allowedActions: ["update", "delete"] },
});
```

Use with `useCan` for per-row UI gating.

## Graph meta

### `meta.format`

- `"tree"` — returns nested `{ id, children: [...] }`. Requires `hierarchy.enabled` on the table.
- `"graph"` — returns flat `{ nodes, edges }`. Requires `graph.enabled`.

### `meta.include`

- `"descendants"` — only downward traversal.
- `"ancestors"` — only upward traversal.
- `"both"` — both directions (graph format only).

### `meta.depth`

How many hops to traverse. Default 1.

```typescript
useList({
  resource: "categories",
  meta: {
    format: "tree",
    include: "descendants",
    depth: 3,
  },
});
```

### `meta.graph_types`

Filter to specific edge types (graph format).

```typescript
useList({
  resource: "skills",
  meta: {
    format: "graph",
    include: "both",
    depth: 2,
    graph_types: ["prerequisite", "related"],
  },
});
```

## Storage meta

### `meta.metadata`

On `getOne`, return the file's metadata object instead of downloading the blob.

```typescript
useOne({
  dataProviderName: "storage",
  resource: "user-uploads",
  id: "alice/avatar.png",
  meta: { metadata: true },
});
```

Without `metadata: true`, returns a `Blob`.

### Storage filters (on `getList`)

The storage provider accepts filter operators on:

- `size` — file size in bytes (`size__gte`, `size__lte`)
- `created_at` — timestamp (`created_at__gte`, `created_at__lte`)
- `filename` — name (`filename__contains`)
- `mimetype` — MIME type (`mimetype__in=image/png,image/jpeg`)
- `visibility` — `public` | `private`
- `created_by` — uploader username

```typescript
useList({
  dataProviderName: "storage",
  resource: "user-uploads",
  filters: [
    { field: "size", operator: "gte", value: 1000 },
    { field: "mimetype", operator: "in", value: ["image/png", "image/jpeg"] },
  ],
  meta: { prefix: "alice/" },
});
```

`meta.prefix` is a path prefix filter (common for "list files under a folder").

## App provider meta

### `meta.kind`

Used with `useCustom` to switch between function and analytics execution:

- `meta.kind: "function"` — `url` is the function slug, body is posted as `params`.
- `meta.kind: "analytics"` — `url` is the analytics query slug, body is posted as `params` for Jinja2 templating.

```typescript
// Execute a function
useCustom({
  dataProviderName: "app",
  url: "send-email",
  method: "post",
  config: { payload: { to: "x@y.com" } },
  meta: { kind: "function" },
});

// Execute an analytics query
useCustom({
  dataProviderName: "app",
  url: "daily-revenue",
  method: "post",
  config: { payload: { date: "2026-04-17" } },
  meta: { kind: "analytics" },
});
```

### `meta.keys` (for `getList("secrets")`)

Batch-fetch secrets by exact key list. **Required** for `getList` on the `secrets` resource.

```typescript
useList({
  dataProviderName: "app",
  resource: "secrets",
  meta: {
    keys: ["STRIPE_KEY", "API_URL", "SMTP_HOST"],
    app: "my-app",       // optional; defaults to current app
    includeMetadata: false,
  },
});
```

### `meta.tags`, `meta.app` (for `getOne("secrets")`)

Scope a single secret lookup.

```typescript
useOne({
  dataProviderName: "app",
  resource: "secrets",
  id: "STRIPE_KEY",
  meta: {
    app: "my-app",
    tags: ["prod"],
  },
});
```

## App provider gotchas

- **Missing `dataProviderName: "app"`** — forgetting it routes to the database provider, returning "resource not found."
- **Missing `meta.kind: "function"`** — without it, the app provider throws an error.
- **Function slug mismatch** — `url` must be the exact function slug, not the display name.
- **Sync timeout** — functions >30s time out on sync calls. Use `meta: { kind: "function", async: true }`.
- **Frontend cascade** — multi-resource operations chained in frontend code is a bug. Move to a single backend function.
- **Keep payloads small** — move multi-step side effects into backend function code, not frontend.

## User provider meta

### `meta.username`

For `getList("roles")` and `getList("apps")` via the user provider — scope to a specific user.

```typescript
useList({
  dataProviderName: "user",
  resource: "roles",
  meta: { username: "alice" },
});
```

## Summary table

| Provider | Key meta fields |
|---|---|
| `default` | `populate`, `idColumnName`, `tableName`, `aggregate`, `groupBy`, `having`, `upsert`, `deleteByFilter`, `allowedActions`, `format`, `include`, `depth`, `graph_types`, `select`, `headers` |
| `storage` | `bucketName`, `metadata`, `prefix` |
| `app` | `kind`, `keys`, `tags`, `app`, `includeMetadata` |
| `user` | `username` |

Cross-cutting fields (supported on most providers): `headers` (custom request headers) and `select` (field projection).
