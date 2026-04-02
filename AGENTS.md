# CLAUDE.md - AI Assistant Guide for Taruvi Refine Template

## Functional App Default

If the user asks to create or build an app, default to a functional MVP, not a mockup.

A functional MVP in this repo means:
- create Taruvi schema with MCP tools
- seed enough real data to use the app
- register Refine resources in `src/App.tsx`
- build real list/create/edit/show flows for core resources
- wire dashboards/pages to live data, not hardcoded arrays

If the user wants a UI-only prototype, they must explicitly say so.

## Taruvi Skill Requirement

When making dashboards or building anything that uses Taruvi, use the `taruvi-packages-usage` skill.

- This applies whenever the task mentions Taruvi, Refine + Taruvi, `@taruvi/sdk`, or `@taruvi/refine-providers`
- Use that skill's `REFERENCE.md` as the source of truth for Taruvi usage
- Do not answer Taruvi usage questions from memory or invent generic REST endpoints

## Mandatory Taruvi Preflight

For any task involving Taruvi, Refine + Taruvi, `@taruvi/sdk`, or `@taruvi/refine-providers`:

1. You MUST open and read `.codex/skills/taruvi-packages-usage/SKILL.md`
2. You MUST open and read `.codex/skills/taruvi-packages-usage/REFERENCE.md`
3. Before making edits, state in a commentary update that you read them
4. In the final response, cite the specific Taruvi reference section used

Do not implement from memory.
Do not treat prior knowledge as sufficient.
If these files are unavailable, stop and say so.

Every Taruvi-related change must include:
- a short note in `docs/` naming the Taruvi reference sections consulted
- at least one file/path citation to the reference in the final response

## Project Overview

This is a **Refine.dev v5** project - a React-based framework for building admin panels, dashboards, and internal tools.

**CRITICAL:** This project uses **Refine v5** which has significantly different hook syntax from v4. Always use the v5 patterns documented in the "[IMPORTANT: Refine v5 Syntax Changes](#important-refine-v5-syntax-changes)" section below.

IMPORTANT: Always use Context7 MCP Skill when I need library/API, Refine v5, MUI documentation without me having to explicitly ask.

**When confused or need clarification:** Use the Task tool with `subagent_type='Explore'` and set thoroughness to "medium" or "very thorough" to understand the codebase patterns before making changes.

## Pre-Work Checklist

### Before Starting Any Task:

1. **Create a Project Spec Document** - Run exploration, document resources/providers/auth flow, identify dependencies, map affected files
2. **Read Relevant Files** - Always use Read tool before editing, check existing patterns
3. **Plan with TodoWrite** - Break down complex tasks into steps, track progress

### Notification Rule

- Use the app's existing Refine notification integration via `useNotificationProvider` from `@refinedev/mui`
- Do not create custom notification systems, ad hoc snackbars, or alternate toast providers when implementing feedback
- When adding success/error feedback, wire it through the existing notification provider already configured in `/src/App.tsx`

## IMPORTANT : Data Providers

All providers are in `/src/providers/refineProviders.ts` (package: `@taruvi/refine-providers`) and registered in `/src/App.tsx`.

Read the taruvi-packages-usage skill for detailed usage patterns, supported operations, and examples to use the provider and their capabilities.

**Available Providers:**

| Provider | Name in App.tsx | Purpose |
|----------|-----------------|---------|
| `taruviDataProvider` | `default` | Database CRUD operations |
| `taruviStorageProvider` | `storage` | File upload/download/delete |
| `taruviFunctionsProvider` | `functions` | Execute serverless functions |
| `taruviAppProvider` | `app` | App-level data (roles) |
| `taruviUserProvider` | `user` | Current user data |
| `taruviAnalyticsProvider` | `analytics` | Execute saved SQL queries |
| `taruviAuthProvider` | N/A | Authentication (separate prop) |
| `taruviAccessControlProvider` | N/A | Cerbos permissions (optional, separate prop) |

**Supported Operations by Provider:**

| Hook | `default` | `storage` | `functions` | `app` | `user` | `analytics` |
|------|-----------|-----------|-------------|-------|--------|-------------|
| `useList` / `getList` | ✅ | ✅ | ❌ | ✅ (roles only) | ✅ (users only) | ❌ |
| `useOne` / `getOne` | ✅ | ✅ (returns URL) | ❌ | ✅ (settings only) | ✅ | ❌ |
| `useMany` / `getMany` | ✅ | ❌ (returns []) | ❌ | ❌ | ❌ | ❌ |
| `useCreate` / `create` | ✅ | ✅ (upload) | ✅ (execute) | ❌ | ✅ | ✅ (execute) |
| `useCreateMany` | ✅ | ✅ (batch upload) | ❌ | ❌ | ❌ | ❌ |
| `useUpdate` / `update` | ✅ | ✅ (metadata) | ❌ | ❌ | ✅ | ❌ |
| `useUpdateMany` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `useDelete` / `deleteOne` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `useDeleteMany` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `custom` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

**Key Notes:**
- `functions` and `analytics` providers only support `useCreate` to execute functions/queries
- `app` provider: `useList` works only with `resource: "roles"`, `useOne` works only with `resource: "settings"`
- `user` provider: `useList`/`useOne`/`useCreate`/`useUpdate`/`useDelete` work with `resource: "users"`
- `storage` provider: `useOne` returns the file URL (not file content)

**Registration in App.tsx:**
```typescript
import {
  taruviDataProvider, taruviAuthProvider, taruviStorageProvider,
  taruviFunctionsProvider, taruviAppProvider, taruviUserProvider,
  taruviAnalyticsProvider,
  // taruviAccessControlProvider, // Optional - uncomment to enable
} from "./providers/refineProviders";

<Refine
  dataProvider={{
    default: taruviDataProvider,
    storage: taruviStorageProvider,
    functions: taruviFunctionsProvider,
    app: taruviAppProvider,
    user: taruviUserProvider,
    analytics: taruviAnalyticsProvider,
  }}
  authProvider={taruviAuthProvider}
  // accessControlProvider={taruviAccessControlProvider} // Optional
/>
```

