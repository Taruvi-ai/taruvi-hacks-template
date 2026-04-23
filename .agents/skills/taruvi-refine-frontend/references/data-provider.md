# `dataProvider` (default) — full API

The `dataProvider(client)` factory returns a Refine `DataProvider` wired to Taruvi datatables. Every Refine CRUD hook routes through this when `dataProviderName` is omitted or `"default"`.

## `getList`

```typescript
useList({
  resource: "posts",                              // → table name (or meta.tableName)
  filters: [{ field: "status", operator: "eq", value: "published" }],
  sorters: [{ field: "created_at", order: "desc" }],
  pagination: { currentPage: 1, pageSize: 20 },
  meta: {
    populate: ["author"],
    aggregate: ["count(*)"],
    groupBy: ["status"],
    allowedActions: ["update", "delete"],
  },
});
```

Returns `{ data: T[], total: number }`.

## `getOne`

```typescript
useOne({
  resource: "posts",
  id: 123,
  meta: {
    populate: ["author", "comments"],
    idColumnName: "post_id",   // if PK isn't "id"
  },
});
```

## `getMany`

Batch fetch by IDs.

```typescript
useMany({
  resource: "posts",
  ids: [1, 2, 3],
  meta: { populate: "*" },
});
```

## `create`

```typescript
const { mutate } = useCreate();

mutate({
  resource: "posts",
  values: { title: "...", body: "...", author_id: 1 },
  meta: { upsert: true },    // upsert by PK if it exists
});
```

For graph edges (when the resource is graph-enabled and `meta.format` etc. are set), `create` routes through the edges API instead — creates a new edge rather than a node.

## `createMany`

Sequential creates; returns array of created rows.

```typescript
useCreateMany({
  resource: "posts",
  values: [{...}, {...}, {...}],
});
```

## `update`

```typescript
const { mutate } = useUpdate();

mutate({
  resource: "posts",
  id: 42,
  values: { status: "archived" },
});
```

## `updateMany`

Uses `bulkUpdate` under the hood. **Requires `meta.idColumnName`** if the PK isn't `"id"` — otherwise the bulk-update payload mapping fails.

```typescript
useUpdateMany({
  resource: "posts",
  ids: [1, 2, 3],
  values: { status: "archived" },
});
```

## `deleteOne`

```typescript
useDelete();

mutate({
  resource: "posts",
  id: 42,
});
```

For graph edges: `id` is cast to number and sent to the edges delete endpoint.

## `deleteMany`

```typescript
useDeleteMany({
  resource: "posts",
  ids: [1, 2, 3],
});
```

Or by filter:

```typescript
useDeleteMany({
  resource: "posts",
  meta: {
    deleteByFilter: true,
    filters: [{ field: "status", operator: "eq", value: "spam" }],
  },
});
```

## `custom`

Direct HTTP. Use for endpoints that don't fit the CRUD model.

```typescript
useCustom({
  url: "reports/daily",          // appended to /api/apps/{appSlug}/datatables/
  method: "get",
  config: { query: { date: "2026-04-17" } },
});
```

Works with GET, POST, PUT, PATCH, DELETE.

## Filter operator mapping (partial — see filter-operators.md)

Refine filter operators map to Taruvi DRF-style query params:

| Refine | Taruvi query |
|---|---|
| `eq` | `field=value` (no suffix) |
| `ne` | `field__ne=value` |
| `gte` | `field__gte=value` |
| `in` | `field__in=a,b,c` |
| `contains` | `field__contains=x` |
| `icontains` | `field__icontains=x` |
| `null` | `field__null=true` |
| `between` | `field__between=10,100` |

Full table: [filter-operators.md](filter-operators.md).

## Sort

```typescript
sorters: [
  { field: "created_at", order: "desc" },
  { field: "title", order: "asc" },
]
```

Maps to `ordering=-created_at,title` (DRF convention: prefix `-` for descending).

## Pagination

- `{ currentPage: 1, pageSize: 20 }` → `page=1&page_size=20`.
- Taruvi's data API supports both page-based and cursor-based. Refine uses page-based; cursor isn't exposed through the provider.

## Response envelope

Underneath, Taruvi returns:

```json
{
  "status": "success",
  "data": [...],
  "total": 100,
  "pagination": { "current_page": 1, "page_size": 20, "has_next": true, ... }
}
```

The provider unwraps this to `{ data, total }` per Refine's contract.

## Errors

- 401 → `authProvider.onError` clears tokens, redirects to `/login`.
- 403 → surfaces as an Error to Refine's `isError`/`error`.
- 404 → `NotFoundError` class instance.
- 422 → validation errors in `error.errors` field-keyed map.

