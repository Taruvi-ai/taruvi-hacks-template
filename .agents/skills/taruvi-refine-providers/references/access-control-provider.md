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
  batchDelayMs: 50, // ms to wait before batching (default: 50)
});
```

## Check Permissions

Use prefixed ACL resource strings — format: `<kind>:<name>` (e.g., `datatable:employees`, `function:employee-terminate`, `query:hrms-dashboard-summary`).

```tsx
const { data } = useCan({
  resource: "datatable:posts",
  action: "edit",
  params: { id: 1 },
});

if (data?.can) {
  // User can edit this post
}
```

Do **not** use `params.entityType` — pass the prefixed resource string directly.

## CanAccess Component

```tsx
<CanAccess resource="datatable:posts" action="delete" params={{ id: 1 }}>
  <DeleteButton />
</CanAccess>
```

## Resource Prefixes

| Prefix | Use for |
|---|---|
| `datatable:<name>` | Datatable CRUD operations |
| `function:<slug>` | Serverless function execution |
| `query:<slug>` | Analytics query execution |

## Caching

Uses Refine's built-in TanStack Query caching:
- `staleTime`: 5 minutes
- `gcTime`: 10 minutes

DataLoader handles request batching only (its own cache is disabled).

## Default UI Behavior

- `buttons.enableAccessControl`: `true` — access control checks enabled on all buttons
- `buttons.hideIfUnauthorized`: `true` — buttons are hidden (not just disabled) when unauthorized