**Exported Types and Utilities:**

```typescript
import {
  // Types
  TaruviUser, TaruviMeta, TaruviListResponse, StorageUploadVariables,
  LoginParams, LogoutParams, RegisterParams, FunctionMeta, AnalyticsMeta,
  // Utility functions (for advanced usage)
  buildRefineQueryParams, convertRefineFilters, convertRefineSorters,
  convertRefinePagination, buildQueryString, REFINE_OPERATOR_MAP,
} from "./providers/refineProviders";
```

### 1. `taruviDataProvider` - Database CRUD Operations

**Usage in Resources:**
```typescript
resources={[
  {
    name: "blog_posts",        // Maps to database table
    list: "/blog-posts",
    create: "/blog-posts/create",
    edit: "/blog-posts/edit/:id",
    show: "/blog-posts/show/:id",
    meta: { canDelete: true },
  }
]}
```

**Common Hooks:**

```typescript
// List page
import { useDataGrid } from "@refinedev/mui";
const { dataGridProps } = useDataGrid({ resource: "blog_posts" });

// Create/Edit page
import { useForm } from "@refinedev/react-hook-form";
const { saveButtonProps, refineCore: { queryResult }, register, control, formState: { errors } } = useForm({
  resource: "blog_posts",
  action: "create", // or "edit"
});

// Show page (v5 syntax)
import { useShow, useOne } from "@refinedev/core";
const { result, query: { isLoading, isError } } = useShow({ resource: "blog_posts", id: "123" });
const record = result;  // Direct access, no need for .data
```

**Advanced Meta Options:**

```typescript
// Override table name
useList({ resource: "posts", meta: { tableName: "archived_posts" } });

// Override ID column name (default: "id")
useOne({ resource: "users", id: "abc123", meta: { idColumnName: "user_uuid" } });

// Select specific fields only
useList({ resource: "blog_posts", meta: { select: ["id", "title", "created_at"] } }); // or "id,title,created_at"

// Populate foreign key relationships
useShow({ resource: "blog_posts", id: 1, meta: { populate: ["category_id", "author_id"] } }); // or "category_id,author_id"

// Combine multiple meta options
useList({ resource: "products", meta: { tableName: "active_products", select: ["id", "name", "price"], populate: "category_id,supplier_id" } });

// Aggregation and grouping
useList({
  resource: "orders",
  meta: {
    aggregate: ["sum(total)", "count(*)", "avg(total)"],
    groupBy: ["region", "status"],
    having: [{ field: "sum(total)", operator: "gt", value: 1000 }],
  },
});
```

**Aggregation & Analytics:**

```typescript
// Sales report with totals and averages
const { result, query: { isLoading } } = useList({
  resource: "orders",
  meta: { aggregate: ["sum(total)", "avg(total)", "count(*)"], groupBy: ["status"] },
});
```

**Supported Aggregate Functions:**
`sum(field)`, `avg(field)`, `count(*)` / `count(field)`, `min(field)`, `max(field)`, `array_agg(field)`, `string_agg(field, delimiter)`, `json_agg(field)`, `stddev(field)`, `variance(field)`

**GROUP BY + HAVING Example:**

```typescript
// Find categories with >10 products and avg price > $50
const { result } = useList({
  resource: "products",
  meta: {
    aggregate: ["count(*)", "avg(price)"],
    groupBy: ["category"],
    having: [
      { field: "count(*)", operator: "gt", value: 10 },
      { field: "avg(price)", operator: "gte", value: 50 },
    ],
  },
});
```

**Complete Analytics Example (filters + aggregates + grouping + having):**

```typescript
const { result, query: { isLoading } } = useList({
  resource: "orders",
  filters: [
    { field: "status", operator: "in", value: ["completed", "shipped"] },
    { field: "created_at", operator: "gte", value: "2024-01-01" },
  ],
  meta: {
    aggregate: ["sum(total) as revenue", "count(*) as order_count", "avg(total) as avg_order_value"],
    groupBy: ["region", "status"],
    having: [{ field: "sum(total)", operator: "gt", value: 1000 }],
  },
});
// Access: result.data.forEach(row => console.log(`${row.region}: ${row.revenue}`));
```

**Filter Operators Reference:**

| Operator | Description | Query Parameter |
|----------|-------------|-----------------|
| `eq` | Equals | `status=active` |
| `ne` | Not equals | `status__ne=deleted` |
| `lt` / `gt` | Less/greater than | `age__lt=18` / `age__gt=21` |
| `lte` / `gte` | Less/greater than or equal | `price__lte=100` / `price__gte=10` |
| `contains` | Contains (case-sensitive) | `name__contains=phone` |
| `ncontains` | Does not contain (case-sensitive) | `name__ncontains=test` |
| `containss` | Contains (case-insensitive) | `name__icontains=PHONE` |
| `startswith` / `startswiths` | Starts with (sensitive/insensitive) | `email__startswith=admin` / `email__istartswith=ADMIN` |
| `endswith` / `endswiths` | Ends with (sensitive/insensitive) | `email__endswith=.com` / `email__iendswith=.COM` |
| `in` / `nin` | Value in/not in array | `status__in=active,pending` / `status__nin=deleted,banned` |
| `null` / `nnull` | Is NULL / Is NOT NULL | `deleted_at__null=true` / `verified_at__nnull=true` |
| `between` / `nbetween` | Value between/not between range | `price__between=10,100` |

**Filter Example (combining operators):**

```typescript
useList({
  resource: "products",
  filters: [
    { field: "status", operator: "eq", value: "active" },
    { field: "price", operator: "between", value: [10, 100] },
    { field: "name", operator: "containss", value: "phone" },       // case-insensitive
    { field: "category", operator: "in", value: ["electronics", "gadgets"] },
    { field: "deleted_at", operator: "null", value: true },
    { field: "email", operator: "startswiths", value: "admin" },    // case-insensitive
    { field: "total", operator: "gte", value: 100 },
    { field: "created_at", operator: "between", value: ["2024-01-01", "2024-12-31"] },
  ],
});
```