## Graph queries

When `meta` contains any of `format`, `include`, `depth`, `graph_types`, the provider routes through the graph endpoint instead of the normal data endpoint. The response structure differs:

- `format: "tree"` → nested `{ id, children: [...] }` structure.
- `format: "graph"` → flat `{ nodes: [...], edges: [...] }`.

The provider returns the graph structure in `data` as-is. Your component handles the shape.

## Dashboards and KPIs — aggregate server-side

A frequent mistake: fetching a page of rows client-side and counting / summing in React. That works for 10 rows, breaks at 10,000. Always push aggregation to the server.

### Single-table metrics → `meta.aggregate` + `meta.groupBy`

"Orders by status" needs only the `orders` table:

```typescript
const { data } = useList({
  resource: "orders",
  meta: {
    aggregate: ["count(*)"],
    groupBy: ["status"],
  },
  pagination: { mode: "off" },
});
// data.data: [{ status: "pending", "count(*)": 12 }, { status: "shipped", "count(*)": 98 }, ...]
```

### Multi-table metrics → analytics query via `useCustom`

"Revenue by department" needs `orders` + `departments` — two tables, so a datatable-level aggregate can't express it. Register an analytics query via MCP (see `taruvi-backend-provisioning`) and call it:

```typescript
const { data } = useCustom({
  dataProviderName: "app",
  url: "revenue-by-department",       // analytics query slug
  method: "post",
  config: { payload: { period: "last_30_days" } },
  meta: { kind: "analytics" },
});
```

### Decision rule

Before writing a dashboard query, ask: **does this metric need data from more than one table?**

- **1 table** → `useList` with `meta.aggregate` / `meta.groupBy`
- **2 or more tables** → registered analytics query via `useCustom` + `meta.kind: "analytics"`
- **Row fetch + derive in React** → never (for dashboard/summary metrics)

Example: "revenue by department" needs orders + departments = 2 tables → analytics. "Orders by status" only needs orders = 1 table → datatable aggregate.

### End-to-end analytics flow

1. **Create the query** via MCP: `manage_query(action="create", name="Revenue by Department", query_text="SELECT ...", connection_type="internal")`
2. **Call from frontend**: `useCustom({ url: "revenue-by-department", method: "post", dataProviderName: "app", config: { payload: {} }, meta: { kind: "analytics" } })`
3. **Parameterize** with Jinja2: use `{{ start_date }}` in SQL, pass via `config.payload: { start_date: "2024-01-01" }`

For internal queries (same database as datatables), use `connection_type: "internal"` — no secret needed.

### Analytics gotchas

- **Missing `dataProviderName: "app"`** — routes to database provider, returns "resource not found."
- **Missing `meta.kind: "analytics"`** — app provider throws an error.
- **Query slug mismatch** — `url` must be the exact slug from `manage_query`, not the display name.
- **Using datatable aggregate for cross-table data** — if the metric needs data from 2 or more tables, `aggregate`/`groupBy` cannot express it. Use analytics.
- **Client-side data merging** — fetching from 2 tables separately and combining in React is fragile and breaks pagination. Push cross-table logic to a saved query.

## Underscore fields on responses

Rows returned from Taruvi may include the server-side field:

- `_allowed_actions` — populated when `meta.allowedActions` was set; array of per-row permitted actions (e.g., `["update", "delete"]`). Computed by Taruvi via Cerbos; the provider passes it through.

This lets list pages gate per-row UI (edit/delete buttons) without a per-row `useCan` round-trip.

## Gotchas

- **N separate queries for a dashboard** — separate `useList` calls per status/category is a performance bug. Replace with one `groupBy` query for single-table data, or a saved analytics query if the element needs data from 2 or more tables.
- **Full row fetch for KPI pages** — pulling rows into React to compute totals/charts is a bug. Always push aggregation to the server.
- **Graph data without depth limit** — always set `depth` on graph/edge queries. Without it, unbounded traversal will time out.
- **`having` without `groupBy`** — `having` only works after a `groupBy`. Using it alone silently returns no results.
- **Large datasets without pagination** — always add `pagination` for list UIs. Unbounded queries time out on tables with >1000 rows.
- **Client-side list filtering on backend data** — move filtering into backend filters/sorters unless the user explicitly asked for local filtering.
- **`aggregate` expects an array** — `aggregate: "count"` fails silently. Use `aggregate: ["count"]`.
- **Filter operator typos** — the operator is `"eq"`, not `"equals"` or `"="`.
- **Missing `dataProviderName`** — omitting it on non-default providers routes to the database provider, returning confusing errors.
