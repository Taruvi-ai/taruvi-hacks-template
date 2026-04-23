# Exported types and utility functions

Everything `@taruvi/refine-providers` exports beyond the six providers. Verified against `src/index.ts` in v1.3.0.

## Types

```typescript
import type {
  // Data provider types
  StorageUploadVariables,
  FunctionMeta,
  AnalyticsMeta,
  AppCustomMeta,

  // Auth types
  LoginParams,
  LogoutParams,
  RegisterParams,

  // Core types
  TaruviMeta,
  TaruviListResponse,
  StorageDownloadResponse,
  AllowedAction,
} from "@taruvi/refine-providers";
```

### `TaruviMeta`

Extends Refine's `MetaQuery`. Use it as your `meta` type in hooks for full type safety.

```typescript
import { useList } from "@refinedev/core";
import type { TaruviMeta } from "@taruvi/refine-providers";

const { data } = useList<Post, HttpError, TaruviMeta>({
  resource: "posts",
  meta: {
    populate: ["author"],
    aggregate: ["count(*)"],
    groupBy: ["status"],
    select: ["id", "title", "status"],
    allowedActions: ["update", "delete"],
  },
});
```

Full field list: see [meta-options-cookbook.md](meta-options-cookbook.md).

### `StorageUploadVariables`

Shape for `useCreate` against the storage provider:

```typescript
interface StorageUploadVariables {
  files: File[];
  paths?: string[];                      // one per file; defaults to file.name
  metadatas?: Record<string, unknown>[]; // one per file; defaults to {}
}
```

### `FunctionMeta`, `AnalyticsMeta`, `AppCustomMeta`

For `useCustom` with the `app` data provider:

```typescript
interface FunctionMeta {
  kind: "function";
  async?: boolean;
}

interface AnalyticsMeta {
  kind: "analytics";
}

type AppCustomMeta = FunctionMeta | AnalyticsMeta;
```

### `LoginParams`, `LogoutParams`, `RegisterParams`

```typescript
interface LoginParams {
  callbackUrl?: string;
  redirect?: boolean;       // default true
  username?: string;        // accepted by type, ignored at runtime (no creds flow)
  password?: string;
}

interface LogoutParams {
  callbackUrl?: string;
}

interface RegisterParams {
  callbackUrl?: string;
}
```

### `TaruviListResponse<T>`

Standard envelope wrapping list results:

```typescript
interface TaruviListResponse<T> {
  data: T[];
  total: number;
  pagination?: PaginationInfo;
}
```

### `StorageDownloadResponse`

Alias for `Blob` — what storage `getOne` returns by default (unless `meta.metadata: true`).

### `AllowedAction`

```typescript
type AllowedAction = "read" | "create" | "update" | "delete" | string;
```

## Utilities

```typescript
import {
  REFINE_OPERATOR_MAP,
  convertRefineFilters,
  convertRefineSorters,
  convertRefinePagination,
  buildRefineQueryParams,
  buildQueryString,
  handleError,
} from "@taruvi/refine-providers";
```

### `REFINE_OPERATOR_MAP`

The 24-entry map from Refine operator names to Taruvi DRF-style query suffixes. See [filter-operators.md](filter-operators.md) for the full table.

Use when building custom query strings outside the provider:

```typescript
const suffix = REFINE_OPERATOR_MAP["gte"]; // "gte"
const queryKey = `age__${suffix}`; // "age__gte"
```

### `convertRefineFilters(filters?: CrudFilter[])`

Converts a Refine filters array to Taruvi DRF-style query params.

```typescript
const queryParams = convertRefineFilters([
  { field: "status", operator: "eq", value: "published" },
  { field: "total", operator: "gte", value: 100 },
]);
// { status: "published", "total__gte": "100" }
```

### `convertRefineSorters(sorters?: CrudSort[])`

Converts Refine sorters to a DRF `ordering` string.

```typescript
const ordering = convertRefineSorters([
  { field: "created_at", order: "desc" },
  { field: "title", order: "asc" },
]);
// "-created_at,title"
```

### `convertRefinePagination(pagination?: Pagination)`

Converts to `{page, page_size}`.

```typescript
const params = convertRefinePagination({ currentPage: 3, pageSize: 50 });
// { page: 3, page_size: 50 }
```

### `buildRefineQueryParams(options)`

Combines filters, sorters, and pagination in one call.

```typescript
const qp = buildRefineQueryParams({
  filters: [...],
  sorters: [...],
  pagination: { currentPage: 1, pageSize: 20 },
});
```

### `buildQueryString(params?)`

Serializes a params object to a URL query string.

```typescript
const qs = buildQueryString({ foo: "bar", baz: "qux" });
// "foo=bar&baz=qux"
```

### `handleError(error)`

Normalizes errors from SDK calls to Refine-compatible shape. Use when writing your own data-provider-like code that needs to surface errors through Refine's hooks.

## Deprecated exports (still present, don't use for new code)

```typescript
import { functionsDataProvider, analyticsDataProvider } from "@taruvi/refine-providers";
```

Both are marked `@deprecated`. Use `appDataProvider` + `useCustom` with `meta.kind: "function"` / `meta.kind: "analytics"` instead. The deprecated providers will be removed in a future major version — don't wire new code to them.

## When you don't need these

Most consumers stay on the six provider-level APIs + `TaruviMeta` for typed meta objects. The utilities are for advanced cases:

- Writing a custom data provider that mixes Taruvi patterns with other backends.
- Building a server-side proxy that translates Refine-style requests to Taruvi REST calls.
- Composing additional meta-option helpers that build on `REFINE_OPERATOR_MAP`.

If you're building a normal Refine UI on Taruvi, you can mostly ignore this file.
