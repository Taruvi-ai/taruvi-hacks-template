# AGENTS.md - AI Assistant Guide for Taruvi Refine Template

## Functional App Default

If the user asks to create or build an app, default to a functional, production-ready app — not a mockup, not a demo, not an MVP.

A functional app in this repo means:
- create Taruvi schema with MCP tools
- seed enough real data to use the app
- register Refine resources in `src/App.tsx`
- build real list/create/edit/show flows for core resources
- wire dashboards/pages to live data, automatically calculated from the system's data and kept up to date — never hardcoded or demo values

If the user wants a UI-only prototype, they must explicitly say so.

## Project Overview

This is a **Refine.dev v5** project - a React-based framework for building admin panels, dashboards, and internal tools.

**CRITICAL:** This project uses **Refine v5** which has significantly different hook syntax from v4. Always use the v5 patterns documented in the "[IMPORTANT: Refine v5 Syntax Changes](#important-refine-v5-syntax-changes)" section below.

**CRITICAL:** Even if the user asks for plain HTML, CSS, or JavaScript — always use React, Refine v5 hooks, MUI components, and TypeScript. Do not build outside the framework.

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

### Browser errors → `logs/frontend.ndjson`

When the user reports a browser problem, read `logs/frontend.ndjson` instead of asking them to open DevTools. It's NDJSON — one event per line with `timestamp`, `source`, `text`, `session_id`, and for network errors `method`/`url`/`status`. Secrets are redacted server-side.

After shipping a fix, truncate before asking the user to re-test so the next reproduction is unambiguous: `: > logs/frontend.ndjson`.

If the file is missing, no errors have been captured yet — ask the user to reproduce the issue once, then re-read.

## Mandatory UI / Design System Preflight

For any task that **renders, styles, or restyles UI** — new pages, layouts, forms, tables, charts, status badges, colors, typography, spacing, theme work, MUI overrides, or any "make it look like X" request:

1. You MUST open and read [`UI_Guidelines.md`](UI_Guidelines.md) first. It is the companion to the MUI theme and resolves design-system ambiguities the theme cannot encode on its own.
2. The single source of truth for design tokens is [`themeOptions.ts`](themeOptions.ts) — import `taruviTokens` for raw values:
   ```ts
   import { taruviTokens } from "../../themeOptions"; // or from "@/theme/themeOptions"
   ```
   Never hardcode brand hex strings (`#1E88E5`, `#388e3c`, `#1AB3E6`, etc.) — pull them from `taruviTokens`.
