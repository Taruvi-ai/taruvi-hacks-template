---
name: taruvi-refine-frontend
description: Build Refine.dev admin UIs backed by Taruvi using `@taruvi/refine-providers` v1.3.0. Six providers wrap the Taruvi data API, storage, app-level resources, users, auth (OAuth redirect), and Cerbos accessControl. Use for list/show/edit/create pages against Taruvi datatables, file browsers on storage buckets, role/user management UI, accessControl with useCan, OAuth login flow, useCustom against functions and analytics. TRIGGERS include "Refine page Taruvi", "useList Taruvi", "Taruvi admin UI", "dataProvider Taruvi", "@taruvi/refine-providers", "meta.populate", "meta.bucketName", "meta.idColumnName", "Taruvi accessControl Refine", "Taruvi useCustom meta.kind", "refine-providers upsert", "Taruvi OAuth Refine". SKIP when provisioning backend (use taruvi-backend-provisioning) or writing Python function code (use taruvi-functions). Covers all 6 providers, 24 filter operators, DataLoader batching, _cachedUser, 401/403 split, and the meta options consumers reach for.
license: Apache-2.0
compatibility: Requires `@refinedev/core` ^5.0.0 (Refine v5) and `@taruvi/sdk` + `@taruvi/refine-providers` installed in the consuming React/Refine project.
metadata:
  author: EOX Vantage
  version: "1.0.0"
  organization: Taruvi
---

# Taruvi Refine frontend

Use `@taruvi/refine-providers` to connect Refine.dev admin UIs to Taruvi. This skill covers the six providers, how to wire resources, the `meta` vocabulary that unlocks Taruvi-specific features (populate, aggregate, graph, upsert), and the gotchas that aren't obvious from the package API alone.

This skill is the **frontend layer**. If you're provisioning backend resources, switch to `taruvi-backend-provisioning`. If you're writing Python for a Taruvi function body, switch to `taruvi-functions`.

**Compliance rule:** This skill and its references are the source of truth for all provider usage. Do not substitute with simpler patterns, copy outdated project code, or skip prescribed steps. If a requirement cannot be met, stop and ask the user.

## Core principles

1. **Resource name = datatable name** by default. Override with `meta.tableName` when they must differ (e.g., `resource: "active_users"` queries `tableName: "users"` with a filter).
2. **Meta is the control surface.** Refine's `meta` object is how you reach Taruvi-specific features (populate, aggregate, graph, bucketName, idColumnName, upsert, deleteByFilter). Don't try to push these through filters or query params.
3. **Multiple providers, one client.** Register all six providers against the same `Client` instance. Select providers by `dataProviderName` in hooks.
4. **Auth is redirect-based.** There is no credentials login in the default Refine flow. `authProvider.login()` redirects to Taruvi's login endpoint.
5. **AccessControl batches.** Permission checks are debounced 50ms via DataLoader. Tests that don't `await` will flake.
6. **`populate` only accepts declared relationships.** Before adding `meta.populate`, verify the table's available relationships from schema metadata. Do not populate plain UUID fields unless they are declared relationships.

## Setup

```typescript
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
  apiKey: process.env.REACT_APP_TARUVI_KEY!,
  appSlug: process.env.REACT_APP_TARUVI_APP!,
  apiUrl: process.env.REACT_APP_TARUVI_API_URL!,
});

export function App() {
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
      resources={[
        { name: "posts", list: "/posts", create: "/posts/create", edit: "/posts/edit/:id" },
        { name: "authors" },
      ]}
    >
      {/* Routes, layouts, pages */}
    </Refine>
  );
}
```

## The six providers

### 1. `dataProvider` (default)

CRUD against Taruvi datatables. Covers `getList`, `getOne`, `getMany`, `create`, `createMany`, `update`, `updateMany`, `deleteOne`, `deleteMany`, `custom`.

See [references/data-provider.md](references/data-provider.md) for full API.

Filter operators ([references/filter-operators.md](references/filter-operators.md)): 24 supported — `eq`, `ne`, `lt/lte/gt/gte`, `in/nin`, `contains/containss` (case-insensitive), `startswith/endswith` (plus `s` suffix for case-insensitive), negated forms (`ncontains`, `nstartswith`, etc.), `between/nbetween`, `null/nnull`.

