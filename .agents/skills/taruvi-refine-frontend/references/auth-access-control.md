# Auth + access control (Taruvi Refine providers)

Taruvi Refine apps use OAuth redirect for login and Cerbos via `accessControlProvider` for per-action authorization.

## Auth flow (redirect-based)

No credentials login is implemented in `authProvider`. The flow is:

1. User hits a protected route.
2. Refine calls `authProvider.check()` → if no token, redirects to `/login`.
3. Your `/login` page (or `authProvider.login()` directly) redirects to Taruvi's login endpoint: `${apiUrl}/accounts/login/?callback=<returnUrl>`.
4. Taruvi handles the actual authentication (username/password, OAuth, etc.) and redirects back with tokens in the URL hash: `#session_token=xxx&...`.
5. `@taruvi/sdk` auto-extracts the token from the hash on `Client` construction, stores it in `localStorage`.
6. Subsequent API calls include `X-Session-Token` or `Authorization: Bearer` headers automatically.

## `authProvider` methods

### `login(params?)`

```typescript
type LoginParams = {
  callbackUrl?: string;
  redirect?: boolean;  // default true
  // username/password are accepted by type but ignored — no credentials flow
};
```

- If already authenticated: returns `{ success: true, redirectTo: "/" }` without calling Taruvi.
- If `redirect: false`: returns without redirecting (useful for custom login pages).
- Default: redirects to `auth.login(callbackUrl)` → Taruvi OAuth endpoint.

### `logout(params?)`

```typescript
type LogoutParams = {
  callbackUrl?: string;
};
```

Clears `_cachedUser`, calls `auth.logout(callbackUrl)`, returns `{ success: true, redirectTo: callbackUrl ?? "/login" }`.

### `check()`

Local check only — validates token presence in storage. Does **not** call Taruvi.

Returns `{ authenticated: true }` or `{ authenticated: false, redirectTo: "/login" }`.

Server-side validation happens on the first API call that fails with 401; `onError` handles that.

### `register(params?)`

Redirects to Taruvi signup flow: `${apiUrl}/accounts/signup/?callback=<returnUrl>`.

### `getIdentity()`

Returns the current user object or `null`. Caches to `_cachedUser` (module-level variable) on first call.

```typescript
const { data: user } = useGetIdentity();
// user: { id, username, email, first_name, last_name, roles, user_permissions, groups, is_staff, is_superuser, ... }
```

### `getPermissions()`

Reuses `_cachedUser` to avoid a second `/users/me` call. Returns:

```typescript
{
  roles: string[],           // role slugs
  permissions: string[],     // django-guardian permission codes
  groups: string[],          // Django group names
  is_staff: boolean,
  is_superuser: boolean,
}
```

Or `null` if not authenticated.

### `onError(error)`

Called by Refine on data-provider errors.

- 401 (Unauthorized) → `{ logout: true, redirectTo: "/login", error }`. Triggers automatic logout.
- 403 (Forbidden) → `{ error }`. Does **not** log out. Your UI handles 403 (e.g., show "No access").
- Other → `{ error }` passed through.

## `accessControlProvider` (Cerbos)

Every `useCan` call generates a permission check against Cerbos. To avoid N+1 requests, checks are batched via DataLoader within a 50ms window (configurable).

### Setup

```typescript
import { accessControlProvider } from "@taruvi/refine-providers";

<Refine
  accessControlProvider={accessControlProvider(client, {
    batchDelayMs: 50,   // default
  })}
/>
```

### Usage

```typescript
const { data: canEdit } = useCan({
  resource: "datatable:posts",   // prefixed form matching your Cerbos policy resource
  action: "update",
  params: { id: postId },        // optional per-instance check
});

if (canEdit?.can) {
  return <EditButton />;
}
```

`data` is `{ can: boolean, reason?: string }`.

### Resource naming convention

Use prefixed ACL resource strings — format: `<kind>:<name>`. Pass the prefixed string directly to `useCan`/`CanAccess`. Do **not** use `params.entityType`.