3. Prefer plain MUI components (`<Button>`, `<Chip>`, `<Card>`, `<TextField>`, `<Alert>`, `<Table*>`, `<ListItemButton>`, `<Breadcrumbs>`, `<Tabs>`, `<Dialog>`, …) — the theme already applies every spec'd size, weight, radius, padding, shadow, and color via component overrides. Do not reimplement these styles with `sx` or custom CSS.
4. For things the theme cannot enforce (page-level layout, form-row grid, hero gradient, status chip mapping to MUI color slots, "ON HOLD" / "TO DO" chips, chart colors via Recharts, icon conventions, avatar sizing) — follow the snippets in `UI_Guidelines.md`.
5. Use **`*Rounded`** icon variants from `@mui/icons-material` (e.g., `EditRoundedIcon`, `AddRoundedIcon`) — the design system uses Material Icons Rounded, not the filled defaults.
6. **Page anatomy is mandatory**, not optional decoration. For any Refine page (list, show, create/edit, dashboard), the visual contract lives in [`UI_Guidelines.md`](UI_Guidelines.md) and the **implementation lives in the `taruvi-refine-providers` skill — read both before writing the page**, not just the styling layer. In particular:
   - **Every list page MUST ship with a search input, at least one filter control, an active-filter chip row, server-side pagination, and the four distinct empty-state variants** (no data yet / no results / no matching items / unable to load) — see [`§4.6`](UI_Guidelines.md) + [`§4.7`](UI_Guidelines.md), plus the skill's "DataGrid checklist" + `database-provider.md` for the wiring. Apply column-type rules from [`§4.12`](UI_Guidelines.md) (text left, numbers right, `MMM DD, YYYY` dates, actions right, 5-6 columns max).
   - **Every show / detail page MUST include** breadcrumb + H2 title + status chip + action cluster + meta line + tabs-with-counts for related data — see [`§4.11`](UI_Guidelines.md). Bare field dumps are incomplete.
   - **Every destructive action (delete, archive, bulk-delete, …) MUST go through a confirmation dialog** matching [`§4.8`](UI_Guidelines.md) — title is a question, body names the specific item or count and states "This action cannot be undone", primary CTA is `color="error"` with the verb (not "OK"). Wiring `useDelete` directly to a delete icon click is a bug.
   - **Lists with selection checkboxes MUST have a bulk-actions toolbar** ([`§4.9`](UI_Guidelines.md)) that appears on selection, shows the count, and routes destructive bulk actions through §4.8.
   - **Never render a blank page during data load.** Use one of the three loading patterns from [`§4.10`](UI_Guidelines.md) — skeleton for initial loads, spinner overlay for mid-action refetches, inline button spinner for async submits.
   - **Forms** follow [`§4.3`](UI_Guidelines.md) — single-column default, two-column for related paired inputs, section titles for grouping, Cancel-left/Save-right actions, and the 8-item accessibility checklist (labels, types, contrast, error specificity, keyboard, aria-describedby, required marker, 44px mobile).
   - Filters and search push into Refine's server-side `filters[]`, never into component state filtered in React.

   If you can't show that you read the skill section relevant to the page type you're building, you aren't ready to write it.

If `UI_Guidelines.md` or `themeOptions.ts` is missing, stop and tell the user — do not implement design from memory.

## Mandatory Taruvi Preflight

For any task involving Taruvi, Refine + Taruvi, `@taruvi/sdk`, or `@taruvi/refine-providers`:

1. You MUST open and read `.codex/skills/taruvi-app-developer/SKILL.md` first — it routes you to the right module skills.
2. If `.codex/skills/taruvi-app-developer/SKILL.md` is missing, inform the user to install skills by running `npx skills add Taruvi-ai/taruvi-skills`.
3. Follow its Step 4 to load all relevant module skills before writing any code.

Do not implement from memory. Do not treat prior knowledge as sufficient. If these files are unavailable, stop and say so.

