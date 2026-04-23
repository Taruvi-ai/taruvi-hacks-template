# Provider quick reference (all 6)

One-page summary of every provider's supported operations, resources, and key meta fields.

## `dataProvider(client)` — default

Wraps Taruvi `Database` (datatables) + `Graph` (edges).

**Resources:** any datatable name (or `meta.tableName` override).

**Supported:** `getList`, `getOne`, `getMany`, `create`, `createMany`, `update`, `updateMany`, `deleteOne`, `deleteMany`, `custom`.

**Key meta:** `populate`, `idColumnName`, `tableName`, `aggregate`, `groupBy`, `having`, `upsert`, `deleteByFilter`, `allowedActions`, `format`, `include`, `depth`, `graph_types`.

**Endpoints:** `api/apps/{appSlug}/datatables/{table}/data/` and `/data/{id}/`.

---

## `storageDataProvider(client)` — storage

Wraps Taruvi `Storage`.

**Resources:** any bucket slug (or `meta.bucketName` override).

**Supported:** `getList`, `getOne`, `create`, `createMany`, `update`, `deleteOne`, `deleteMany`, `custom`.

**Not supported:** `getMany` (returns empty), `updateMany` (undefined).

**Key meta:** `bucketName`, `metadata` (return metadata vs blob on getOne), `prefix`.

**Special shapes:**

- `create` values: `{ files: File[], paths?: string[], metadatas?: object[] }`.
- `getOne` returns `Blob` by default, or metadata object when `meta.metadata: true`.

**Endpoints:** `api/apps/{appSlug}/storage/buckets/{bucket}/objects/`.

---

## `appDataProvider(client)` — app

Wraps Taruvi `App`, `Functions`, `Analytics`, `Secrets`.

**Resources (fixed set):**

| Resource | Operations supported |
|---|---|
| `roles` | `getList` |
| `settings` | `getOne` |
| `secrets` | `getList` (requires `meta.keys`), `getOne` |

**Plus `custom` for execution:**

- `useCustom` with `meta.kind: "function"` → executes function at `url` (function slug).
- `useCustom` with `meta.kind: "analytics"` → executes analytics query at `url` (query slug).

**Not supported:** `getMany`, `create`, `createMany`, `update`, `updateMany`, `deleteOne`, `deleteMany`. All throw explicit errors.

**Key meta:** `kind`, `keys`, `tags`, `app`, `includeMetadata`.

**Function helper utilities** (in `src/utils/functionHelpers.ts`):

```typescript
import { executeFunction, executeFunctionAsync } from "../../utils/functionHelpers";

// Sync — wait for result
const result = await executeFunction("calculate-total", { items: [1, 2, 3] });

// Async — fire and forget
executeFunctionAsync("send-notification", { message: "Done" }).catch(console.warn);
```

These helpers call `appDataProvider.custom()` with the correct contract (`url: slug, method: "post", payload: params, meta: { kind: "function" }`).

---

## `userDataProvider(client)` — user

Wraps Taruvi `User` + `Auth`.

**Resources (fixed set):**

| Resource | Operations |
|---|---|
| `users` | `getList`, `getOne` (id can be username or `"me"`), `create`, `update`, `deleteOne` |
| `roles` | `getList` (requires `meta.username`) |
| `apps` | `getList` (requires `meta.username`) |

**Not supported:** `getMany`, `createMany`, `updateMany`, `deleteMany`, `custom`.

**Key meta:** `username`.

**Special `id` values:**

- `getOne({ resource: "users", id: "me" })` → calls `Auth.getCurrentUser()`.

**Endpoints:** `api/users/{username}/`, `api/users/me/`.

**User provider gotchas:**
- **Missing `dataProviderName: "user"`** — forgetting it routes to the database provider, returning confusing errors.
- **User search** — use the `search` filter field, not `username__contains`. Backend search covers username, email, and name.
- **Role assignment is separate** — creating a user does not assign roles. Use `sdk_client.users.assign_roles()` in a function, or the roles API separately.

---

## `authProvider(client)` — auth

Refine `AuthProvider` interface. OAuth redirect flow, no credentials.

**Methods:** `login`, `logout`, `check`, `register`, `getIdentity`, `getPermissions`, `onError`.

**Behavior:**

- 401 → logout + redirect.
- 403 → pass through error.
- `_cachedUser` module-level cache shared with `accessControlProvider`.

**Endpoints:** `${apiUrl}/accounts/login/`, `/accounts/logout/`, `/accounts/signup/`, `api/users/me/`.

---

## `accessControlProvider(client, options?)` — accessControl

Cerbos via Taruvi `Policy`. DataLoader batching (50ms default).

**Returns:** `{ can: boolean, reason?: string }` from `useCan`.

**Options:**

```typescript
accessControlProvider(client, {
  batchDelayMs: 50,  // default
});
```

**TanStack defaults:** 5min staleTime, 10min gcTime.