| Prefix | Format | Example |
|---|---|---|
| Datatable | `datatable:<table_name>` | `datatable:posts`, `datatable:orders` |
| Function | `function:<slug>` | `function:send-email` |
| Analytics query | `query:<slug>` | `query:daily-revenue` |
| Storage bucket | `bucket:<slug>` | `bucket:user-avatars` |

Your Cerbos policies (authored via `manage_policies` in `taruvi-backend-provisioning`) have a `resource` field like `"datatable:posts"` — the string you pass to `useCan` must match exactly. Mismatched strings silently deny.

### Menu integration

Menu components use `getAclResource(item)` from `src/utils/aclResource.ts` which reads `meta.aclResource` from the Refine resource definition:

```tsx
resources={[
  { name: "employees", meta: { aclResource: "datatable:employees" }, list: "/employees" },
  { name: "reports", meta: { aclResource: "query:monthly-report" }, list: "/reports" },
]}
```

No menu component changes needed — just set `meta.aclResource` on each resource.

### Batching behavior

Multiple `useCan` calls within 50ms collapse into one Cerbos `checkResource` request. For a list of 100 rows each calling `useCan`, you get 1 HTTP call, not 100.

Implications:

- **Latency**: first render has a 50ms delay before `can` values are known. Check `useCan`'s `isLoading`.
- **Testing**: `await waitFor` on the `data.can` value — synchronous assertions will see `isLoading: true`.
- **Cache**: TanStack Query caches results (5min staleTime, 10min gcTime by default). After a role change, manually invalidate via `queryClient.invalidateQueries({ queryKey: ["access-control"] })`.

### Per-row permissions via `meta.allowedActions`

For a list page, instead of calling `useCan` per row, use `meta.allowedActions` on the list query:

```typescript
useList({
  resource: "posts",
  meta: { allowedActions: ["update", "delete"] },
});
```

The response decorates each row with `_allowed_actions: ["update", "delete"]` (a subset). Check membership client-side — no Cerbos round-trip per row.

This is the preferred pattern for list UIs. Reserve `useCan` for per-page button gating.

## Common patterns

### Gate a whole page

```typescript
import { useCan, useGetIdentity } from "@refinedev/core";

function AdminPage() {
  const { data: canAccess, isLoading } = useCan({
    resource: "admin",
    action: "access",
  });

  if (isLoading) return <Spinner />;
  if (!canAccess?.can) return <Navigate to="/forbidden" />;

  return <AdminContent />;
}
```

### Show different UI based on role

```typescript
const { data: identity } = useGetIdentity();

if (identity?.roles?.includes("admin")) {
  return <AdminView />;
}
return <UserView />;
```

### Per-row delete button with `allowedActions`

```typescript
const { data } = useList({
  resource: "posts",
  meta: { allowedActions: ["update", "delete"] },
});

return data?.data.map((post) => (
  <Row key={post.id}>
    {post._allowed_actions.includes("delete") && <DeleteButton id={post.id} />}
  </Row>
));
```

## Gotchas

1. **`authProvider.check()` is local only.** Token presence ≠ token validity. A revoked token looks authenticated until the first API call fails with 401.
2. **`_cachedUser` is module-level.** It persists across `getIdentity()`/`getPermissions()` calls but is cleared on `logout()`. After an admin changes a user's role, the user's cached identity is stale until they logout or refresh.
3. **DataLoader batching affects tests.** `useCan` in a test without `waitFor` will always return `isLoading: true`. Wrap assertions in `waitFor(() => expect(...).toBe(...))`.
4. **403 does not trigger logout.** Handle the error in UI (toast, redirect to a "/forbidden" page). Don't assume Refine handles it.
5. **401 on a public endpoint** still triggers logout. If you have endpoints that don't require auth, make sure they don't error 401 — use `isPublic` on the underlying API if available.
6. **`useCan` with `params: { id: ... }` makes a per-instance check.** Cerbos needs to evaluate the resource attrs for that instance — this can't be batched with other `id`s unless you use `allowedActions`.
7. **OAuth callback URL must be allowlisted** in Taruvi's OAuth config. Dev URLs (`localhost:3000`) need explicit allowlisting per app.