### 2. `storageDataProvider`

Buckets and objects. Resource name = bucket name (or override via `meta.bucketName`).

- `getList` — list files in bucket, supports size/date/prefix filters.
- `getOne` — download file as Blob (default) or get metadata (`meta.metadata: true`).
- `create` — upload files: `values: { files: File[], paths?: string[], metadatas?: object[] }`.
- `update` — update file metadata.
- `deleteOne` / `deleteMany` — delete by path.

See [references/provider-quickref.md](references/provider-quickref.md).

### 3. `appDataProvider`

App-level resources: roles, settings, secrets; plus `useCustom` for function and analytics execution.

Supported resources:
- `getList("roles")` — list app roles.
- `getList("secrets")` — batch fetch by `meta.keys: string[]`.
- `getOne("settings")` — app settings.
- `getOne("secrets", key)` — single secret.

`useCustom` for execution:
- `meta.kind: "function"` → executes `url` as function slug.
- `meta.kind: "analytics"` → executes `url` as analytics query slug.

### 4. `userDataProvider`

Users, roles (per user), user-apps. `resource: "users"` with `id: "me"` fetches current user. `resource: "roles"` with `meta.username` fetches that user's roles. `resource: "apps"` with `meta.username` fetches accessible apps.

### 5. `authProvider`

Refine `AuthProvider` interface backed by Taruvi's OAuth redirect flow.

- `login(callbackUrl?)` — redirects to Taruvi login endpoint. No credentials flow.
- `logout(callbackUrl?)` — clears cached user, redirects.
- `check()` — token presence check (local); server validation happens on API call failure.
- `register(callbackUrl?)` — redirect to signup.
- `getIdentity()` — current user, cached to `_cachedUser`.
- `getPermissions()` — reuses `_cachedUser` to avoid a second call.
- `onError(error)` — 401 → logout + redirect to `/login`; 403 → surface error only.

See [references/auth-access-control.md](references/auth-access-control.md).

### 6. `accessControlProvider`

Cerbos permission checks via Taruvi `Policy`. DataLoader batches checks within a 50ms window (configurable via `options.batchDelayMs`).

```typescript
const { data: canCreate } = useCan({
  resource: "posts",
  action: "create",
});
```

Returns `{ can: boolean, reason?: string }`. Falls back gracefully if user is unauthenticated.

## The `meta` vocabulary

See [references/meta-options-cookbook.md](references/meta-options-cookbook.md) for the full list.

Quick reference:

| Meta field | Purpose | Example |
|---|---|---|
| `populate` | Expand FK relations | `"author,category"` or `"*"` or `["author", "comments"]` |
| `select` | Field projection (return only listed fields) | `["id", "total", "status"]` |
| `headers` | Custom request headers | `{ "X-Request-ID": "..." }` |
| `idColumnName` | Override default `"id"` PK | `"user_id"` |
| `tableName` | Override resource → table mapping | `"users"` (when resource is `"active_users"`) |
| `bucketName` | Override resource → bucket mapping (storage) | `"user-uploads"` |
| `aggregate` | Aggregate expressions | `["sum(total)", "count(*)"]` |
| `groupBy` | Group-by fields | `["status", "category"]` |
| `having` | Filters on aggregates | `[{field: "sum(total)", operator: "gte", value: 1000}]` |
| `format` | Graph format | `"tree"` \| `"graph"` |
| `include` | Graph direction | `"descendants"` \| `"ancestors"` \| `"both"` |
| `depth` | Graph traversal depth | `3` |
| `graph_types` | Filter edge types in graph | `["parent_of", "related"]` |
| `upsert` | Use upsert on create | `true` |
| `deleteByFilter` | Delete matching filters | `true` (plus `meta.filters`) |
| `allowedActions` | Request per-row permissions | `["update", "delete"]` |
| `metadata` | Storage: return metadata vs blob | `true` |
| `kind` | App provider: function vs analytics | `"function"` \| `"analytics"` |
| `keys` | App provider secrets: which to fetch | `["STRIPE_KEY", "API_URL"]` |
| `username` | User provider: for roles/apps | `"alice"` |

## Common patterns

