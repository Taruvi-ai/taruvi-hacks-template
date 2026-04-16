# Database Data Provider

The primary provider for CRUD operations on Taruvi datatables.

## Setup

```tsx
<Refine dataProvider={dataProvider(client)} resources={[{ name: "posts" }]} />
```

## Return Values

All hooks return `{ result, query }` (queries) or `{ mutate, mutation }` (mutations).

```tsx
const { result, query } = useList({ resource: "posts" });
result.data;        // TData[] — records
result.total;       // number — total count for pagination
query.isLoading;    // boolean
query.isError;      // boolean
query.error;        // HttpError | null
query.refetch;      // () => void
```

## CRUD Operations

```tsx
// List
const { result } = useList({ resource: "posts" });
// result.data → IPost[], result.total → number

// Get one
const { result } = useOne({ resource: "posts", id: 1 });
// result.data → IPost

// Get many
const { result } = useMany({ resource: "posts", ids: [1, 2, 3] });
// result.data → IPost[]

// Create
const { mutate, mutation } = useCreate();
mutate({ resource: "posts", values: { title: "Hello" } });

// Update
const { mutate } = useUpdate();
mutate({ resource: "posts", id: 1, values: { title: "Updated" } });

// Delete
const { mutate } = useDelete();
mutate({ resource: "posts", id: 1 });
```

## Filtering

```tsx
const { result } = useList({
  resource: "posts",
  filters: [
    { field: "status", operator: "eq", value: "published" },
    { field: "views", operator: "gte", value: 100 },
    { field: "title", operator: "contains", value: "refine" },
    { field: "category", operator: "in", value: ["tech", "news"] },
  ],
});
```

**Filter operator reference:**

| Operator | Description |
|---|---|
| `eq` / `ne` | Equal / Not equal |
| `lt`, `gt`, `lte`, `gte` | Comparison |
| `contains` / `ncontains` | Contains (case-sensitive) |
| `containss` / `ncontainss` | Contains (case-insensitive) |
| `startswith` / `nstartswith` | Starts with (case-sensitive) |
| `startswiths` / `nstartswiths` | Starts with (case-insensitive) |
| `endswith` / `nendswith` | Ends with (case-sensitive) |
| `endswiths` / `nendswiths` | Ends with (case-insensitive) |
| `in` / `nin` | In / Not in array |
| `null` / `nnull` | Is null / Is not null |
| `between` / `nbetween` | Between / Not between two values |

## Sorting & Pagination

```tsx
const { result } = useList({
  resource: "posts",
  sorters: [
    { field: "created_at", order: "desc" },
    { field: "title", order: "asc" },
  ],
  pagination: { currentPage: 1, pageSize: 20 },
});
```

## Meta Options (`TaruviMeta`)

```tsx
const { result } = useList({
  resource: "posts",
  meta: {
    tableName: "blog_posts",          // override table name
    populate: ["author", "category"], // populate FKs ("*" for all)
    select: ["id", "title", "status"],
    idColumnName: "post_id",          // custom PK column
    upsert: true,                     // insert or update on conflict (useCreate)
    deleteByFilter: true,             // delete by filter instead of IDs (useDeleteMany)
  },
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `tableName` | `string` | resource name | Override DB table name |
| `populate` | `string \| string[]` | — | FK fields to populate. `"*"` for all |
| `select` | `string \| string[]` | — | Fields to return |
| `idColumnName` | `string` | `"id"` | Custom primary key column |
| `headers` | `Record<string, string>` | — | Custom request headers |
| `upsert` | `boolean` | `false` | Upsert on create |
| `deleteByFilter` | `boolean` | `false` | Delete by filter instead of IDs |

## Aggregations

```tsx
const { result } = useList({
  resource: "orders",
  meta: {
    aggregate: ["sum(total)", "count(*)", "avg(quantity)"],
    groupBy: ["status", "category"],
    having: [{ field: "sum(total)", operator: "gte", value: 1000 }],
  },
});
// result.data → [{ status, category, sum_total, count, avg_quantity }]
```

Supported functions: `sum`, `avg`, `count`, `min`, `max`, `array_agg`, `string_agg`, `json_agg`, `stddev`, `variance`.

## Graph Operations

When any of `format`, `include`, `depth`, or `graph_types` is set in `meta`, the provider switches to graph mode.

```tsx
// Read graph structure
const { result } = useOne({
  resource: "employees",
  id: "1",
  meta: {
    format: "graph",        // "tree" or "graph"
    include: "descendants", // "descendants", "ancestors", "both"
    depth: 2,
    graph_types: ["manager"],
  },
});

// Create graph edge
const { mutate } = useCreate();
mutate({
  resource: "employees",
  values: { from_id: 1, to_id: 2, type: "manager", metadata: { since: "2024-01-01" } },
  meta: { format: "graph" },
});

// Delete edge
const { mutate } = useDelete();
mutate({ resource: "employees", id: "edge-123", meta: { format: "graph" } });
```

| Graph Meta | Type | Description |
|---|---|---|
| `format` | `"tree" \| "graph"` | Output format |
| `include` | `"descendants" \| "ancestors" \| "both"` | Traversal direction |
| `depth` | `number` | Traversal depth limit |
| `graph_types` | `string[]` | Filter edges by type |
