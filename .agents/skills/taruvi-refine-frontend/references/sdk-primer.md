# Direct `@taruvi/sdk` usage (when providers don't fit)

Most frontend work goes through the Refine providers. This is the escape hatch for when you need something they don't expose.

## When to reach for the SDK directly

- One-off scripted data flows outside React components (utility scripts, tests).
- Advanced queries beyond Refine's hook model (streaming, complex batching).
- Custom workflow orchestration (e.g., "upload a file, then trigger a function, then update a row in one atomic flow").
- Admin/debug utilities that don't need Refine's cache/mutation layer.

## SDK initialization

```typescript
import { Client } from "@taruvi/sdk";

const client = new Client({
  apiKey: process.env.REACT_APP_TARUVI_KEY!,
  appSlug: process.env.REACT_APP_TARUVI_APP!,
  apiUrl: process.env.REACT_APP_TARUVI_API_URL!,
});
```

**Use the same `Client` instance** that you pass to the Refine providers. Multiple instances are fine but each maintains its own token storage, which can cause auth state to diverge.

## Module surface (10 modules)

All instantiated with the client:

```typescript
import { Database, Storage, Auth, User, Functions, Analytics, Policy, Secrets, Settings, App } from "@taruvi/sdk";

const db = new Database(client);
const storage = new Storage(client);
const auth = new Auth(client);
const users = new User(client);
const functions = new Functions(client);
const analytics = new Analytics(client);
const policy = new Policy(client);
const secrets = new Secrets(client);
const settings = new Settings(client);
const app = new App(client);
```

## Fluent/builder pattern (Database, Storage, Secrets, App)

### Database

```typescript
const posts = await db
  .from("posts")
  .filter("status", "eq", "published")
  .filter("created_at", "gte", "2026-01-01")
  .populate(["author"])
  .sort("created_at", "desc")
  .pageSize(20)
  .execute();

// posts: { data: Post[], total: number, pagination: {...} }

// Single:
const post = await db.from("posts").get("123").execute();

// Create:
const created = await db.from("posts").create({ title: "...", body: "..." }).execute();

// Update:
const updated = await db.from("posts").update({ status: "archived" }).where("42").execute();

// Upsert:
const upserted = await db.from("posts").upsert({ id: 42, title: "updated" }).execute();

// Delete:
await db.from("posts").delete("42").execute();
await db.from("posts").bulkDelete(["1", "2", "3"]).execute();

// Aggregates:
const revenue = await db
  .from("orders")
  .filter("status", "eq", "completed")
  .aggregate("sum(total)", "count(*)")
  .groupBy("customer_id")
  .execute();

// Graph:
const tree = await db
  .from("categories")
  .format("tree")
  .include("descendants")
  .depth(3)
  .execute();
```

### Storage

```typescript
const uploaded = await storage
  .from("user-uploads")
  .upload({ files: [file1, file2], paths: ["a.png", "b.png"] })
  .execute();

const blob = await storage.from("user-uploads").download("path/to/file.pdf").execute();

const meta = await storage.from("user-uploads").metadata("path/to/file.pdf").execute();

await storage.from("user-uploads").delete(["a.png", "b.png"]).execute();

const files = await storage
  .from("user-uploads")
  .filter({ size__gte: 1000, mimetype: "image/png" })
  .execute();
```

### Secrets

```typescript
// Batch fetch
const batch = await secrets.list(["STRIPE_KEY", "API_URL"], { app: "my-app" });

// Single
const stripe = await secrets.get("STRIPE_KEY").execute();
```

## Non-fluent modules

### Functions

```typescript
// Sync
const result = await functions.execute("send-email", {
  params: { to: "x@y.com" },
});

// Async (task id returned)
const async = await functions.execute("long-job", {
  params: {...},
  async: true,
});
// async.task_id, async.task_status
```

### Analytics

```typescript
const rows = await analytics.execute("daily-revenue", {
  params: { start_date: "2026-04-01", end_date: "2026-04-17" },
});
```

### Policy

```typescript
const result = await policy.checkResource({
  principal: { id: "alice", roles: ["user"] },
  resources: [
    { resource: "post:123", actions: ["read", "update"] },
  ],
});
// result.results[0].actions — { read: "EFFECT_ALLOW", update: "EFFECT_DENY" }

const allowedActions = await policy.getAllowedActions(
  { resource: "post:123" },
  { principal: { id: "alice", roles: ["user"] } }
);
```

### User

```typescript
const alice = await users.getUser("alice");
const me = await auth.getCurrentUser();
const apps = await users.getUserApps("alice");

await users.assignRoles({ roles: ["editor"], usernames: ["alice"] });
await users.revokeRoles({ roles: ["editor"], usernames: ["alice"] });

await users.updatePreferences({ theme: "dark" });
```

### Settings

```typescript
const siteConfig = await settings.get();
const userAttrsSchema = await settings.getUserAttributes();
await settings.updateUserAttributes(newSchema);  // REPLACES
```

### App

```typescript
const roles = await app.roles().execute();
const appSettings = await app.settings().execute();
```

## When direct SDK is wrong

- Inside a Refine page where you could use a hook — use the hook. The hook handles loading state, errors, cache invalidation, optimistic updates.
- Inside a component effect that fires on every render — the SDK doesn't cache; you'll hammer the API.
- When you want the `_cachedUser` to stay consistent with Refine — direct SDK calls bypass the auth provider's cache.

## Error handling

The SDK throws typed errors:

```typescript
import { TaruviError, AuthError, NotFoundError, ValidationError } from "@taruvi/sdk";

try {
  await db.from("posts").get("404").execute();
} catch (err) {
  if (err instanceof NotFoundError) {
    // handle 404
  } else if (err instanceof AuthError) {
    // 401 — but note: Client also auto-clears token on 401
  } else if (err instanceof ValidationError) {
    // 422 — err.errors is field-keyed
  } else {
    throw err;
  }
}
```

Refine providers wrap these into the `onError` protocol; direct SDK calls surface them raw.
