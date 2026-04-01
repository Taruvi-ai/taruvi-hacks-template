# Taruvi packages — embedded reference

This file is part of the `taruvi-packages-usage` agent skill. It is the **only** bundled source here for how to use Taruvi packages when the project has no separate docs tree.

## Runtime split (read first)

- **Frontend (React + Refine, “vibe coding” the app):** use **`@taruvi/sdk`** (TypeScript/JavaScript) and **`@taruvi/refine-providers`** with **`@refinedev/core`**. The **Taruvi Python SDK does not run in the browser** and is **not** used from the Refine UI layer.
- **Python:** use the **Taruvi Python SDK** in Python runtimes—**including** **Taruvi serverless functions** (injected `sdk_client`). The long Python section documents that environment in depth; the same client surface applies in other Python contexts where you initialize the SDK yourself unless a subsection is explicitly function-only.

---

## Refine: overview

# @taruvi/refine-providers

Refine.dev data providers for Taruvi Data Service. Bridges [Refine](https://refine.dev/) hooks (`useList`, `useOne`, `useCreate`, etc.) with the Taruvi backend platform via `@taruvi/sdk`.

## Installation

```bash
npm install @taruvi/refine-providers @taruvi/sdk @refinedev/core
```

## Quick Start

```tsx
import { Refine } from "@refinedev/core";
import { Client } from "@taruvi/sdk";
import {
  dataProvider,
  storageDataProvider,
  appDataProvider,
  userDataProvider,
  authProvider,
  accessControlProvider,
} from "@taruvi/refine-providers";

const client = new Client({
  apiKey: "your-api-key",
  appSlug: "your-app-slug",
  apiUrl: "https://your-site.taruvi.cloud",
});

function App() {
  return (
    <Refine
      dataProvider={{
        default: dataProvider(client),
        storage: storageDataProvider(client),
        app: appDataProvider(client),
        user: userDataProvider(client),
      }}
      authProvider={authProvider(client)}
      accessControlProvider={accessControlProvider(client)}
      resources={[{ name: "posts" }]}
    >
      {/* Your app */}
    </Refine>
  );
}
```

## Providers Overview

| Provider | `dataProviderName` | Purpose | Supported Hooks |
|---|---|---|---|
| `dataProvider` | `"default"` | Database CRUD & graph operations | `useList`, `useOne`, `useMany`, `useCreate`, `useUpdate`, `useDelete`, `useCustom` |
| `storageDataProvider` | `"storage"` | File storage operations | `useList`, `useOne`, `useCreate`, `useUpdate`, `useDelete`, `useDeleteMany`, `useCustom` |
| `appDataProvider` | `"app"` | App config, edge functions, analytics | `useList`, `useOne`, `useCustom` |
| `userDataProvider` | `"user"` | User management | `useList`, `useOne`, `useCreate`, `useUpdate`, `useDelete` |
| `authProvider` | — | Authentication (redirect-based) | `useLogin`, `useLogout`, `useRegister`, `useGetIdentity`, `usePermissions` |
| `accessControlProvider` | — | Cerbos-based authorization | `useCan`, `<CanAccess>` |

---

## Refine: database provider

# Database Data Provider

The primary provider for CRUD operations on database tables.

## Setup

```tsx
<Refine dataProvider={dataProvider(client)} resources={[{ name: "posts" }]} />
```

## Return Values

All hooks return `{ result, query }` (for queries) or `{ mutate, mutation }` (for mutations), following Refine v5 conventions.

### Query Hooks (`useList`, `useOne`, `useMany`)

```tsx
const { result, query } = useList({ resource: "posts" });

// result — the resolved data
result.data;       // TData[] — array of records
result.total;      // number — total record count (for pagination)

// query — TanStack Query state
query.isLoading;   // boolean — true during initial fetch
query.isError;     // boolean — true if the query failed
query.error;       // HttpError | null — error details
query.isRefetching;// boolean — true during background refetch
query.refetch;     // () => void — manually re-run the query
```

```tsx
const { result, query } = useOne({ resource: "posts", id: 1 });

result.data;       // TData — single record object
```

```tsx
const { result, query } = useMany({ resource: "posts", ids: [1, 2, 3] });

result.data;       // TData[] — array of records
```

### Mutation Hooks (`useCreate`, `useUpdate`, `useDelete`)

```tsx
const { mutate, mutation } = useCreate();

mutate(
  { resource: "posts", values: { title: "Hello" } },
  {
    onSuccess: (result) => {
      result.data; // TData — the created record
    },
    onError: (error) => {
      error.message;    // string
      error.statusCode; // number
    },
  }
);

// mutation — TanStack Query mutation state
mutation.isLoading; // boolean — true while mutating
mutation.isError;   // boolean
mutation.isSuccess; // boolean
```

```tsx
const { mutate, mutation } = useUpdate();

mutate({
  resource: "posts",
  id: 1,
  values: { title: "Updated" },
});
// onSuccess result.data → the updated record
```

```tsx
const { mutate, mutation } = useDelete();

mutate({ resource: "posts", id: 1 });
// onSuccess result.data → the deleted record (if returned by backend)
```

## CRUD Operations

```tsx
// List records
const { result, query } = useList({ resource: "posts" });
// result.data → IPost[], result.total → number
// query.isLoading, query.isError, query.error

// Get single record
const { result, query } = useOne({ resource: "posts", id: 1 });
// result.data → IPost

// Get multiple records
const { result, query } = useMany({ resource: "posts", ids: [1, 2, 3] });
// result.data → IPost[]

// Create
const { mutate, mutation } = useCreate();
mutate({ resource: "posts", values: { title: "Hello" } });
// mutation.isLoading, mutation.isSuccess, mutation.isError

// Update
const { mutate, mutation } = useUpdate();
mutate({ resource: "posts", id: 1, values: { title: "Updated" } });

// Delete
const { mutate, mutation } = useDelete();
mutate({ resource: "posts", id: 1 });
```

## Filtering

```tsx
const { result, query } = useList({
  resource: "posts",
  filters: [
    { field: "status", operator: "eq", value: "published" },
    { field: "views", operator: "gte", value: 100 },
    { field: "title", operator: "contains", value: "refine" },
    { field: "category", operator: "in", value: ["tech", "news"] },
  ],
});
// result.data → filtered IPost[], result.total → filtered count
```

Supported filter operators:

| Operator | SDK Mapping | Description |
|---|---|---|
| `eq` | `eq` | Equal |
| `ne` | `ne` | Not equal |
| `lt`, `gt`, `lte`, `gte` | `lt`, `gt`, `lte`, `gte` | Comparison |
| `contains` | `contains` | Contains (case-sensitive) |
| `ncontains` | `ncontains` | Not contains (case-sensitive) |
| `containss` | `icontains` | Contains (case-insensitive) |
| `ncontainss` | `nicontains` | Not contains (case-insensitive) |
| `startswith` | `startswith` | Starts with (case-sensitive) |
| `nstartswith` | `nstartswith` | Not starts with (case-sensitive) |
| `startswiths` | `istartswith` | Starts with (case-insensitive) |
| `nstartswiths` | `nistartswith` | Not starts with (case-insensitive) |
| `endswith` | `endswith` | Ends with (case-sensitive) |
| `nendswith` | `nendswith` | Not ends with (case-sensitive) |
| `endswiths` | `iendswith` | Ends with (case-insensitive) |
| `nendswiths` | `niendswith` | Not ends with (case-insensitive) |
| `in` | `in` | In array |
| `nin` | `nin` | Not in array |
| `null` | `null` | Is null |
| `nnull` | `nnull` | Is not null |
| `between` | `between` | Between two values |
| `nbetween` | `nbetween` | Not between two values |

## Sorting & Pagination

```tsx
const { result, query } = useList({
  resource: "posts",
  sorters: [
    { field: "created_at", order: "desc" },
    { field: "title", order: "asc" },
  ],
  pagination: { currentPage: 1, pageSize: 20 },
});
// result.data → sorted/paginated IPost[], result.total → total count
```

## Meta Options

The `meta` parameter accepts `TaruviMeta` for Taruvi-specific features:

```tsx
const { result, query } = useList({
  resource: "posts",
  meta: {
    tableName: "blog_posts",       // override table name
    populate: ["author", "category"], // populate foreign keys (or "*" for all)
    select: ["id", "title", "status"], // select specific fields
    idColumnName: "post_id",       // custom primary key column
  },
});
// result.data → IPost[] with populated author & category objects
```

| Meta Option | Type | Default | Description |
|---|---|---|---|
| `tableName` | `string` | resource name | Override the database table name |
| `populate` | `string \| string[]` | — | Foreign key fields to populate. `"*"` for all |
| `select` | `string \| string[]` | — | Fields to return |
| `idColumnName` | `string` | `"id"` | Custom primary key column name |
| `headers` | `Record<string, string>` | — | Custom request headers |
| `upsert` | `boolean` | `false` | Use upsert instead of create (insert or update on conflict) |
| `deleteByFilter` | `boolean` | `false` | Delete records by filter instead of by IDs (used with `useDeleteMany`) |

## Aggregations

```tsx
const { result, query } = useList({
  resource: "orders",
  meta: {
    aggregate: ["sum(total)", "count(*)", "avg(quantity)"],
    groupBy: ["status", "category"],
    having: [{ field: "sum(total)", operator: "gte", value: 1000 }],
  },
});
// result.data → aggregated rows with sum_total, count, avg_quantity fields
```

Supported aggregate functions: `sum`, `avg`, `count`, `min`, `max`, `array_agg`, `string_agg`, `json_agg`, `stddev`, `variance`.

## Graph Operations

When any graph meta option is present (`format`, `include`, `depth`, `graph_types`), the provider switches to graph query mode using the `Database` class's graph methods.

### Reading Graph Data

```tsx
// Get graph structure for a record
const { result, query } = useOne({
  resource: "employees",
  id: "1",
  meta: {
    format: "graph",           // "tree" or "graph"
    include: "descendants",    // "descendants", "ancestors", or "both"
    depth: 2,
    graph_types: ["manager", "mentor"],
  },
});
// result.data → graph/tree structure with nested nodes

// List with graph format
const { result, query } = useList({
  resource: "employees",
  meta: { format: "tree", include: "both", depth: 3 },
});
// result.data → array of tree-structured records
```

| Meta Option | Type | Description |
|---|---|---|
| `format` | `"tree" \| "graph"` | Output format |
| `include` | `"descendants" \| "ancestors" \| "both"` | Traversal direction |
| `depth` | `number` | Traversal depth |
| `graph_types` | `string[]` | Filter edges by type |

### Managing Graph Edges

When graph meta is present, mutations operate on edges instead of records:

```tsx
// Create edge
const { mutate } = useCreate();
mutate({
  resource: "employees",
  values: { from_id: 1, to_id: 2, type: "manager", metadata: { since: "2024-01-01" } },
  meta: { format: "graph" },
});

// Update edge
const { mutate } = useUpdate();
mutate({
  resource: "employees",
  id: "edge-123",
  values: { from_id: 1, to_id: 3, type: "manager" },
  meta: { format: "graph" },
});

// Delete edge
const { mutate } = useDelete();
mutate({ resource: "employees", id: "edge-123", meta: { format: "graph" } });

// Delete multiple edges
const { mutate } = useDeleteMany();
mutate({ resource: "employees", ids: ["edge-123", "edge-456"], meta: { format: "graph" } });
```

---

## Refine: storage provider

# Storage Data Provider

File upload, download, and management.

## Setup

```tsx
<Refine
  dataProvider={{
    default: dataProvider(client),
    storage: storageDataProvider(client),
  }}
/>
```

## List Files

```tsx
const { result, query } = useList({
  resource: "documents", // bucket name
  dataProviderName: "storage",
});
// result.data → StorageObject[], result.total → number
// Each object: { id, path, size, mimetype, visibility, metadata, created_at, ... }
```

## Get File URL

```tsx
// Returns the download URL for the file
const { result, query } = useOne({
  resource: "documents",
  dataProviderName: "storage",
  id: "uploads/document.pdf", // file path
});
// result.data → { id, path, url, ... } where url is the download URL
```

## Upload Files

```tsx
import type { StorageUploadVariables } from "@taruvi/refine-providers";

const { mutate, mutation } = useCreate<any, any, StorageUploadVariables>();

mutate({
  resource: "documents",
  dataProviderName: "storage",
  values: {
    files: [file1, file2],
    paths: ["file1.pdf", "file2.pdf"],       // optional, defaults to file.name
    metadatas: [{ tag: "report" }, {}],       // optional
  },
});
// mutation.isLoading, mutation.isSuccess, mutation.isError
// onSuccess result.data → uploaded file metadata
```

## Delete Files

```tsx
const { mutate, mutation } = useDeleteMany();
mutate({
  resource: "documents",
  dataProviderName: "storage",
  ids: ["path/to/file1.pdf", "path/to/file2.pdf"],
});
// mutation.isLoading, mutation.isSuccess
```

## Filter Files

```tsx
const { result, query } = useList({
  resource: "documents",
  dataProviderName: "storage",
  filters: [
    { field: "mimetype_category", operator: "eq", value: "image" },
    { field: "size", operator: "lte", value: 5242880 },
    { field: "visibility", operator: "eq", value: "public" },
  ],
  meta: { bucketName: "uploads" }, // override bucket name
});
// result.data → filtered StorageObject[], result.total → count
```

## Update File Metadata

```tsx
const { mutate, mutation } = useUpdate();
mutate({
  resource: "documents",
  dataProviderName: "storage",
  id: "uploads/document.pdf", // file path
  values: {
    metadata: { tag: "reviewed" },
    visibility: "public",
  },
});
// onSuccess result.data → updated file metadata
```

## Batch Upload Files

```tsx
import type { StorageUploadVariables } from "@taruvi/refine-providers";

const { mutate, mutation } = useCreateMany<any, any, StorageUploadVariables>();

mutate({
  resource: "documents",
  dataProviderName: "storage",
  values: {
    files: [file1, file2, file3],
    paths: ["report1.pdf", "report2.pdf", "report3.pdf"],
    metadatas: [{ tag: "q1" }, { tag: "q2" }, { tag: "q3" }],
  },
});
// onSuccess result.data → first uploaded file metadata
```

## Custom Storage Requests

For advanced use cases, `useCustom` provides raw HTTP access to the storage API:

```tsx
import { useCustom } from "@refinedev/core";

const { data } = useCustom({
  dataProviderName: "storage",
  url: "my-bucket/some/path",
  method: "get",
});
```

---

## Refine: app provider

# App Data Provider

App-level configuration, edge function execution, and analytics queries — all through a single provider.

## Setup

```tsx
<Refine
  dataProvider={{
    default: dataProvider(client),
    app: appDataProvider(client),
  }}
/>
```

## Fetch Roles

```tsx
const { result, query } = useList({ resource: "roles", dataProviderName: "app" });
// result.data → [{ id, name, permissions, ... }], result.total → number
```

## Fetch Settings

```tsx
const { result, query } = useOne({ resource: "settings", dataProviderName: "app", id: "" });
// result.data → { ...app settings object }
```

## Fetch Secrets

```tsx
// Get a single secret by key
const { result, query } = useOne({
  resource: "secrets",
  dataProviderName: "app",
  id: "STRIPE_KEY",
  meta: { app: "production", tags: ["payment"] }, // optional
});
// result.data → { key, value, tags, secret_type, ... }

// Batch get secrets by keys
const { result, query } = useList({
  resource: "secrets",
  dataProviderName: "app",
  meta: {
    keys: ["API_KEY", "DATABASE_URL", "STRIPE_KEY"],
    app: "production",       // optional: app context for 2-tier inheritance
    includeMetadata: true,   // optional: include tags, secret_type
  },
});
// result.data → [{ key, value }, ...] or [{ key, value, tags, secret_type }, ...]
```

## Execute Edge Functions

Use `useCustom` with `meta.kind: "function"`. The `url` is the function slug, and `config.payload` contains the parameters.

```tsx
import { useCustom } from "@refinedev/core";

const { data, isLoading } = useCustom({
  dataProviderName: "app",
  url: "process-order",
  method: "post",
  config: {
    payload: { orderId: 123, action: "confirm" },
  },
  meta: { kind: "function" },
});

// Async execution (returns immediately with job ID)
useCustom({
  dataProviderName: "app",
  url: "long-running-task",
  method: "post",
  config: { payload: { taskId: 789 } },
  meta: { kind: "function", async: true },
});
```

## Execute Analytics Queries

Use `useCustom` with `meta.kind: "analytics"`. The `url` is the query slug.

```tsx
const { data } = useCustom({
  dataProviderName: "app",
  url: "monthly-sales-report",
  method: "post",
  config: {
    payload: { start_date: "2024-01-01", end_date: "2024-12-31", region: "US" },
  },
  meta: { kind: "analytics" },
});
```

## App Custom Meta Types

```tsx
import type { FunctionMeta, AnalyticsMeta, AppCustomMeta } from "@taruvi/refine-providers";

// FunctionMeta: { kind: "function"; async?: boolean }
// AnalyticsMeta: { kind: "analytics" }
// AppCustomMeta: FunctionMeta | AnalyticsMeta
```

---

## Refine: user provider

# User Data Provider

User management: list, get, create, update, delete users.

## Setup

```tsx
<Refine
  dataProvider={{
    default: dataProvider(client),
    user: userDataProvider(client),
  }}
/>
```

## List Users

```tsx
const { result, query } = useList({
  resource: "users",
  dataProviderName: "user",
  pagination: { currentPage: 1, pageSize: 10 },
  filters: [
    { field: "is_active", operator: "eq", value: true },
    { field: "search", operator: "eq", value: "john" },
  ],
  sorters: [{ field: "username", order: "asc" }],
});
// result.data → User[], result.total → number
```

Supported filters:

| Field | Type | Description |
|---|---|---|
| `search` | `string` | Search by username, email, or name |
| `is_active` | `boolean` | Filter by active status |
| `is_staff` | `boolean` | Filter by staff status |
| `is_superuser` | `boolean` | Filter by superuser status |
| `is_deleted` | `boolean` | Filter by deleted status |

## Get User

```tsx
// By username or ID
const { result, query } = useOne({ resource: "users", dataProviderName: "user", id: "john_doe" });
// result.data → { id, username, email, first_name, last_name, is_active, ... }

// Get current authenticated user
const { result, query } = useOne({ resource: "users", dataProviderName: "user", id: "me" });
// result.data → current user's data via Auth.getCurrentUser()
```

## Create User

```tsx
const { mutate, mutation } = useCreate();
mutate({
  resource: "users",
  dataProviderName: "user",
  values: {
    username: "jane",
    email: "jane@example.com",
    password: "...",
    confirm_password: "...",
    first_name: "Jane",
    last_name: "Doe",
  },
});
// mutation.isLoading, mutation.isSuccess
// onSuccess result.data → created User object
```

## Update User

```tsx
const { mutate, mutation } = useUpdate();
mutate({
  resource: "users",
  dataProviderName: "user",
  id: "jane",
  values: { first_name: "Jane", last_name: "Doe" },
});
// onSuccess result.data → updated User object
```

## Delete User

```tsx
const { mutate, mutation } = useDelete();
mutate({ resource: "users", dataProviderName: "user", id: "jane" });
```

## Get User Roles

```tsx
const { result, query } = useList({
  resource: "roles",
  dataProviderName: "user",
  meta: { username: "john_doe" },
});
// result.data → [{ id, name, permissions, ... }]
```

## Get User Apps

```tsx
const { result, query } = useList({
  resource: "apps",
  dataProviderName: "user",
  meta: { username: "john_doe" },
});
// result.data → [{ name, slug, icon, url, display_name }]
```

---

## Refine: auth provider

# Auth Provider

Redirect-based authentication using Taruvi's Web UI Flow.

## Setup

```tsx
<Refine authProvider={authProvider(client)} />
```

## Flow

1. `login()` → redirects to backend `/accounts/login/`
2. User authenticates on backend
3. Backend redirects back with tokens in URL hash
4. Client extracts and stores tokens automatically

## Login

```tsx
const { mutate: login, isLoading } = useLogin();
login({ callbackUrl: "/dashboard" });
// Redirects to backend login page; no direct return value
```

## Logout

```tsx
const { mutate: logout, isLoading } = useLogout();
logout({ callbackUrl: "/login" });
```

## Register

```tsx
const { mutate: register, isLoading } = useRegister();
register({ callbackUrl: "/welcome" });
```

## Get Current User

```tsx
const { data: user, isLoading, isError } = useGetIdentity<UserData>();
// user.username, user.email, user.first_name, user.last_name, etc.
```

## Get Permissions

```tsx
const { data: permissions, isLoading } = usePermissions();
// permissions.roles, permissions.permissions, permissions.groups
// permissions.is_staff, permissions.is_superuser
```

## Auth Check Behavior

- `check()` returns `{ authenticated: true }` if a session token exists, otherwise redirects to `/login`
- `onError()` returns `{ logout: true, redirectTo: "/login" }` for 401/403 responses (session invalid — tokens already cleared by SDK interceptor). Other errors are passed through.

## Parameter Types

```tsx
import type { LoginParams, LogoutParams, RegisterParams } from "@taruvi/refine-providers";

// LoginParams: { callbackUrl?: string; username?: string; password?: string; redirect?: boolean }
// LogoutParams: { callbackUrl?: string }
// RegisterParams: { callbackUrl?: string }
```

---

## Refine: access control provider

# Access Control Provider

Resource-based authorization using Cerbos policies. Batches multiple `useCan` calls into a single API request using DataLoader.

## Setup

```tsx
<Refine
  authProvider={authProvider(client)}
  accessControlProvider={accessControlProvider(client)}
/>
```

## Options

```tsx
accessControlProvider(client, {
  batchDelayMs: 50, // ms to wait before batching permission checks (default: 50)
});
```

## Check Permissions

```tsx
const { data } = useCan({
  resource: "posts",
  action: "edit",
  params: { id: 1 },
});

if (data?.can) {
  // User can edit this post
}
```

## CanAccess Component

```tsx
<CanAccess resource="posts" action="delete" params={{ id: 1 }}>
  <DeleteButton />
</CanAccess>
```

## Entity Type Resolution

Cerbos policies use entity types. Resolution priority:

1. `params.entityType` — direct override in `useCan`
2. `resource.meta.entityType` — from Refine resource config
3. Resource name — fallback

```tsx
// Set in resource config
<Refine resources={[{ name: "posts", meta: { entityType: "blog" } }]} />

// Or override per-check
useCan({
  resource: "posts",
  action: "edit",
  params: { id: 1, entityType: "article" },
});
```

## Caching

Uses Refine's built-in TanStack Query caching:
- `staleTime`: 5 minutes
- `gcTime`: 10 minutes

DataLoader handles request batching only (its cache is disabled).

## Default UI Behavior

The provider sets these defaults for Refine's access control UI integration:

- `buttons.enableAccessControl`: `true` — access control checks are enabled on buttons
- `buttons.hideIfUnauthorized`: `true` — buttons are hidden (not just disabled) when unauthorized

---

## Refine: types and utilities

# TypeScript Types & Utilities

## TypeScript Types

```tsx
import type {
  // Meta & response types
  TaruviMeta,
  TaruviListResponse,

  // App provider meta types
  FunctionMeta,       // { kind: "function"; async?: boolean }
  AnalyticsMeta,      // { kind: "analytics" }
  AppCustomMeta,      // FunctionMeta | AnalyticsMeta

  // Storage types
  StorageUploadVariables, // { files: File[]; paths?: string[]; metadatas?: Record<string, unknown>[] }

  // Auth types
  LoginParams,
  LogoutParams,
  RegisterParams,
} from "@taruvi/refine-providers";
```

### TaruviMeta

Extends Refine's `MetaQuery`. Used in the `meta` parameter of data provider hooks.

```tsx
interface TaruviMeta extends MetaQuery {
  populate?: string | string[];
  headers?: Record<string, string>;
  idColumnName?: string;
  select?: string | string[];
  tableName?: string;
  bucketName?: string;
  aggregate?: AggregateExpression[];
  groupBy?: string[];
  having?: CrudFilter[];
  format?: "tree" | "graph";
  include?: "descendants" | "ancestors" | "both";
  depth?: number;
  graph_types?: string[];
  upsert?: boolean;
  deleteByFilter?: boolean;
}
```

## Utility Functions

Exported for advanced use cases (e.g., building custom providers):

```tsx
import {
  REFINE_OPERATOR_MAP,       // Record<string, string> — Refine operator to DRF suffix mapping
  convertRefineFilters,      // (filters?: CrudFilter[]) => Record<string, string>
  convertRefineSorters,      // (sorters?: CrudSort[]) => string | undefined
  convertRefinePagination,   // (pagination?: Pagination) => { page?: number; page_size?: number }
  buildRefineQueryParams,    // (options) => Record<string, unknown>
  buildQueryString,          // (params?) => string (e.g., "?page=1&page_size=10")
  handleError,               // (error: unknown) => never
  formatAggregates,          // (aggregates?: string[]) => string | undefined
  formatGroupBy,             // (groupBy?: string[]) => string | undefined
  formatHaving,              // (having?: CrudFilter[]) => string | undefined
} from "@taruvi/refine-providers";
```

## Deprecated Providers

The standalone `functionsDataProvider` and `analyticsDataProvider` are deprecated. Use `appDataProvider` with `useCustom` instead.

```tsx
// ❌ Old way
import { functionsDataProvider, analyticsDataProvider } from "@taruvi/refine-providers";
<Refine dataProvider={{ functions: functionsDataProvider(client), analytics: analyticsDataProvider(client) }} />
const { mutate } = useCreate();
mutate({ dataProviderName: "functions", resource: "my-func", values: { ... } });

// ✅ New way
import { appDataProvider } from "@taruvi/refine-providers";
<Refine dataProvider={{ app: appDataProvider(client) }} />
useCustom({
  dataProviderName: "app",
  url: "my-func",
  method: "post",
  config: { payload: { ... } },
  meta: { kind: "function" },
});
```

---

## Python SDK (Taruvi functions and other Python runtimes)

# Taruvi Python SDK

**Reference written around Taruvi serverless functions** (injected `sdk_client`, `main(params, user_data, sdk_client)`). The same SDK types and methods apply in **other Python environments** when you construct and authenticate a `Client` / `SyncClient` yourself; skip function-only parts (e.g. `params['__function__']`, injected `user_data`) where they do not apply.

---

## Table of Contents

- [Overview](#overview)
- [Function Signature](#function-signature)
- [SDK Client Initialization](#sdk-client-initialization)
- [Database Operations](#database-operations)
- [Function Execution](#function-execution)
- [Storage Operations](#storage-operations)
- [Secrets Management](#secrets-management)
- [User Management](#user-management)
- [Analytics](#analytics)
- [App Settings](#app-settings)
- [Site Settings](#site-settings)
- [Policy (Authorization)](#policy-authorization)
- [Authentication](#authentication)
- [Complete Examples](#complete-examples)
- [Best Practices](#best-practices)
- [Error Handling](#error-handling)

---

## Overview

Taruvi functions run in a **secure sandboxed environment** with the Taruvi SDK pre-installed and pre-authenticated. The SDK client is automatically injected into your function, eliminating the need for manual authentication.

### Key Features

- ✅ **Pre-authenticated SDK client** - No manual auth required
- ✅ **User context included** - Access authenticated user info
- ✅ **Full platform access** - Database, functions, storage, secrets, users, analytics, app settings
- ✅ **Secure sandbox** - RestrictedPython with whitelisted modules
- ✅ **Structured logging** - Built-in `log()` helper + Python logging

---

## Function Signature

All APP mode functions **must** use this exact signature:

```python
def main(params, user_data, sdk_client):
    """
    APP mode function entry point.
    
    Args:
        params: Dict - User parameters + function metadata
        user_data: Dict - Authenticated user information
        sdk_client: SyncClient - Pre-authenticated Taruvi SDK client
    
    Returns:
        Any JSON-serializable data (dict, list, str, int, bool, None)
    """
    pass
```

### Parameter Details

#### 1. `params` - Input Parameters

Dictionary containing:
- **User-provided parameters** from function invocation
- **Function metadata** in `params['__function__']`

```python
def main(params, user_data, sdk_client):
    # User parameters
    order_id = params.get('order_id')
    customer_id = params.get('customer_id')
    
    # Function metadata
    function_name = params['__function__']['name']
    function_slug = params['__function__']['slug']
    execution_mode = params['__function__']['execution_mode']
    
    return {"order_id": order_id}
```

#### 2. `user_data` - Authenticated User

Dictionary containing authenticated user information:

```python
{
    "id": 123,
    "username": "alice",
    "email": "alice@example.com",
    "full_name": "Alice Smith"
}
```

Example usage:

```python
def main(params, user_data, sdk_client):
    current_user = user_data['username']
    user_email = user_data['email']
    
    log(f"Function called by: {current_user}", level="info")
    
    return {
        "message": f"Hello {user_data['full_name']}!",
        "user_id": user_data['id']
    }
```

#### 3. `sdk_client` - Pre-authenticated SDK Client

A fully initialized and authenticated `SyncClient` instance with access to:

- `sdk_client.database` - Database operations (CRUD, query builder, edges, aggregations, full-text search)
- `sdk_client.functions` - Function execution (sync/async)
- `sdk_client.storage` - File storage (buckets, upload/download)
- `sdk_client.secrets` - Secrets management (2-tier inheritance)
- `sdk_client.users` - User management (CRUD, roles, preferences)
- `sdk_client.analytics` - Analytics query execution
- `sdk_client.app` - App roles and settings
- `sdk_client.settings` - Site metadata
- `sdk_client.policy` - Authorization policy checks (Cerbos)

**Important:** The SDK client is already authenticated - do NOT call auth methods!

---

## SDK Client Initialization

### Inside Functions (Recommended)

The SDK client is **automatically provided** and pre-authenticated:

```python
def main(params, user_data, sdk_client):
    # SDK client is ready to use - no initialization needed!
    users = sdk_client.database.from_("users").execute()
    return {"users": users}
```

### External Initialization (Advanced)

If you need to initialize a separate SDK client (e.g., for different credentials):

```python
from taruvi import Client

def main(params, user_data, sdk_client):
    # Initialize new client
    external_client = Client(
        api_url="http://localhost:8000",
        app_slug="my-app",
        mode='sync'
    )
    
    # Authenticate with different credentials
    auth_client = external_client.auth.signInWithToken(
        token=params['external_api_key'],
        token_type='api_key'
    )
    
    # Use external client
    external_data = auth_client.database.from_("external_table").execute()
    
    return {"external_data": external_data}
```

---

## Database Operations

### Query Builder Pattern

The database module uses a fluent query builder API. The `execute()` method returns `{"data": [...], "total": N}`.

```python
def main(params, user_data, sdk_client):
    # Simple query
    result = sdk_client.database.from_("users").execute()
    all_users = result["data"]
    
    # Query with filters
    result = (
        sdk_client.database.from_("users")
        .filter("is_active", "eq", True)
        .filter("age", "gte", 18)
        .sort("created_at", "desc")
        .page_size(20)
        .execute()
    )
    active_users = result["data"]
    
    return {
        "total_users": len(all_users),
        "active_users": result["total"],
        "users": active_users
    }
```

### Filter Operators

Available operators for `.filter(field, operator, value)`:

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equal | `.filter("status", "eq", "active")` |
| `ne` | Not equal | `.filter("status", "ne", "deleted")` |
| `gt` | Greater than | `.filter("age", "gt", 18)` |
| `gte` | Greater than or equal | `.filter("age", "gte", 18)` |
| `lt` | Less than | `.filter("price", "lt", 100)` |
| `lte` | Less than or equal | `.filter("price", "lte", 100)` |
| `contains` | Contains substring | `.filter("email", "contains", "@example.com")` |
| `startswith` | Starts with | `.filter("name", "startswith", "A")` |
| `endswith` | Ends with | `.filter("email", "endswith", ".com")` |

### Full-Text Search

Tables with a `search_vector` field support full-text search via PostgreSQL `tsvector`:

```python
def main(params, user_data, sdk_client):
    result = (
        sdk_client.database.from_("articles")
        .search("machine learning")
        .page_size(10)
        .execute()
    )
    
    return {"articles": result["data"], "total": result["total"]}
```

### Aggregations

The query builder supports SQL-like aggregations with `aggregate()`, `group_by()`, and `having()`:

```python
def main(params, user_data, sdk_client):
    # Count orders by status
    result = (
        sdk_client.database.from_("orders")
        .aggregate("count(*)")
        .group_by("status")
        .execute()
    )
    
    # Sum with HAVING filter
    result = (
        sdk_client.database.from_("orders")
        .aggregate("sum(total_amount)", "count(*)")
        .group_by("customer_id")
        .having("sum(total_amount) > 1000")
        .execute()
    )
    
    return {"data": result["data"]}
```

### CRUD Operations

#### Create Records

```python
def main(params, user_data, sdk_client):
    # Create single record
    new_user = sdk_client.database.create("users", {
        "username": params['username'],
        "email": params['email'],
        "is_active": True
    })
    
    # Create multiple records (bulk)
    new_users = sdk_client.database.create("users", [
        {"username": "alice", "email": "alice@example.com"},
        {"username": "bob", "email": "bob@example.com"}
    ])
    
    return {"user": new_user, "bulk_count": len(new_users)}
```

#### Read Records

```python
def main(params, user_data, sdk_client):
    # Get single record by ID
    user = sdk_client.database.get("users", record_id=123)
    
    # Query with filters
    result = (
        sdk_client.database.from_("users")
        .filter("is_active", "eq", True)
        .execute()
    )
    
    # Get first result
    first_user = (
        sdk_client.database.from_("users")
        .filter("email", "eq", params['email'])
        .first()
    )
    
    # Get count
    total = (
        sdk_client.database.from_("users")
        .filter("is_active", "eq", True)
        .count()
    )
    
    return {"user": user, "total_active": total, "found": first_user}
```

#### Update Records

```python
def main(params, user_data, sdk_client):
    # Update single record
    updated = sdk_client.database.update(
        "users",
        record_id=params['user_id'],
        data={"is_active": False, "updated_by": user_data['username']}
    )
    
    # Bulk update (list of dicts, each must include "id")
    updated_many = sdk_client.database.update("users", record_id=[
        {"id": 123, "status": "verified"},
        {"id": 456, "status": "verified"}
    ])
    
    return {"updated": True, "user": updated}
```

#### Delete Records

```python
def main(params, user_data, sdk_client):
    # Delete by ID
    sdk_client.database.delete("users", record_id=123)
    
    # Delete by IDs (bulk)
    sdk_client.database.delete("users", ids=[123, 456, 789])
    
    # Delete by filter
    sdk_client.database.delete("users", filter={"is_active": False})
    
    return {"deleted": True}
```

### Lazy CRUD via Query Builder

CRUD operations can also be chained on the query builder and executed lazily via `.execute()`:

```python
def main(params, user_data, sdk_client):
    # Create via query builder
    result = (
        sdk_client.database.from_("users")
        .create({"username": "alice", "email": "alice@example.com"})
        .execute()
    )
    
    # Get + Update via query builder
    result = (
        sdk_client.database.from_("users")
        .get(123)
        .update({"status": "verified"})
        .execute()
    )
    
    # Delete via query builder
    result = (
        sdk_client.database.from_("users")
        .delete(123)
        .execute()
    )
    
    return {"result": result}
```

### Edge (Relationship) CRUD via Query Builder

Edges represent relationships between records. Use `.edges()` to target the edges table:

```python
def main(params, user_data, sdk_client):
    # Create edges
    result = (
        sdk_client.database.from_("employees")
        .edges()
        .create([
            {"source_id": 1, "target_id": 2, "relationship_type": "manager"},
            {"source_id": 1, "target_id": 3, "relationship_type": "manager"}
        ])
        .execute()
    )
    
    # Update an edge
    result = (
        sdk_client.database.from_("employees")
        .edges()
        .get(5)
        .update({"relationship_type": "dotted_line"})
        .execute()
    )
    
    # Delete edges (bulk by IDs)
    result = (
        sdk_client.database.from_("employees")
        .edges()
        .delete([5, 6, 7])
        .execute()
    )
    
    # Query edges with filters
    result = (
        sdk_client.database.from_("employees")
        .edges()
        .filter("relationship_type", "eq", "manager")
        .execute()
    )
    
    return {"edges": result["data"]}
```

### Graph Traversal

```python
def main(params, user_data, sdk_client):
    # Get descendants as tree
    result = (
        sdk_client.database.from_("employees")
        .get(1)
        .format("tree")
        .include("descendants")
        .depth(3)
        .types(["manager", "dotted_line"])
        .execute()
    )
    
    return {"tree": result}
```

### Pagination

```python
def main(params, user_data, sdk_client):
    page = params.get('page', 1)
    page_size = params.get('page_size', 20)
    
    result = (
        sdk_client.database.from_("users")
        .page(page)
        .page_size(page_size)
        .execute()
    )
    
    return {
        "page": page,
        "page_size": page_size,
        "results": result["data"],
        "total": result["total"]
    }
```

### Sorting

Sorting uses the `ordering` parameter internally (`-field` for descending):

```python
def main(params, user_data, sdk_client):
    result = (
        sdk_client.database.from_("users")
        .sort("created_at", "desc")
        .execute()
    )
    return {"users": result["data"]}
```

### Relationships & Populate

```python
def main(params, user_data, sdk_client):
    result = (
        sdk_client.database.from_("orders")
        .populate("customer", "product")
        .execute()
    )
    
    return {"orders": result["data"]}
```

---

## Function Execution

### Execute Other Functions

Call other serverless functions from within your function:

#### Synchronous Execution

```python
def main(params, user_data, sdk_client):
    result = sdk_client.functions.execute(
        "send-email",
        params={
            "to": params['email'],
            "subject": "Welcome!",
            "body": "Thanks for signing up"
        }
    )
    
    return {"email_sent": True, "result": result['data']}
```

#### Asynchronous Execution (Background Task)

```python
def main(params, user_data, sdk_client):
    result = sdk_client.functions.execute(
        "process-large-dataset",
        params={"dataset_id": params['dataset_id']},
        is_async=True
    )
    
    task_id = result['invocation']['celery_task_id']
    
    return {"task_started": True, "task_id": task_id}
```

#### Poll for Async Results

```python
def main(params, user_data, sdk_client):
    task_result = sdk_client.functions.get_result(params['task_id'])
    
    status = task_result['data']['status']
    
    if status == 'SUCCESS':
        return {"completed": True, "result": task_result['data']['result']}
    elif status == 'FAILURE':
        return {"completed": False, "error": task_result['data']['traceback']}
    else:
        return {"completed": False, "status": status}
```

### Function Management

```python
def main(params, user_data, sdk_client):
    # List all functions
    functions = sdk_client.functions.list(limit=50, offset=0)
    
    # Get function details
    func = sdk_client.functions.get("process-order")
    
    # Get a specific invocation
    invocation = sdk_client.functions.get_invocation("invocation-uuid")
    
    # List invocations with filters
    invocations = sdk_client.functions.list_invocations(
        function_slug="process-order",
        status="SUCCESS",
        limit=20
    )
    
    return {
        "functions": functions['results'],
        "invocations": invocations['results']
    }
```

---

## Storage Operations

### Bucket Management

```python
def main(params, user_data, sdk_client):
    # List buckets (with optional filters)
    buckets = sdk_client.storage.list_buckets(
        search="images",
        visibility="public",
        ordering="-created_at",
        page=1,
        page_size=20
    )
    
    # Create bucket
    bucket = sdk_client.storage.create_bucket(
        "User Uploads",
        slug="user-uploads",
        visibility="private",
        file_size_limit=10485760,       # 10MB per file
        allowed_mime_types=["image/jpeg", "image/png"],
        max_size_bytes=1073741824,      # 1GB total bucket size
        max_objects=1000
    )
    
    # Get bucket details
    bucket_info = sdk_client.storage.get_bucket("user-uploads")
    
    # Update bucket
    sdk_client.storage.update_bucket(
        "user-uploads",
        visibility="public",
        file_size_limit=20971520,       # 20MB
        max_size_bytes=10737418240,     # 10GB
        max_objects=5000
    )
    
    # Delete bucket (WARNING: deletes all files)
    sdk_client.storage.delete_bucket("old-bucket")
    
    return {"buckets": buckets, "created": bucket}
```

### File Operations

```python
def main(params, user_data, sdk_client):
    # List files with filters
    files = (
        sdk_client.storage.from_("user-uploads")
        .filter(mimetype_category="image", ordering="-created_at")
        .list()
    )
    
    # Upload files (multipart)
    import io
    uploaded = (
        sdk_client.storage.from_("user-uploads")
        .upload(
            files=[("photo.jpg", io.BytesIO(params['file_data']))],
            paths=["users/123/photo.jpg"],
            metadatas=[{"description": "Profile photo"}]
        )
    )
    
    # Download file
    file_bytes = sdk_client.storage.from_("user-uploads").download("users/123/photo.jpg")
    
    # Update file metadata
    sdk_client.storage.from_("user-uploads").update(
        "users/123/photo.jpg",
        metadata={"description": "Updated photo"},
        visibility="public"
    )
    
    # Delete files
    sdk_client.storage.from_("user-uploads").delete(["photo1.jpg", "photo2.jpg"])
    
    # Copy file (within or across buckets)
    sdk_client.storage.from_("user-uploads").copy_object(
        "photo.jpg",
        "photo-backup.jpg",
        destination_bucket="backups"  # optional, defaults to same bucket
    )
    
    # Move/rename file
    sdk_client.storage.from_("user-uploads").move_object(
        "photo.jpg",
        "archive/old-photo.jpg"
    )
    
    return {"files": files, "uploaded": uploaded}
```

---

## Secrets Management

### Get Secrets

```python
def main(params, user_data, sdk_client):
    # Get single secret (auto-uses client's app_slug for 2-tier inheritance)
    db_url = sdk_client.secrets.get("DATABASE_URL")
    
    # Get with explicit app context
    stripe_key = sdk_client.secrets.get("STRIPE_KEY", app="production")
    
    # Get with tag validation (404 if secret doesn't have these tags)
    api_key = sdk_client.secrets.get("API_KEY", tags=["payment", "production"])
    
    return {
        "db_configured": bool(db_url),
        "stripe_configured": bool(stripe_key)
    }
```

### List Secrets

The `list()` method returns the full API response: `{"status", "message", "data", "total"}`.

```python
def main(params, user_data, sdk_client):
    # List all secrets
    result = sdk_client.secrets.list()
    secrets = result["data"]
    total = result["total"]
    
    # List with filters
    result = sdk_client.secrets.list(
        search="API",
        secret_type="api_key",
        tags=["production"],
        page_size=50
    )
    
    # Batch get by keys (efficient single request)
    result = sdk_client.secrets.list(keys=["API_KEY", "DATABASE_URL", "STRIPE_KEY"])
    
    # Batch get with full metadata
    result = sdk_client.secrets.list(
        keys=["API_KEY"],
        include_metadata=True
    )
    
    return {"total": total, "secrets": secrets}
```

---

## User Management

### List and Search Users

```python
def main(params, user_data, sdk_client):
    # List all users
    users = sdk_client.users.list()
    
    # List with filters
    active_users = sdk_client.users.list(
        search="alice",
        is_active=True,
        roles="admin,editor",
        page=1,
        page_size=20
    )
    
    # Filter by reference attributes (e.g., department_id from user attributes schema)
    dept_users = sdk_client.users.list(department_id=123, is_active=True)
    
    return {
        "total": len(users['data']),
        "active": active_users['data'],
        "department": dept_users['data']
    }
```

### User CRUD Operations

```python
def main(params, user_data, sdk_client):
    # Get specific user
    user = sdk_client.users.get("alice")
    
    # Create user (accepts a single dict)
    new_user = sdk_client.users.create({
        "username": "bob",
        "email": "bob@example.com",
        "password": "secret456",
        "confirm_password": "secret456",
        "first_name": "Bob",
        "last_name": "Smith",
        "is_active": True
    })
    
    # Update user (username + dict of fields to update)
    updated = sdk_client.users.update("bob", {
        "email": "bob.smith@example.com",
        "first_name": "Robert",
        "is_active": False
    })
    
    # Delete user
    sdk_client.users.delete("bob")
    
    return {"created": new_user, "updated": updated}
```

### Role Management

```python
def main(params, user_data, sdk_client):
    # Assign roles to multiple users (max 100 roles, 100 usernames)
    sdk_client.users.assign_roles(
        roles=["editor", "reviewer"],
        usernames=["alice", "bob", "charlie"],
        expires_at="2025-12-31T23:59:59Z"  # Optional expiration
    )
    
    # Revoke roles from multiple users
    sdk_client.users.revoke_roles(
        roles=["editor"],
        usernames=["alice", "bob"]
    )
    
    # Get user's apps
    apps = sdk_client.users.apps("alice")
    
    return {"roles_assigned": True, "apps": apps}
```

### User Preferences

```python
def main(params, user_data, sdk_client):
    # Get current user's preferences (auto-creates with defaults)
    prefs = sdk_client.users.get_preferences()
    theme = prefs["data"]["theme"]         # "light"
    timezone = prefs["data"]["timezone"]   # "UTC"
    
    # Update preferences
    updated = sdk_client.users.update_preferences({
        "theme": "dark",
        "timezone": "Asia/Kolkata",
        "date_format": "DD/MM/YYYY",
        "time_format": "12h",
        "widget_config": {"sidebar_collapsed": True}
    })
    
    return {"preferences": updated["data"]}
```

---

## Analytics

Execute pre-defined analytics queries with parameters:

```python
def main(params, user_data, sdk_client):
    # Execute analytics query
    result = sdk_client.analytics.execute(
        "monthly-revenue",
        params={
            "start_date": "2024-01-01",
            "end_date": "2024-12-31"
        }
    )
    
    # Query with grouping
    result = sdk_client.analytics.execute(
        "user-signups",
        params={
            "start_date": "2024-01-01",
            "group_by": "month"
        }
    )
    
    return {"data": result["data"]}
```

---

## App Settings

Retrieve app-level configuration and roles:

```python
def main(params, user_data, sdk_client):
    # Get app settings (display_name, colors, icon, URLs, etc.)
    settings = sdk_client.app.settings()
    
    # Get app roles
    roles = sdk_client.app.roles()
    
    return {
        "app_name": settings['display_name'],
        "primary_color": settings['primary_color'],
        "roles": roles
    }
```

---

## Site Settings

Retrieve site-level metadata:

```python
def main(params, user_data, sdk_client):
    settings = sdk_client.settings.get()
    return {"site_settings": settings}
```

---

## Policy (Authorization)

Check resource permissions against Cerbos policies.

### Check Resources

Check permissions for one or more resources in a single request. The `principal` should always be passed as `None` — the server automatically resolves the authenticated user from the API key.

The `kind` field uses the format `entity_type:resource_name` (e.g., `"datatable:users"`, `"function:process-order"`).

```python
def main(params, user_data, sdk_client):
    result = sdk_client.policy.check_resources(
        resources=[{
            "resource": {"kind": "datatable:orders", "id": "orders"},
            "actions": ["read", "update", "delete"]
        }],
        principal=None  # Auto-populated from API key
    )

    is_allowed = result["results"][0]["actions"]["read"] == "EFFECT_ALLOW"
    return {"can_read_orders": is_allowed}
```

**For custom entity types (non-system), use your own `type:name` format:**

```python
def main(params, user_data, sdk_client):
    result = sdk_client.policy.check_resources(
        resources=[{
            "resource": {
                "kind": "invoice:sales_invoices",  # Custom type: invoice
                "id": "inv_001",
                "attr": {
                    "owner_id": user_data["id"],
                    "status": "pending",
                    "amount": 1500.00
                }
            },
            "actions": ["read", "update", "approve", "delete"]
        }],
        principal=None  # Auto-populated from API key
    )

    return {"permissions": result["results"][0]["actions"]}
```

**Check Multiple Resources at Once:**

```python
def main(params, user_data, sdk_client):
    result = sdk_client.policy.check_resources(
        resources=[
            {
                "resource": {"kind": "datatable:users", "id": "users"},
                "actions": ["read", "update"]
            },
            {
                "resource": {"kind": "datatable:orders", "id": "orders"},
                "actions": ["read", "create"]
            },
            {
                "resource": {"kind": "function:process-order", "id": "process-order"},
                "actions": ["execute"]
            }
        ],
        principal=None  # Auto-populated from API key
    )

    return {
        "users_permissions": result["results"][0]["actions"],
        "orders_permissions": result["results"][1]["actions"],
        "function_permissions": result["results"][2]["actions"]
    }
```

**Using Auxiliary Data:**

```python
def main(params, user_data, sdk_client):
    # aux_data provides additional context for policy evaluation
    result = sdk_client.policy.check_resources(
        resources=[{
            "resource": {
                "kind": "datatable:sensitive_data",
                "id": "sensitive_data",
                "attr": {"classification": "confidential"}
            },
            "actions": ["read"]
        }],
        principal=None,  # Auto-populated from API key
        aux_data={
            "ip_address": params.get("client_ip", "unknown"),
            "time_of_day": "business_hours",
            "device_type": "desktop"
        }
    )

    return {"can_access": result["results"][0]["actions"]["read"] == "EFFECT_ALLOW"}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `resources` | `list[dict]` | Yes | List of resource check requests. Each dict has `resource` (with `kind` in `type:name` format, `id`, optional `attr`) and `actions` (list of action strings). |
| `principal` | `None` | No | Always pass `None`. The server resolves the principal from the authenticated user's API key. |
| `aux_data` | `dict` | No | Auxiliary data for policy evaluation |
| `app_slug` | `str` | No | App slug (defaults to client's app_slug) |

#### Response Format

The `check_resources` method returns a response in this format:

```python
{
    "requestId": "unique-request-id",
    "results": [
        {
            "resource": {
                "id": "users",
                "kind": "datatable:users",
                "policyVersion": "default",
                "scope": "tenant_id_app_slug"
            },
            "actions": {
                "read": "EFFECT_ALLOW",
                "update": "EFFECT_ALLOW",
                "delete": "EFFECT_DENY"
            },
            "validationErrors": [],
            "meta": {
                "actions": {...},
                "effectiveDerivedRoles": [...]
            }
        }
    ],
    "cerbosCallId": "..."
}
```

#### Notes

- **Scope Injection:** The system automatically injects the scope (`{tenant_id}_{app_slug}`) into all resource checks for multi-tenant isolation
- **Policy Version:** Defaults to "default" unless specified otherwise
- **Resource Attributes:** Use `attr` to pass resource-specific attributes that policies can evaluate (e.g., `owner_id`, `status`, `department`)
- **Effect Values:** Actions return either `"EFFECT_ALLOW"` or `"EFFECT_DENY"`

### Filter Allowed

Filter a list of resources to only those where ALL requested actions are allowed:

```python
def main(params, user_data, sdk_client):
    all_tables = [
        {"kind": "datatable:users", "id": "users"},
        {"kind": "datatable:orders", "id": "orders"},
        {"kind": "datatable:admin_logs", "id": "admin_logs"}
    ]

    # Returns only resources where BOTH read and update are allowed
    allowed = sdk_client.policy.filter_allowed(
        resources=all_tables,
        actions=["read", "update"],
        principal=None  # Auto-populated from API key
    )

    return {"allowed_tables": allowed}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `resources` | `list[dict]` | Yes | List of resource dicts, each with `kind` (in `type:name` format) and `id` |
| `actions` | `list[str]` | Yes | Actions that must ALL be allowed (e.g., `["read", "update"]`) |
| `principal` | `None` | No | Always pass `None`. The server resolves the principal from the authenticated user's API key. |
| `aux_data` | `dict` | No | Auxiliary data for policy evaluation |
| `app_slug` | `str` | No | App slug (defaults to client's app_slug) |

### Get Allowed Actions

Get the list of allowed actions for a single resource:

```python
def main(params, user_data, sdk_client):
    allowed = sdk_client.policy.get_allowed_actions(
        {"kind": "datatable:users", "id": "users"}
    )
    # Returns e.g.: ["read", "create", "update"]  (delete not allowed)

    # Check specific actions only
    allowed = sdk_client.policy.get_allowed_actions(
        {"kind": "datatable:users", "id": "users"},
        actions=["read", "delete"]
    )

    return {"allowed_actions": allowed}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `resource` | `dict` | Yes | Resource dict with `kind` (in `type:name` format) and `id` |
| `actions` | `list[str]` | No | Actions to check (defaults to `["read", "create", "update", "delete"]`) |
| `principal` | `None` | No | Always pass `None`. The server resolves the principal from the authenticated user's API key. |
| `aux_data` | `dict` | No | Auxiliary data for policy evaluation |
| `app_slug` | `str` | No | App slug (defaults to client's app_slug) |

---

## Authentication

The injected `sdk_client` in functions is already authenticated — you do NOT need to call auth methods. These methods are only needed when initializing a separate SDK client (e.g., for different credentials).

### Sign In with Token

```python
def main(params, user_data, sdk_client):
    from taruvi import Client

    external_client = Client(
        api_url="http://localhost:8000",
        app_slug="other-app",
        mode="sync"
    )

    # Authenticate with JWT
    auth_client = external_client.auth.signInWithToken(
        token=params["external_jwt"],
        token_type="jwt"
    )

    # Authenticate with API key
    auth_client = external_client.auth.signInWithToken(
        token=params["api_key"],
        token_type="api_key"
    )

    result = auth_client.database.from_("users").execute()
    return {"data": result["data"]}
```

### Sign In with Password

```python
def main(params, user_data, sdk_client):
    from taruvi import Client

    external_client = Client(
        api_url="http://localhost:8000",
        app_slug="other-app",
        mode="sync"
    )

    auth_client = external_client.auth.signInWithPassword(
        email="user@example.com",
        password="password123"
    )

    result = auth_client.database.from_("users").execute()
    return {"data": result["data"]}
```

### Get Current User

```python
def main(params, user_data, sdk_client):
    # Works on the injected client too
    current_user = sdk_client.auth.get_current_user()
    return {"user": current_user}
```

### Sign Out

```python
def main(params, user_data, sdk_client):
    from taruvi import Client

    client = Client(api_url="http://localhost:8000", app_slug="my-app", mode="sync")
    auth_client = client.auth.signInWithToken(token="...", token_type="jwt")

    # Sign out — returns unauthenticated client
    unauth_client = auth_client.auth.signOut()

    return {"signed_out": True}
```

---

## Complete Examples

### Example 1: User Registration Workflow

```python
def main(params, user_data, sdk_client):
    """
    Complete user registration workflow:
    1. Create user in database
    2. Send welcome email (call function)
    3. Log activity
    """
    
    # 1. Create user record
    new_user = sdk_client.database.create("users", {
        "username": params['username'],
        "email": params['email'],
        "status": "pending",
        "created_by": user_data['username']
    })
    
    log(f"User created: {new_user['username']}", level="info", data=new_user)
    
    # 2. Send welcome email (async)
    email_result = sdk_client.functions.execute(
        "send-welcome-email",
        params={
            "email": new_user['email'],
            "username": new_user['username']
        },
        is_async=True
    )
    
    # 3. Log activity
    sdk_client.database.create("activity_log", {
        "user_id": new_user['id'],
        "action": "user_registered",
        "timestamp": params['__function__']['execution_time'],
        "metadata": {"email_task_id": email_result['invocation']['celery_task_id']}
    })
    
    return {
        "success": True,
        "user": new_user,
        "email_task_id": email_result['invocation']['celery_task_id']
    }
```

### Example 2: Data Processing Pipeline

```python
def main(params, user_data, sdk_client):
    """
    Process uploaded data file:
    1. Fetch file from storage
    2. Parse and validate data
    3. Insert into database
    4. Generate report
    """
    import csv
    import io
    
    # 1. Fetch file from storage
    file_data = sdk_client.storage.from_("uploads").download(params['filename'])
    
    log(f"Processing file: {params['filename']}", level="info")
    
    # 2. Parse data (CSV)
    reader = csv.DictReader(io.StringIO(file_data.decode('utf-8')))
    records = list(reader)
    
    # 3. Validate and insert
    valid_records = []
    errors = []
    
    for record in records:
        try:
            if not record.get('email') or '@' not in record['email']:
                raise ValueError("Invalid email")
            created = sdk_client.database.create("customers", record)
            valid_records.append(created)
        except Exception as e:
            errors.append({"record": record, "error": str(e)})
    
    # 4. Generate report
    report_result = sdk_client.functions.execute(
        "generate-import-report",
        params={
            "total": len(records),
            "success": len(valid_records),
            "errors": len(errors)
        }
    )
    
    return {
        "success": True,
        "total_records": len(records),
        "inserted": len(valid_records),
        "errors": errors,
        "report": report_result['data']
    }
```

### Example 3: Aggregation Dashboard

```python
def main(params, user_data, sdk_client):
    """Build a dashboard with aggregated data."""
    
    # Revenue by product category
    revenue = (
        sdk_client.database.from_("orders")
        .aggregate("sum(total_amount)", "count(*)")
        .group_by("product_category")
        .having("count(*) > 5")
        .execute()
    )
    
    # Search for specific products
    products = (
        sdk_client.database.from_("products")
        .search(params.get("query", ""))
        .page_size(10)
        .execute()
    )
    
    # Get app branding
    settings = sdk_client.app.settings()
    
    return {
        "revenue_by_category": revenue["data"],
        "search_results": products["data"],
        "app_name": settings["display_name"]
    }
```

### Example 4: API Integration with Error Handling

```python
def main(params, user_data, sdk_client):
    """Call external API and store results."""
    import requests
    
    try:
        # Get API credentials from secrets
        api_key = sdk_client.secrets.get("EXTERNAL_API_KEY")
        
        # Call external API
        response = requests.get(
            f"https://api.example.com/data/{params['resource_id']}",
            headers={"Authorization": f"Bearer {api_key['value']}"},
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        
        # Store result in database
        stored = sdk_client.database.create("api_cache", {
            "resource_id": params['resource_id'],
            "data": data,
            "fetched_by": user_data['username']
        })
        
        return {"success": True, "data": data, "cached_id": stored['id']}
        
    except requests.HTTPError as e:
        log(f"API error: {e.response.status_code}", level="error")
        return {"success": False, "error": "API request failed", "status_code": e.response.status_code}
        
    except Exception as e:
        log(f"Unexpected error: {str(e)}", level="error")
        return {"success": False, "error": str(e)}
```

---

## Best Practices

### 1. Use Structured Logging

```python
def main(params, user_data, sdk_client):
    log("Processing started", level="info", data={
        "user": user_data['username'],
        "params": params
    })
    
    import logging
    logger = logging.getLogger(__name__)
    logger.info("Processing step 1")
    
    return {"status": "completed"}
```

### 2. Handle Errors Gracefully

```python
def main(params, user_data, sdk_client):
    try:
        result = sdk_client.database.get("users", record_id=params['user_id'])
    except Exception as e:
        log(f"Error fetching user: {str(e)}", level="error")
        return {"success": False, "error": str(e)}
    
    return {"success": True, "user": result}
```

### 3. Validate Input Parameters

```python
def main(params, user_data, sdk_client):
    required = ['email', 'username', 'age']
    missing = [key for key in required if key not in params]
    
    if missing:
        return {"success": False, "error": f"Missing: {', '.join(missing)}"}
    
    if not isinstance(params['age'], int) or params['age'] < 0:
        return {"success": False, "error": "Age must be a positive integer"}
    
    user = sdk_client.database.create("users", params)
    return {"success": True, "user": user}
```

### 4. Use Pagination for Large Datasets

```python
def main(params, user_data, sdk_client):
    page = params.get('page', 1)
    page_size = 100
    
    result = (
        sdk_client.database.from_("users")
        .page(page)
        .page_size(page_size)
        .execute()
    )
    
    return {
        "page": page,
        "results": result["data"],
        "total": result["total"],
        "has_more": len(result["data"]) == page_size
    }
```

### 5. Use Async Execution for Long-Running Tasks

```python
def main(params, user_data, sdk_client):
    if params.get('dataset_size', 0) > 10000:
        result = sdk_client.functions.execute(
            "process-large-dataset",
            params=params,
            is_async=True
        )
        return {"task_id": result['invocation']['celery_task_id'], "message": "Processing in background"}
    
    result = sdk_client.functions.execute("process-small-dataset", params=params)
    return result['data']
```

### 6. Leverage Function Metadata

```python
def main(params, user_data, sdk_client):
    function_info = params['__function__']
    
    log(f"Function {function_info['name']} started", level="info", data={
        "slug": function_info['slug'],
        "mode": function_info['execution_mode'],
        "user": user_data['username']
    })
    
    return {"function": function_info['name']}
```

---

## Error Handling

### Common Errors and Solutions

#### 1. Missing SDK Client

```python
# ❌ Wrong - trying to use undefined client
def main(params, user_data, sdk_client):
    result = client.database.from_("users").execute()  # NameError!
    
# ✅ Correct - use sdk_client parameter
def main(params, user_data, sdk_client):
    result = sdk_client.database.from_("users").execute()
```

#### 2. Authentication Errors

```python
# ❌ Wrong - don't call auth methods on injected client
def main(params, user_data, sdk_client):
    auth_client = sdk_client.auth.signInWithPassword("user", "pass")  # Unnecessary!
    
# ✅ Correct - client is already authenticated
def main(params, user_data, sdk_client):
    result = sdk_client.database.from_("users").execute()
```

#### 3. Database Query Errors

```python
def main(params, user_data, sdk_client):
    try:
        result = sdk_client.database.from_("nonexistent_table").execute()
    except Exception as e:
        log(f"Database error: {str(e)}", level="error")
        return {"success": False, "error": str(e)}
    
    return {"success": True, "data": result["data"]}
```

#### 4. Function Execution Errors

```python
def main(params, user_data, sdk_client):
    try:
        result = sdk_client.functions.execute("nonexistent-function", params={})
    except Exception as e:
        log(f"Function execution error: {str(e)}", level="error")
        return {"success": False, "error": str(e)}
    
    return {"success": True, "result": result}
```

### Error Response Pattern

```python
def main(params, user_data, sdk_client):
    try:
        result = sdk_client.database.create("users", params)
        return {"success": True, "data": result}
    except Exception as e:
        log(f"Error: {str(e)}", level="error", data={
            "error_type": type(e).__name__,
            "params": params
        })
        return {"success": False, "error": str(e), "error_type": type(e).__name__}
```

---

## Allowed Modules

Functions can import these whitelisted modules:

### Standard Library
- `json`, `datetime`, `re`, `math`, `random`, `collections`, `itertools`, `functools`, `string`
- `decimal`, `uuid`, `base64`, `hashlib`, `urllib`, `heapq`, `bisect`, `csv`, `statistics`
- `copy`, `warnings`, `time`, `io`, `logging`

### HTTP/Network
- `requests` - HTTP library for API calls
- `httpx` - Modern async HTTP client
- `urllib3` - Low-level HTTP

### Data Science
- `numpy`, `pandas`

### Data Formats
- `yaml` - YAML parsing
- `tomli`, `tomllib` - TOML parsing
- `xml` - XML parsing

### Date/Time
- `dateutil` - Advanced date parsing
- `pytz` - Timezone support

### Text Processing
- `jinja2` - Template engine
- `markdown` - Markdown processing

### Crypto/Security
- `cryptography` - Encryption/decryption
- `jwt` - JWT token handling

### Data Validation
- `pydantic` - Data validation/parsing
- `jsonschema` - JSON schema validation

### Database
- `psycopg2` - PostgreSQL adapter
- `sqlalchemy` - SQL toolkit

### Cloud/AWS
- `boto3` - AWS SDK
- `botocore` - AWS core library

### AI/LLM
- `openai` - OpenAI API client
- `anthropic` - Anthropic Claude API client
- `langchain` - LangChain orchestration framework

---

## Summary

### Key Takeaways

1. ✅ **Use the injected `sdk_client`** - Already authenticated, no setup needed
2. ✅ **Follow the 3-parameter signature** - `def main(params, user_data, sdk_client)`
3. ✅ **Use structured logging** - `log()` helper and Python logging module
4. ✅ **Handle errors gracefully** - Try/except with proper error responses
5. ✅ **Validate inputs** - Check required parameters and data types
6. ✅ **Use pagination** - Don't fetch large datasets all at once
7. ✅ **Use async for long tasks** - Background execution for > 30 second operations
8. ✅ **Return JSON-serializable data** - Dict, list, str, int, bool, None

### Quick Reference

```python
def main(params, user_data, sdk_client):
    """Your function description."""
    
    if 'required_param' not in params:
        return {"success": False, "error": "Missing required_param"}
    
    log("Function started", level="info", data=params)
    
    try:
        result = sdk_client.database.from_("table").execute()
        return {"success": True, "data": result["data"]}
    except Exception as e:
        log(f"Error: {str(e)}", level="error")
        return {"success": False, "error": str(e)}
```

---