**DataTable Schema Management:**
- `mcp__taruvi__create_update_schema` - define tables
- `mcp__taruvi__query_datatable_data` - advanced filtering
- `mcp__taruvi__upsert_datatable_data` - bulk operations

### 2. `taruviStorageProvider` - File Storage Operations

**Usage Pattern (v5 syntax):**
```typescript
import { useCreate } from "@refinedev/core";

const { mutate: uploadFile, mutation } = useCreate();

// Upload single file
const handleUpload = (file: File) => {
  uploadFile({
    resource: "my-bucket",  // Bucket name (can override with meta.bucketName)
    values: {
      files: [file],                       // Array of File objects
      paths: ["folder/file.pdf"],          // Optional: custom paths (defaults to file.name)
      metadatas: [{ userId: 123 }],        // Optional: metadata for each file
    },
    dataProviderName: "storage",
  });
};

// Upload multiple files
uploadFile({
  resource: "my-bucket",
  values: {
    files: files,
    paths: files.map(f => `uploads/${f.name}`),
    metadatas: files.map(() => ({ uploadedAt: new Date() })),
  },
  dataProviderName: "storage",
});

// Status: mutation.isPending, mutation.isError
```

**Important:** Expects `{ files: File[], paths?: string[], metadatas?: Record<string, unknown>[] }` - NOT FormData!

**Meta override:** `meta: { bucketName: "private-uploads" }` to use a different bucket than the resource name.

**Supported Operations:** `getList` (list files), `getOne` (download URL), `create` (upload), `update` (metadata), `deleteOne`, `deleteMany`, `custom`. Note: `getMany`/`updateMany` not applicable.

**MCP Tools for Storage:**
- `mcp__taruvi__list_buckets` / `mcp__taruvi__create_bucket` / `mcp__taruvi__list_objects` / `mcp__taruvi__get_bucket_quota`

### 3. `taruviAuthProvider` - Authentication

**Methods:** `login`, `logout`, `check` (verify + auto token refresh), `register`, `getIdentity` (→ TaruviUser), `getPermissions`, `onError` (auto refresh on 401)

**Login Parameters:**
```typescript
interface LoginParams {
  callbackUrl?: string;    // URL to redirect after login (default: "/")
  username?: string;       // For credentials flow
  password?: string;
  redirect?: boolean;      // Use redirect flow (default: true)
}
```

**Usage:**

```typescript
// Redirect-based login (default)
import { useLogin } from "@refinedev/core";
const { mutate: login } = useLogin();
login({ callbackUrl: window.location.origin + "/dashboard", redirect: true });

// Credentials-based login
login({ username, password, redirect: false });
```

```typescript
// Get current user identity
import { useGetIdentity } from "@refinedev/core";
import type { TaruviUser } from "../providers/refineProviders";
const { data: user } = useGetIdentity<TaruviUser>();

// TaruviUser interface
interface TaruviUser {
  id: number; username: string; email: string;
  first_name: string; last_name: string; full_name: string;
  is_active: boolean; is_staff: boolean; is_superuser: boolean; is_deleted: boolean;
  date_joined: string; last_login: string; // ISO 8601
  groups: UserGroup[]; user_permissions: UserPermission[];
  attributes: Record<string, unknown>; missing_attributes: string[];
  roles: UserRole[];
}
interface UserGroup { id: number; name: string; }
interface UserPermission { id: number; name: string; codename: string; content_type: string; }
interface UserRole { name: string; slug: string; type: "app_role"; app_slug: string; source: "direct" | "site_role" | "inherited"; }
```

```typescript
// Get user permissions
import { usePermissions } from "@refinedev/core";
const { data: permissions } = usePermissions();
// Returns: { roles: UserRole[], user_permissions: UserPermission[], groups: UserGroup[], is_staff, is_superuser }

// Protected routes
import { Authenticated } from "@refinedev/core";
<Authenticated fallback={<LoginRedirect />} loading={<LoadingScreen />}>
  <YourProtectedComponent />
</Authenticated>
```

**Auth Flow:**
1. Login → redirected to OAuth/SSO → callback sets tokens (access + refresh)
2. `check()` validates token on protected routes (auto-refreshes if expired)
3. `getIdentity()` fetches user profile from JWT token
4. `onError()` handles 401 errors with automatic token refresh

### 4. `taruviAccessControlProvider` - Resource-Based Authorization (Optional)

Provides resource-based authorization using Cerbos policies. Uses DataLoader for request batching (multiple `useCan` calls → single API request).

**To Enable:** Uncomment in `App.tsx`:
```typescript
import { taruviAccessControlProvider } from "./providers/refineProviders";
<Refine accessControlProvider={taruviAccessControlProvider} />
```

**Custom batch delay** (default 10ms):
```typescript
export const taruviAccessControlProvider = accessControlProvider(taruviClient, { batchDelayMs: 50 });
```

**Usage:**
```typescript
import { useCan, CanAccess } from "@refinedev/core";

// Hook
const { data: canEdit } = useCan({ resource: "blog_posts", action: "edit", params: { id: 123 } });
if (canEdit?.can) { /* Show edit button */ }

// Component
<CanAccess resource="blog_posts" action="delete" params={{ id: post.id }}
  fallback={<div>No permission</div>}>
  <DeleteButton />
</CanAccess>
```

**How it Works:** Builds principal from JWT → checks Cerbos policies → returns `{ can: boolean, reason?: string }`

**Principal Structure:**
```typescript
{ id: string, roles: string[], attr: { username, email, first_name, last_name, is_staff, is_superuser, groups: string[] } }
```

**Resource Structure:**
```typescript
{ tableName: string, recordId: string, attributes: object, actions: string[] }
```

Requires Cerbos policies configured in your Taruvi backend.

### 5. `taruviFunctionsProvider` - Serverless Functions

**Via Refine Hooks:**
```typescript
import { useCreate } from "@refinedev/core";
const { mutate: executeFunction, mutation } = useCreate();
executeFunction({
  resource: "my-function-slug",
  values: { param1: "value1", param2: 123 },
  dataProviderName: "functions",
  meta: { async: false },  // true for background execution
});
// Status: mutation.isPending, mutation.isSuccess → mutation.data
```