### List with populate and filters

```typescript
const { data, isLoading } = useList({
  resource: "posts",
  filters: [
    { field: "status", operator: "eq", value: "published" },
    { field: "author_id", operator: "in", value: [1, 2, 3] },
  ],
  sorters: [{ field: "created_at", order: "desc" }],
  pagination: { currentPage: 1, pageSize: 20 },
  meta: {
    populate: ["author", "category"],
  },
});
```

### Upsert on create

```typescript
const { mutate } = useCreate();

mutate({
  resource: "users",
  values: { id: 42, email: "new@example.com" },
  meta: { upsert: true },
});
```

### Graph traversal

```typescript
const { data } = useList({
  resource: "categories",
  meta: {
    format: "tree",
    include: "descendants",
    depth: 3,
  },
});
```

### Aggregation

```typescript
const { data } = useList({
  resource: "orders",
  meta: {
    aggregate: ["sum(total)", "count(*)"],
    groupBy: ["status"],
    having: [{ field: "sum(total)", operator: "gte", value: 1000 }],
  },
});
```

### File upload

```typescript
const { mutate } = useCreate();

mutate({
  dataProviderName: "storage",
  resource: "user-uploads",
  values: {
    files: [file1, file2],
    paths: [`${userId}/avatar.png`, `${userId}/cover.png`],
    metadatas: [{ kind: "avatar" }, { kind: "cover" }],
  },
});
```

### Execute a function from the UI

```typescript
const { refetch: sendEmail } = useCustom({
  dataProviderName: "app",
  url: "send-welcome-email",
  method: "post",
  config: { payload: { user_id: userId } },
  meta: { kind: "function" },
  queryOptions: { enabled: false },
});
```

### Access control on a button

```typescript
const { data: canDelete } = useCan({
  resource: "posts",
  action: "delete",
  params: { id: postId },
});

return canDelete?.can ? <DeleteButton id={postId} /> : null;
```

## Production-ready implementation rules

### List pages (backend-driven by default)

- Backend pagination is required. Default `pageSize: 10`; support `10`, `20`, `50`, `100` as selectable options.
- Search, filters, and sorting must be server-side by default. Do not fetch rows and filter in React.
- Provide visible search input and relevant filter controls (e.g., status, department, date range).
- When using MUI `DataGrid`, default to Refine `useDataGrid` — do not hand-wire `useList` + component state.
- Client-side filtering is only allowed if the user explicitly asks for it.
- If list queries use `meta.populate`, only include relationship names that are actually declared on the table. Validate first; invalid relationship names cause 400s.

### Network-backed dropdowns

- Use `Autocomplete` (or equivalent typeahead), not a static `Select`.
- Query options from the backend with pagination (default option `pageSize: 10`).
- Debounce input before sending search requests.
- Send the search term as server-side filters, not client-side filtering over fetched options.

### Storage uploads (multi-file by default)

- Allow selecting/uploading multiple files per action by default.
- Process each file independently and capture per-file success/failure.
- Keep storage object and metadata record creation/deletion consistent.
- After upload/delete, invalidate/refetch file lists so UI reflects current state.
- Use the path-based pattern: store file paths in the database, generate URLs on-demand via `getStorageUrl()` from `src/utils/storageHelpers.ts`.
- Available helpers: `uploadFile()`, `uploadFileWithCleanup()` (edit forms — auto-deletes old file), `deleteFile()`, `getStorageUrl()`, `generateFilePath()`.

### Notifications

- Use Refine's `notificationProvider` for all success/error feedback.
- Do not introduce custom toast/snackbar systems.

### Optional chaining

- Always use `?.` when accessing properties on hook results — data may be `undefined` during loading (e.g., `result?.data?.map(...)`, not `result.data.map(...)`).

## Gotchas

