---
inclusion: fileMatch
fileMatchPattern: '**/*.{ts,tsx}'
---

# Refine v5 syntax

Taruvi app templates use **Refine v5**. Hook return shapes changed significantly from v4 —
v4 syntax silently produces `undefined`, so check this before writing hooks.

## Data hooks — `result` + `query`

```typescript
// ❌ v4
const { data, isLoading } = useList({ resource: "posts" });
const posts = data.data;

// ✅ v5
const { result, query: { isLoading, isError } } = useList({ resource: "posts" });
const posts = result.data;
```

`useOne` / `useMany` / `useShow` return the record directly — no `.data` unwrap:

```typescript
const { result: user, query: { isLoading } } = useOne({ resource: "users", id: 1 });
```

## Mutation hooks — `mutation` + `mutate`

```typescript
// ❌ v4: const { isLoading, mutate } = useUpdate();
// ✅ v5:
const { mutate, mutation: { isPending, isError } } = useUpdate();
```

Note `isPending`, not `isLoading`.

## Table hooks

```typescript
// ❌ v4: const { tableQueryResult, setCurrent } = useDataGrid();
// ✅ v5:
const { dataGridProps, tableQuery, result } = useDataGrid({ resource: "blog_posts" });
```

## Renamed parameters

| ❌ v4 | ✅ v5 |
|---|---|
| `metaData` | `meta` |
| `sorter` / `sort` | `sorters` |
| `hasPagination: false` | `pagination: { mode: "off" }` |
| `initialCurrent` | `pagination: { currentPage: 1 }` |
| `initialPageSize` | `pagination: { pageSize: 20 }` |
| `isLoading` (mutations) | `isPending` |
| `useResource("posts")` | `useResourceParams({ resource: "posts" })` |
| `ignoreAccessControlProvider` | `accessControl={{ enabled: false }}` |
| `options: { label }` | `meta: { label }` |

## Stable query inputs

Unstable hook arguments change the query key and cause repeated refetches.

- Memoize `filters`, `sorters`, and `meta` when derived in component scope.
- No inline `new Date()`, `Date.now()`, `Math.random()`, or fresh arrays/objects in hook args.
- Compute date cutoffs once with `useMemo` or a module-level constant.
- If a query refetches without user input, inspect the hook arguments before blaming the provider.

## Framework discipline

Even if asked for plain HTML/CSS/JS, build with React + Refine v5 hooks + MUI + TypeScript.
Leverage the framework's hooks rather than reinventing CRUD.