**Helper Functions (Recommended)** - `/src/utils/functionHelpers.ts`:
```typescript
import { executeFunction, executeFunctionAsync } from "../../utils/functionHelpers";

const result = await executeFunction("calculate-total", { items: [1, 2, 3] });  // sync
executeFunctionAsync("send-notification", { message: "Hello" }).catch(console.error);  // fire-and-forget
```

### 6. `taruviAppProvider` - App-Level Data

```typescript
const { result, query: { isLoading } } = useList({ resource: "roles", dataProviderName: "app" });
```

### 7. `taruviUserProvider` - Current User Data

```typescript
const { result: currentUser } = useOne({ resource: "me", id: "", dataProviderName: "user" });
const { result: userRoles } = useList({ resource: "roles", dataProviderName: "user" });
```

### 8. `taruviAnalyticsProvider` - Saved SQL Queries

```typescript
const { mutate: executeQuery, mutation } = useCreate();
executeQuery({
  resource: "monthly-sales-report",  // Query slug
  values: { start_date: "2024-01-01", end_date: "2024-12-31" },
  dataProviderName: "analytics",
});
// Results: mutation.data

// Creating Queries (via MCP):
await mcp__taruvi__create_query({
  name: "Monthly Sales Report",
  query_text: `SELECT DATE_TRUNC('month', created_at) as month, SUM(total) as revenue
    FROM orders WHERE created_at BETWEEN :start_date AND :end_date
    GROUP BY month ORDER BY month DESC`,
  secret_key: "postgres-analytics",
});
```

## Refine.dev Patterns

### Resource Structure

```
/src/pages/{resource}/
├── list.tsx     - Table view with pagination, sorting, filters
├── create.tsx   - Form to create new records
├── edit.tsx     - Form to update existing records
├── show.tsx     - Read-only detail view
└── index.ts     - Barrel export
```

**Resource Registration:**
```typescript
resources={[{
  name: "categories",           // Database table name
  list: "/categories",
  create: "/categories/create",
  edit: "/categories/edit/:id",
  show: "/categories/show/:id",
  meta: { canDelete: true, label: "Categories", icon: <CategoryIcon /> },
}]}
```

### Common Refine Hooks (v5 Syntax)

| Hook | Purpose | v5 Returns |
|------|---------|---------|
| `useDataGrid` | List view with MUI DataGrid | `dataGridProps`, `tableQuery`, `result` |
| `useForm` | Form handling (create/edit) | `saveButtonProps`, `register`, `control`, `refineCore` |
| `useShow` | Fetch single record for display | `result`, `query: { isLoading, isError }` |
| `useOne` | Fetch related single record | `result`, `query: { isLoading, isError }` |
| `useMany` | Fetch multiple related records | `result`, `query: { isLoading, isError }` |
| `useList` | Fetch list of records | `result`, `query: { isLoading, isError }` |
| `useCreate` | Create mutation | `mutate`, `mutation: { isPending, isError }` |
| `useUpdate` | Update mutation | `mutate`, `mutation: { isPending, isError }` |
| `useDelete` | Delete mutation | `mutate`, `mutation: { isPending, isError }` |
| `useGetIdentity` | Current user info | `data` (user object), `isLoading` |
| `useLogin` / `useLogout` | Auth mutations | `mutate`, `isLoading` |
| `useGo` | Navigation (replaces useNavigation) | `go` function |

### Relationship Handling

**One-to-Many (edit form with autocomplete):**
```typescript
<Controller control={control} name="category_id"
  render={({ field }) => (
    <Autocomplete {...autocompleteProps} {...field}
      onChange={(_, value) => field.onChange(value?.id)}
      getOptionLabel={(item) => item.title}
      renderInput={(params) => (
        <TextField {...params} label="Category" error={!!(errors as any)?.category_id} />
      )}
    />
  )}
/>
```

**Fetching Related Data (v5):**
```typescript
const { result: blogPost, query: { isLoading } } = useShow({ resource: "blog_posts" });
const { result: category, query: { isLoading: categoryLoading } } = useOne({
  resource: "categories",
  id: blogPost?.category_id,
  queryOptions: { enabled: !!blogPost?.category_id },
});
// blogPost and category are direct objects, no need for .data
```

## IMPORTANT: Refine v5 Syntax Changes

**This project uses Refine v5** - Hook syntax has changed significantly from v4.

### Critical Hook Return Value Changes

#### Data Hooks (useList, useOne, useMany, useShow, useInfiniteList)

```typescript
// ❌ WRONG (v4)
const { data, isLoading, isError } = useList({ resource: "posts" });
const posts = data.data;

// ✅ CORRECT (v5)
const { result, query: { isLoading, isError } } = useList({ resource: "posts" });
const posts = result.data;
```

**useOne/useMany/useShow - Simplified result:**
```typescript
// ❌ v4: const { data } = useOne(...); const user = data.data;
// ✅ v5:
const { result, query: { isLoading } } = useOne({ resource: "users", id: 1 });
const user = result;  // No need for .data
```

**useInfiniteList:**
```typescript
// ✅ v5:
const { result, query: { fetchNextPage, isLoading } } = useInfiniteList();
const posts = result.data;
```

#### Mutation Hooks (useCreate, useUpdate, useDelete, useUpdateMany, useDeleteMany)

```typescript
// ❌ v4: const { isPending, isError, mutate } = useUpdate();
// ✅ v5:
const { mutation: { isPending, isError }, mutate } = useUpdate();
// Or: const { mutate, mutation } = useUpdate(); if (mutation.isPending) { ... }
```

#### Table Hooks (useDataGrid, useTable, useSimpleList)

```typescript
// ❌ v4: const { tableQueryResult, setCurrent, current } = useDataGrid();
// ✅ v5: const { tableQuery, setCurrentPage, currentPage } = useDataGrid();

const { dataGridProps, tableQuery, result } = useDataGrid({ resource: "blog_posts" });
```