### User Data Access Rule (Mandatory)
- Taruvi platform already provides built-in user management (users, roles, auth).
- Never create custom user/auth datatables (for example: `users`, `auth_users`, `user_roles`, `passwords`, `sessions`) to replace platform identity.
- Never access `auth_user` through datatable routes from frontend code (for example `datatables/auth_user/data`).
- Never use `resource: "auth_user"` in Refine hooks/components.
- Always access users via the `user` provider (`dataProviderName: "user"`, with `resource: "users"`).
- Manage users/roles through the dedicated user/app APIs and MCP tools (`list_users`, `create_user`, `update_user`, `manage_roles`, `manage_role_assignments`) — not manual SQL CRUD on identity data.
- If user identity data is not available to the current role, degrade gracefully in UI (no crashing/spammy retries).

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
```

#### Table Hooks (useDataGrid, useTable, useSimpleList)

```typescript
// ❌ v4: const { tableQueryResult, setCurrent, current } = useDataGrid();
// ✅ v5:
const { dataGridProps, tableQuery, result } = useDataGrid({ resource: "blog_posts" });
```

### Parameter Name Changes

| ❌ Old (v4) | ✅ New (v5) |
|------------|------------|
| `metaData` | `meta` |
| `sorter` or `sort` | `sorters` |
| `hasPagination: false` | `pagination: { mode: "off" }` |
| `initialCurrent` | `pagination: { currentPage: 1 }` |
| `initialPageSize` | `pagination: { pageSize: 20 }` |
| `isLoading` (mutations) | `isPending` |
| `useResource("posts")` | `useResourceParams({ resource: "posts" })` |
| `ignoreAccessControlProvider` | `accessControl={{ enabled: false }}` |
| `options: { label: "..." }` | `meta: { label: "..." }` |

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

### Auth, Settings, and Input Safety

- Taruvi auth is redirect-based. Keep `/login` wired to `LoginRedirect`; do not replace it with a local `AuthPage` form.
- Keep protected Taruvi queries behind auth. App-wide settings/nav/theme fetches must skip protected API calls until a session token exists or live inside an authenticated route boundary.
- For forms, normalize nullable API values before passing them to MUI inputs (`value={field.value ?? ""}`, boolean `checked`) to avoid uncontrolled/controlled warnings.

### Stable Query Inputs

When building lists, dashboards, or any data-driven page, keep query inputs stable across renders:

- memoize `filters`, `sorters`, `meta`, and other query objects when they are derived in component scope
- avoid inline `new Date()`, `Date.now()`, `Math.random()`, or freshly created arrays/objects inside hook arguments
- if a cutoff time or default date range is needed, compute it once with `useMemo` or a top-level constant
- if a query refetches repeatedly without user input, inspect the hook arguments first before blaming the provider

This matters most for `useList`, `useDataGrid`, and `useMany`, because unstable arguments change the query key and can cause repeated datatable requests.

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

## Project-Specific Notes

### Homepage / Dashboard

**Current State:** Simple "Hello" page at `/src/pages/home/index.tsx`, set as index route.

**When building a new app:** Replace homepage with an analytics dashboard showing key metrics.

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
- Changes auto-trigger hot reload.
- Only run build commands if explicitly requested

**Documentation:** [Refine](https://refine.dev/docs) | [MUI DataGrid](https://mui.com/x/react-data-grid/) | [React Hook Form](https://react-hook-form.com/)

## Troubleshooting Guide

### Providers Not Working
- Check `.env.local` has all required variables
- Verify `taruviClient` is initialized in `/src/taruviClient.ts`
- Confirm providers are exported from `/src/providers/refineProviders.ts`
- Check network tab for API errors

### Resource Not Appearing
- Verify table exists using MCP `get_datatable_schema`
- Check resource name matches database table name exactly
- Ensure resource is registered in `App.tsx` resources array

### Foreign Key Errors
- Ensure referenced table exists first
- Use correct field type (integer for IDs)
- Verify reference syntax: `{ resource: "table_name", fields: "id" }`

### Authentication Issues
- Check if token is stored properly
- Verify `authProvider.check()` is working
- Test redirect flow with network tab open

## Best Practices

- **Code Organization:** One resource per directory in `/src/pages/`, barrel exports, reusable components in `/src/components/`
- **Data Modeling:** Always define primary key, use foreign keys, add indexes for frequent queries
- **Form Validation:** react-hook-form validation, schema constraints, clear error messages
- **Performance:** `queryOptions.enabled` to prevent unnecessary fetches, pagination for large datasets, `useMany` over multiple `useOne`
- **Security:** Never expose API keys in frontend, use env variables, validate permissions on backend


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
18. **Never query `auth_user` as a datatable** - Always use the `user` provider for user/role operations
19. **Never build custom auth/user tables** - Use platform user management and role APIs instead of manual identity datatables

This is a **Refine.dev v5 project** - leverage the framework's hooks and patterns rather than reinventing CRUD operations.

For any UI/style/theme work, follow [`UI_Guidelines.md`](UI_Guidelines.md) and `taruviTokens` from [`themeOptions.ts`](themeOptions.ts) — see the "Mandatory UI / Design System Preflight" section near the top of this file for the full rules.

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