**Endpoint:** `api/apps/{appSlug}/check/resources/`.

---

## Hook × provider support matrix

Which Refine hook works with which Taruvi provider. ✓ = supported, — = not applicable (throws an explicit error), △ = supported only with specific `meta` fields.

| Hook | `default` (datatables) | `storage` | `app` | `user` |
|---|---|---|---|---|
| `useList` | ✓ | ✓ | ✓ (fixed resources only) | ✓ (fixed resources only) |
| `useOne` | ✓ | ✓ (returns Blob or meta) | ✓ (`settings`, `secrets`) | ✓ (`users`, incl. id="me") |
| `useMany` | ✓ | — | — | — |
| `useCreate` | ✓ | ✓ (upload) | — | ✓ (`users`) |
| `useCreateMany` | ✓ | ✓ (batch upload) | — | — |
| `useUpdate` | ✓ | ✓ (metadata) | — | ✓ (`users`) |
| `useUpdateMany` | ✓ (needs `meta.idColumnName` if PK ≠ id) | — | — | — |
| `useDelete` | ✓ | ✓ | — | ✓ (`users`) |
| `useDeleteMany` | ✓ (also supports `meta.deleteByFilter`) | ✓ | — | — |
| `useCustom` | ✓ (bypass to endpoint) | — | △ (requires `meta.kind: "function"` or `"analytics"`) | — |
| `useCan` / `CanAccess` | via `accessControlProvider` | via `accessControlProvider` | via `accessControlProvider` | via `accessControlProvider` |
| `useGetIdentity` | via `authProvider` | | | |
| `useLogin` / `useLogout` / `useRegister` | via `authProvider` | | | |

Rules of thumb:

- For **fixed-resource** providers (`app`, `user`), only the whitelisted resource names work. Attempting an unsupported resource or operation throws a clear error — don't silently fail.
- For **graph queries** on the default provider, pass `meta.format`, `meta.include`, `meta.depth`, `meta.graph_types`. See [meta-options-cookbook.md](meta-options-cookbook.md).
- For **batch ops on storage**, see the partial-success semantics below.

## Storage batch semantics (partial-success rules)

| Op | Behavior on partial failure |
|---|---|
| `useCreate` batch upload (`values.files` array) | **All-or-nothing**. If any file fails validation or upload, the whole batch errors and nothing is committed. Expect this in UX — don't show "3 of 5 uploaded." |
| `useDeleteMany` batch delete | **Partial success allowed**. Returns `{ succeeded: [...], failed: [...] }`. UX should report per-file status — some may succeed while others fail (e.g., already-deleted). |
| `useUpdate` on single file metadata | Atomic single call — no batch semantics. |

When presenting upload UX: if any file fails, surface the error and let the user retry the whole batch. For delete UX: render a per-row status so partially-succeeded deletes don't look like a total failure.

## Storage gotchas

- **Uploading to an existing path** — upsert behavior: the object is replaced silently. Always warn users in UI.
- **Visibility mismatch** — per-object visibility overrides the bucket default. A `private` file in a `public` bucket stays private.
- **Batch upload limit** — max 10 files and 100MB per call. Exceeding returns a 400 with no partial success. Split larger sets.
- **Batch delete limit** — max 100 paths per call. Supports partial success.
- **Quota is advisory** — the API does not block uploads when exceeded. Surface as a warning, not a blocker.
- **`allowed_mime_types` rejects silently** — generic 400, no mention of MIME types. Check bucket config first.
- **Missing `app_category`** — bucket creation requires `app_category` (`assets` or `attachments`).
- **`dataProviderName: "storage"` is required** — forgetting it routes to the database provider.
- **Default to multi-file upload** — attachment flows should support multi-file selection by default, not single-file-at-a-time.

## Registration pattern

```typescript
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
    { name: "posts" },
    { name: "authors" },
    { name: "user-uploads" },   // consumed via storage
    { name: "users" },          // consumed via user
  ]}
/>
```

Hooks select providers via `dataProviderName`:

```typescript
useList({ resource: "posts" });                               // default
useList({ dataProviderName: "storage", resource: "user-uploads" });
useList({ dataProviderName: "app", resource: "roles" });
useList({ dataProviderName: "user", resource: "users" });
```

## Common error messages (and what they mean)

| Error | Cause | Fix |
|---|---|---|
| "Resource X not supported" | Called `getMany` on storage, or a non-whitelisted resource on app/user | Use supported operation; check provider's resource list |
| "meta.keys is required for secrets list" | Forgot `meta.keys` on `useList({ resource: "secrets" })` | Pass the key array |
| "meta.username is required" | User provider `roles`/`apps` without `meta.username` | Pass the username |
| "kind must be 'function' or 'analytics'" | App provider `useCustom` without `meta.kind` | Specify kind |
| "idColumnName required for bulk update" | `updateMany` on a non-"id" PK table without meta | Pass `meta.idColumnName` |