### Parameter Name Changes & v4→v5 Migration

| ❌ Old (v4) | ✅ New (v5) | Example |
|------------|------------|---------|
| `metaData` | `meta` | `useList({ meta: { foo: "bar" } })` |
| `sorter` or `sort` | `sorters` | `useList({ sorters: [{ field: "id", order: "desc" }] })` |
| `hasPagination: false` | `pagination: { mode: "off" }` | `useList({ pagination: { mode: "off" } })` |
| `initialCurrent` | `pagination: { currentPage: 1 }` | `useTable({ pagination: { currentPage: 1 } })` |
| `initialPageSize` | `pagination: { pageSize: 20 }` | `useTable({ pagination: { pageSize: 20 } })` |
| `resourceName` | `resource` | `useImport({ resource: "posts" })` |
| `isLoading` (mutations) | `isPending` | `mutation.isPending` |
| `useResource("posts")` | `useResourceParams({ resource: "posts" })` | Resource introspection |
| `ignoreAccessControlProvider` | `accessControl={{ enabled: false }}` | `<CreateButton accessControl={{ enabled: false }} />` |
| `options: { label: "..." }` | `meta: { label: "..." }` | Resource config in `<Refine>` |
| `type AuthBindings` | `type AuthProvider` | `import { type AuthProvider } from "@refinedev/core"` |
| `type RouterBindings` | `type RouterProvider` | `import { type RouterProvider } from "@refinedev/core"` |

### Filter Configuration Changes

```typescript
// ❌ v4: useList({ config: { filters: [...] } });
// ✅ v5 - Direct:
useList({ filters: [{ field: "status", operator: "eq", value: "active" }] });
// ✅ v5 - Structured (for tables):
useTable({
  filters: {
    initial: [{ field: "status", operator: "eq", value: "draft" }],
    permanent: [{ field: "deleted", operator: "eq", value: false }],
    defaultBehavior: "replace",  // or "merge"
  }
});
```

### Pagination Configuration

```typescript
// ❌ v4: useList({ hasPagination: false });
// ✅ v5: useList({ pagination: { mode: "off" } });
// Modes: "off", "server" (default), "client"
useList({ pagination: { mode: "server", currentPage: 1, pageSize: 20 } });
```

### Navigation Changes

```typescript
// ❌ v4: const { push, goBack } = useNavigation();
// ✅ v5:
import { useGo } from "@refinedev/core";
import { useNavigate } from "react-router-dom";
const go = useGo();
go({ to: "/tasks/new", type: "push" });  // or "replace"
const navigate = useNavigate();
navigate(-1);  // Go back
```

### Resource Introspection Changes

```typescript
// ❌ WRONG (v4)
import { useResource } from "@refinedev/core";
useResource("posts");

// ✅ CORRECT (v5)
import { useResourceParams } from "@refinedev/core";
useResourceParams({ resource: "posts" });
```

### Access Control Props

```typescript
// ❌ WRONG (v4)
<CreateButton ignoreAccessControlProvider />

// ✅ CORRECT (v5)
<CreateButton accessControl={{ enabled: false }} />
```

### Resource Configuration

```typescript
// ❌ WRONG (v4)
<Refine
  resources={[{
    name: "posts",
    options: { label: "Blog Posts" }
  }]}
/>

// ✅ CORRECT (v5)
<Refine
  resources={[{
    name: "posts",
    meta: { label: "Blog Posts", canDelete: true, icon: <PostIcon /> }
  }]}
/>
```

### Type Import Changes

```typescript
// ❌ WRONG (v4)
import { type AuthBindings, type RouterBindings } from "@refinedev/core";

// ✅ CORRECT (v5)
import { type AuthProvider, type RouterProvider } from "@refinedev/core";
```

### Complete v5 Hook Examples

**List Page with useDataGrid:**
```typescript
import { useDataGrid } from "@refinedev/mui";

export const BlogPostList = () => {
  const { dataGridProps, tableQuery } = useDataGrid({
    resource: "blog_posts",
    pagination: { mode: "server", pageSize: 10 },
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
    filters: { permanent: [{ field: "deleted", operator: "eq", value: false }] },
  });

  if (tableQuery.isLoading) return <Loading />;
  if (tableQuery.isError) return <Error />;

  return <DataGrid {...dataGridProps} />;
};
```

**Show Page with useShow + useOne:**
```typescript
import { useShow, useOne } from "@refinedev/core";

export const BlogPostShow = () => {
  const { result, query: { isLoading } } = useShow({ resource: "blog_posts" });
  const post = result;

  const { result: category, query: { isLoading: categoryLoading } } = useOne({
    resource: "categories",
    id: post?.category_id,
    queryOptions: { enabled: !!post?.category_id },
  });

  if (isLoading || categoryLoading) return <Loading />;

  return (
    <Show>
      <TextField label="Title" value={post?.title} />
      <TextField label="Category" value={category?.title} />
    </Show>
  );
};
```

**Create/Update with Mutations:**
```typescript
import { useCreate, useUpdate } from "@refinedev/core";

export const BlogPostForm = ({ id }: { id?: string }) => {
  const { mutate: createPost, mutation: createMutation } = useCreate();
  const { mutate: updatePost, mutation: updateMutation } = useUpdate();

  const handleSubmit = (values: any) => {
    if (id) {
      updatePost({ resource: "blog_posts", id, values, meta: { foo: "bar" } });
    } else {
      createPost({ resource: "blog_posts", values });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={isLoading}>{isLoading ? "Saving..." : "Save"}</button>
    </form>
  );
};
```

### Migration Helper

1. `metaData` → `meta`
2. `sorter` → `sorters`
3. `hasPagination: false` → `pagination: { mode: "off" }`
4. `{ data, isLoading }` → `{ result, query: { isLoading } }`
5. `{ isPending }` → `{ mutation: { isPending } }`
6. `useNavigation` → `useGo` + `useNavigate`
7. `useResource` → `useResourceParams`

**Automated migration:** `npx @refinedev/codemod@latest refine4-to-refine5`