1. **`meta.idColumnName` defaults to `"id"`.** Tables with a different PK must pass `idColumnName` on every hook that needs it (`useOne`, `useUpdate`, `useDelete`).
2. **Resource vs table name.** Refine's resource name goes straight to Taruvi unless `meta.tableName` overrides. If you name your resource `active-users` but the table is `users`, you'll get a 404.
3. **`_cachedUser` staleness.** After a role change, the cached user is stale until logout or page refresh. Force re-fetch via `useGetIdentity` with `queryOptions: { refetchOnMount: true }` if you need fresh permissions.
4. **401 vs 403 onError semantics.** 401 triggers logout + redirect; 403 does not. Handle 403 UX yourself (toast, error page).
5. **`authProvider.login()` without `callbackUrl` goes to the default callback.** Pass one if you want to land back on the originating page.
6. **`useCan` fires for every row.** A list of 100 rows calling `useCan` per row → 100 batched checks in one request via DataLoader, but that first render is 50ms delayed. Test with `await` in tests.
7. **`useCustom` with `meta.kind: "function"` ignores `method`.** Functions are always POST under the hood.
8. **Storage `getOne` returns a Blob by default.** Pass `meta.metadata: true` to get the file's metadata object instead.
9. **Graph format="tree" requires `hierarchy.enabled` on the table.** Graph format requires `graph.enabled`. See the backend-provisioning skill for schema setup.
10. **`user-invocable: false`-style skills don't apply here** — this is a client-side library, not an agent skill runtime. Don't confuse consumer app configuration with agent skill metadata.
11. **`populate` relationship mismatch returns 400.** Example: a field like `manager_id` may exist as UUID data but still not be a declared relationship for populate. Check available relationships before adding it to `meta.populate`.

## Verification checklist

Before reporting a frontend feature as done:

- [ ] Every new Refine resource is registered in the `<Refine resources={[...]}>` array with at least a `name`.
- [ ] Resources whose name doesn't match the Taruvi datatable have `meta.tableName` set on every hook — or the resource is renamed to match.
- [ ] Tables with non-`id` primary keys pass `meta.idColumnName` on every hook (`useOne`, `useUpdate`, `useDelete`, `useUpdateMany`).
- [ ] Dashboard / KPI widgets aggregate server-side (`meta.aggregate`/`meta.groupBy` for single-table, or `useCustom` with `meta.kind: "analytics"` for 2 or more tables) — never full row fetches derived in React.
- [ ] List pages use backend pagination (default `pageSize: 10`), server-side filters, server-side sort. No client-side filtering of backend results.
- [ ] List pages include visible search input and relevant filter controls by default.
- [ ] Backend-backed MUI `DataGrid` lists use `useDataGrid` by default.
- [ ] Network-backed dropdowns use debounced server-side `Autocomplete` with pagination — not static `Select`.
- [ ] `useCan` or `meta.allowedActions` gates the right UI elements; 403 vs 401 errors render as expected.
- [ ] Access control uses prefixed ACL resource strings (`datatable:X`, `function:X`, `query:X`). No `params.entityType`.
- [ ] Resources with access control have `meta.aclResource` set for menu integration.
- [ ] Storage uploads default to multi-file. Per-file status is surfaced on failure.
- [ ] Notifications go through Refine's `notificationProvider` — no ad-hoc toast libraries.
- [ ] All hook result access uses optional chaining (`?.`) — no bare `.data.map()` on potentially undefined results.
- [ ] No N+1 patterns (looping `useOne` inside a list render — use `useMany` or `meta.populate` instead).
- [ ] Every `meta.populate` field is validated against declared table relationships (from schema metadata); no plain UUID fields are included unless declared as relationships.

## When you get stuck

- Full API reference for the default provider: [references/data-provider.md](references/data-provider.md).
- Every filter operator: [references/filter-operators.md](references/filter-operators.md).
- All `meta` options in context: [references/meta-options-cookbook.md](references/meta-options-cookbook.md).
- Auth + access control details: [references/auth-access-control.md](references/auth-access-control.md).
- Provider quick reference (all 6): [references/provider-quickref.md](references/provider-quickref.md).
- Direct `@taruvi/sdk` usage when providers don't fit: [references/sdk-primer.md](references/sdk-primer.md).
- Exported types and utility functions: [references/types-and-utilities.md](references/types-and-utilities.md).
- **Backend capabilities** (what operators/filters/aggregations the server supports): load `taruvi-backend-provisioning` and read its `references/backend-capabilities.md`.
- Validate Refine resources match Taruvi datatables: `node scripts/validate-resource-map.js` (see script header for usage).