## Environment Configuration

```env
# .env.local
TARUVI_SITE_URL=http://tenant1.127.0.0.1.nip.io:8000
TARUVI_API_KEY=secret
TARUVI_APP_SLUG=sample-app
```

```typescript
// src/taruviClient.ts
import { Client } from "@taruvi/sdk";
export const taruviClient = new Client({
  apiUrl: __TARUVI_SITE_URL__,
  apiKey: __TARUVI_API_KEY__,
  appSlug: __TARUVI_APP_SLUG__,
});
// Used by all providers. Direct SDK: taruviClient.httpClient.get("api/...");
```

## MCP Tools Reference

| Category | Tools |
|----------|-------|
| **Schema** | `create_update_schema`, `get_datatable_schema`, `list_datatables` |
| **Data** | `query_datatable_data`, `upsert_datatable_data`, `delete_datatable_data` |
| **Analytics** | `list_queries`, `get_query`, `create_query`, `execute_query` |
| **Functions** | `list_functions`, `create_update_function`, `execute_function` |
| **Storage** | `list_buckets`, `create_bucket`, `list_objects` |
| **Secrets** | `list_secrets`, `create_secret`, `get_secret` |

All prefixed with `mcp__taruvi__`.

## Common Development Workflows

### 1. Adding a New Resource

1. Create database schema using MCP tools
2. Create resource pages (list, create, edit, show) - copy from existing resource
3. Register resource in App.tsx
4. Add navigation menu item (if needed)
5. Test CRUD operations

```typescript
await mcp__taruvi__create_update_schema({
  datapackage: {
    resources: [{
      name: "products",
      schema: {
        fields: [
          { name: "id", type: "integer", constraints: { required: true } },
          { name: "name", type: "string", constraints: { required: true } },
          { name: "price", type: "number" },
        ],
        primaryKey: "id",
      }
    }]
  }
});
```

### 2. Adding File Uploads to Resource (Path-Based Pattern)

Files stored in Taruvi storage buckets, database stores file paths (not URLs), URLs generated on-demand via helpers.

**Checklist:**
1. Create storage bucket(s) via MCP tool
2. Add path field(s) to resource schema (string type)
3. Import storage helpers from `/src/utils/storageHelpers.ts`
4. Call `uploadFile()` in create form
5. Call `uploadFileWithCleanup()` in edit form (auto-deletes old file)
6. Use `getStorageUrl()` to display files
7. Test upload, edit, delete flows

**Step 1: Create Bucket**
```typescript
await mcp__taruvi__create_bucket({ name: "resource-images", visibility: "public" });
// Naming convention: {resource}-{file-type} (lowercase, hyphens)
```

**Step 2: Add Path Fields**
```typescript
await mcp__taruvi__create_update_schema({
  datapackage: { resources: [{ name: "your_resource", schema: { fields: [{ name: "image_path", type: "string" }] } }] }
});
// Why paths? Environment-independent, portable, compact
```

**Step 3: Create Form - Upload File**
```typescript
import { useState } from "react";
import { uploadFile, getStorageUrl } from "../../utils/storageHelpers";

const [imagePath, setImagePath] = useState<string>("");
const [uploading, setUploading] = useState(false);

const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setUploading(true);
  try {
    const path = await uploadFile("resource-images", file, { prefix: "image" });
    setImagePath(path);
    setValue("image_path", path);
  } catch (error) { console.error("Upload failed:", error); }
  finally { setUploading(false); }
};

const imageUrl = getStorageUrl("resource-images", imagePath || watch("image_path"));
// JSX: <input type="file" onChange={handleFileChange} disabled={uploading} />
// <input type="hidden" {...register("image_path")} />
// {imageUrl && <img src={imageUrl} alt="Preview" />}
```

**Step 4: Edit Form** - Use `uploadFileWithCleanup()` instead:
```typescript
import { uploadFileWithCleanup, getStorageUrl } from "../../utils/storageHelpers";
const oldPath = queryResult?.result?.image_path;
const path = await uploadFileWithCleanup("resource-images", file, oldPath, { prefix: "image" });
```

**Step 5: Display Files**
```typescript
import { getStorageUrl } from "../../utils/storageHelpers";
const imageUrl = getStorageUrl("resource-images", record?.image_path);
<img src={imageUrl} alt={record.title} />
```

**Available Helpers:** `uploadFile(bucket, file, options)`, `uploadFileWithCleanup(bucket, file, oldPath, options)`, `deleteFile(bucket, path)`, `getStorageUrl(bucket, path)`, `generateFilePath(file, prefix)`

**Testing:** Create: upload → path in DB, preview displays, form submits. Edit: upload → old file deleted, new path in DB.

**Common Pitfalls:** Store paths not URLs (`setValue("image_path", path)` not `"image_url", url`). Use `uploadFileWithCleanup()` instead of manual delete+upload.

See `/src/utils/storageHelpers.ts` for complete implementation.

### 3. Adding Filtering to List Page

```typescript
// Basic filtering
const { dataGridProps } = useDataGrid({
  resource: "blog_posts",
  filters: { permanent: [{ field: "status", operator: "eq", value: "published" }] },
  sorters: { initial: [{ field: "created_at", order: "desc" }] },
});

// Advanced: combining filters with aggregation
const { dataGridProps } = useDataGrid({
  resource: "sales",
  filters: {
    permanent: [{ field: "status", operator: "nin", value: ["cancelled", "refunded"] }],
    initial: [{ field: "created_at", operator: "gte", value: "2024-01-01" }],
  },
  meta: {
    aggregate: ["sum(amount) as total_sales", "count(*) as num_sales"],
    groupBy: ["product_id", "region"],
    having: [{ field: "sum(amount)", operator: "gt", value: 5000 }],
  },
});
```

### 4. Creating Custom Analytics Query

```typescript
await mcp__taruvi__create_query({
  name: "Monthly Blog Stats",
  query_text: `SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as post_count,
    COUNT(DISTINCT author_id) as author_count FROM blog_posts
    WHERE created_at >= NOW() - INTERVAL '6 months' GROUP BY month ORDER BY month DESC`,
  secret_key: "postgres-analytics",
  description: "Blog post statistics by month",
});
const results = await mcp__taruvi__execute_query({ query_slug: "monthly-blog-stats" });
```

### 5. Calling Serverless Functions

Utility functions in `/src/utils/functionHelpers.ts` handle auth, URL construction, and errors automatically.

```typescript
import { executeFunction, executeFunctionAsync } from "../../utils/functionHelpers";

// Sync - wait for result
const result = await executeFunction("calculate-total", { items: [1, 2, 3] });

// Async background execution
const taskInfo = await executeFunction("process-data", { dataset: "large.csv" }, { async: true });

// Fire-and-forget (notifications, logging)
executeFunctionAsync("send-notification", { message: "Done", userId: 123 }).catch(console.error);

// In form submit - fire-and-forget notification
const onSubmitHandler = async (data: any) => {
  const result = await onFinish(data);
  if (result?.data) {
    executeFunctionAsync("send-mattermost-notification", { action: "created", ticket: result.data }).catch(console.error);
  }
};
```

**Key Points:** Use `executeFunctionAsync` for fire-and-forget. Always `.catch()` for logging. Function slugs use kebab-case.

**Creating Functions (via MCP):**
```typescript
await mcp__taruvi__create_update_function({
  name: "Send Notification", execution_mode: "app", slug: "send-notification",
  code: `def main(params, user_data, sdk_client):\n    return {"success": True}`,
  async_mode: true,
});
```

### 6. Building Analytics Dashboard with Aggregation

**Steps:** Define schema → implement page with aggregation queries → add filters → display with charts/tables.

**Query Patterns:**
```typescript
// Revenue by region
const { result: regionStats, query: { isLoading } } = useList({
  resource: "sales_transactions",
  filters: [
    { field: "status", operator: "in", value: ["completed", "shipped"] },
    { field: "created_at", operator: "between", value: [dateRange.start, dateRange.end] },
  ],
  meta: {
    aggregate: ["sum(amount) as total_revenue", "count(*) as transaction_count", "avg(amount) as avg_transaction"],
    groupBy: ["region"],
    having: [{ field: "sum(amount)", operator: "gt", value: 1000 }],
  },
});

// Time-based aggregation (SQL functions in groupBy)
meta: { groupBy: ["DATE_TRUNC('month', created_at)"], aggregate: ["sum(amount)", "count(*)"] }

// Multiple aggregates
meta: { aggregate: ["sum(amount) as total", "avg(amount) as average", "min(amount)", "max(amount)", "count(*)"] }

// Ranking with HAVING
meta: { aggregate: ["sum(revenue) as total"], groupBy: ["salesperson_id"],
  having: [{ field: "sum(revenue)", operator: "gte", value: 10000 }] }
```

**Performance Tips:** Index frequently grouped/filtered columns. Use `select` meta to limit fields. Paginate large results. Use permanent filters to exclude soft-deleted records.

## Troubleshooting Guide

### Provider Not Working
- Check `.env.local` has all required variables
- Verify `taruviClient` is initialized in `/src/taruviClient.ts`
- Confirm providers are exported from `/src/providers/refineProviders.ts`
- Check network tab for API errors

### Resource Not Appearing
- Verify table exists using `mcp__taruvi__list_datatables`
- Check resource name matches database table name exactly
- Ensure resource is registered in `App.tsx` resources array
- Check meta.canDelete is set if delete operations needed

### Foreign Key Errors
- Ensure referenced table exists first
- Use correct field type (integer for IDs)
- Verify reference syntax: `{ resource: "table_name", fields: "id" }`
- Check if you need to reference system tables (auth_user, storage_objects)

### Authentication Issues
- Check if token is stored properly (localStorage/cookies)
- Verify `authProvider.check()` is working
- Test redirect flow with network tab open
- Ensure callback URL is whitelisted

## Best Practices

- **Code Organization:** One resource per directory in `/src/pages/`, barrel exports, follow existing patterns, reusable components in `/src/components/`
- **Data Modeling:** Always define primary key, use foreign keys, add indexes for frequent queries, appropriate field types
- **Form Validation:** react-hook-form validation, schema constraints, clear error messages, validate client + server
- **Performance:** `queryOptions.enabled` to prevent unnecessary fetches, pagination for large datasets, indexes on filtered/sorted columns, `useMany` over multiple `useOne`
- **Security:** Never expose API keys in frontend, use env variables, validate permissions on backend, sanitize inputs

## When to Use Each Tool

- **Explore Agent** (`subagent_type='Explore'`): Understanding project structure, finding implementations, before architectural changes
- **Direct File Operations** (Read/Edit/Write): Known file locations, simple modifications, quick bug fixes
- **MCP Tools:** Schema management, analytics queries, storage buckets, serverless functions, raw SQL

## Project-Specific Notes

### Navkit Integration
- Global navigation bar is 60px height
- Custom Sider component accounts for this offset
- Styles in `/src/components/sider/index.tsx`

### Theme System
- ColorModeContext provides light/dark mode (BlueDark/Blue themes)
- Toggle in header component, preference in localStorage

### Homepage / Dashboard

**Current State:** Simple "Hello" page at `/src/pages/home/index.tsx`, set as index route.

**When building a new app:** Replace homepage with an analytics dashboard showing key metrics.

**Steps:**
1. **Analyze Problem Statement** - Identify key metrics, primary entities, time-based trends
2. **Design Layout** - MUI Grid, metric cards, charts (Recharts/Chart.js/MUI X Charts), date range filters
3. **Implement with Aggregation Queries:**
   ```typescript
   import { useList } from "@refinedev/core";
   import { Grid, Card, CardContent, Typography } from "@mui/material";

   export const Dashboard = () => {
     const { result: revenueStats } = useList({
       resource: "orders",
       filters: [{ field: "status", operator: "eq", value: "completed" }],
       meta: { aggregate: ["sum(total) as revenue", "count(*) as order_count"] },
     });
     const { result: monthlyRevenue } = useList({
       resource: "orders",
       meta: { aggregate: ["sum(total) as revenue"], groupBy: ["DATE_TRUNC('month', created_at)"] },
     });
     return (
       <Grid container spacing={3}>
         <Grid item xs={12} md={6} lg={3}>
           <Card><CardContent>
             <Typography variant="h6">Total Revenue</Typography>
             <Typography variant="h3">${revenueStats?.data[0]?.revenue || 0}</Typography>
           </CardContent></Card>
         </Grid>
       </Grid>
     );
   };
   ```
4. **Update App.tsx:** `import { Dashboard } from "./pages/dashboard";` → `<Route index element={<Dashboard />} />`
5. **Optional sidebar:** `resources={[{ name: "dashboard", list: "/", meta: { label: "Dashboard", icon: <DashboardIcon /> } }]}`

**Dashboard Best Practices:** Aggregate queries for metrics, loading states, empty states, actionable quick links, trend charts, responsive design, date range filters, cache expensive queries.

**Example Metrics by Domain:**
- **E-commerce:** revenue, orders today, top products, conversion rate, abandoned carts
- **CRM:** active deals, new leads, pipeline value, tasks due, recent activities
- **Project Management:** active projects, tasks completed, overdue items, team utilization
- **Content Management:** published posts, pending reviews, page views, popular content
- **Inventory:** low stock alerts, total items, recent orders, top-selling products

### Provider Fork Development
- See `PROVIDER_FORK_GUIDE.md` for local provider development
- Use `npm link` to test local provider changes
- Fork location: `../taruvi-refine-providers`

## Quick Reference

**File Paths:** App: `/src/App.tsx` | Providers: `/src/providers/refineProviders.ts` | Client: `/src/taruviClient.ts` | Pages: `/src/pages/{resource}/` | Components: `/src/components/` | Env: `/.env.local`

**Key Commands:**
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run refine       # Run Refine CLI
```

**IMPORTANT - Development Server:**
- **DO NOT run `npm run dev` or `npm run build`** - The development server is already running
- Changes auto-trigger hot reload. Check browser at http://localhost:5173
- Only run build commands if explicitly requested

**Documentation:** [Refine](https://refine.dev/docs) | [MUI DataGrid](https://mui.com/x/react-data-grid/) | [React Hook Form](https://react-hook-form.com/)

## Remember

1. **Always use Refine v5 syntax** - Check the v5 syntax section
2. **Always read files before editing** - Use Read tool
3. **Follow existing patterns** - Check similar components
4. **Use TodoWrite for complex tasks** - Track progress
5. **Explore when confused** - Use Task tool with Explore agent
6. **Create spec doc before starting** - Understand context
7. **Test incrementally** - Don't make many changes at once
8. **Validate schemas** - Use MCP tools to check table structure
9. **Keep it simple** - Don't over-engineer
10. **Use `meta` not `metaData`** - v5 renamed this
11. **Use `result` and `query` destructuring** - v5 grouped return values
12. **Leverage advanced query features** - aggregate, groupBy, having for analytics
13. **Know your filter operators** - 20+ operators (eq, in, between, containss, etc.)
14. **Storage provider uses `bucketName`** - Not `bucket` in meta
15. **Use `dataProviderName`** - Specify which provider (storage, functions, app, user, analytics)
16. **All 8 providers are configured** - See `/src/providers/refineProviders.ts`
17. **Import types from refineProviders** - `import type { TaruviUser, TaruviMeta } from "./providers/refineProviders"`

This is a **Refine.dev v5 project** - leverage the framework's hooks and patterns rather than reinventing CRUD operations.

## Active Technologies
- TypeScript 5.8.3 / React 19.1.0
- MUI v7.3.7 (Material UI) - uses new Grid `size` prop syntax
- PostgreSQL (via Taruvi backend) - schema managed through MCP tools
- @taruvi/sdk and @taruvi/refine-providers for backend integration

## Recent Changes
- **@taruvi/refine-providers v1.1.3**: Now exports types (TaruviUser, TaruviMeta, etc.) and utility functions
- **TaruviUser interface updated**: Now returns full user object from API (not just JWT claims)
- **accessControlProvider**: Now supports `batchDelayMs` option for DataLoader batching
- **Type exports added**: refineProviders.ts now re-exports types for app-wide use
- Upgraded MUI to v7.3.7 (Grid uses `size` prop instead of `xs`, `md`, etc.)
- All 8 @taruvi/refine-providers now configured and available
- Removed legacy authProvider.ts and custom DataProvider from taruviClient.ts
- functionHelpers.ts now uses taruviFunctionsProvider instead of direct HTTP calls

Follow UI Guidelines from UI_Guidelines.md

## Frontend Deployment

### Automated Deploy (via script)
```bash
npm run deploy
```
Prompts for site name, then builds, zips `dist/`, and uploads to Taruvi frontend workers API.

### Manual Deploy (inside Docker)

1. **Build:**
   ```bash
   npm run build
   ```

2. **Zip the dist folder:**
   ```bash
   cd /app && zip -r dist.zip dist/
   ```

3. **Upload to Taruvi:**
   ```bash
   curl -X POST "https://api.taruvi.cloud/sites/${SITE_NAME}/api/cloud/frontend_workers/" \
     -H "Authorization: Api-Key ${TARUVI_API_KEY}" \
     -F "name=${TARUVI_APP_SLUG}" \
     -F "is_internal=true" \
     -F "file=@dist.zip;type=application/zip"
   ```

4. **Cleanup:**
   ```bash
   rm -f dist.zip
   ```

### Environment Variables Required
- `TARUVI_API_KEY` — API key for authentication
- `TARUVI_APP_SLUG` — App/worker name
- `SITE_NAME` — Target site (e.g., inferred from `TARUVI_SITE_URL` hostname)

### Build Notes (Docker)
- `refine build` does NOT work inside the Docker container (symlinked node_modules)
- Use `vite build --configLoader runner` directly (already configured in `npm run build`)
- Set `XDG_CONFIG_HOME=/tmp` if running refine CLI commands
