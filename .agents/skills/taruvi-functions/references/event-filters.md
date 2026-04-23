# Event triggers and CEL filter expressions

Event-driven functions run automatically when platform events occur (row changes, etc.). This file documents the actual trigger types and the CEL filter expression language the platform uses to decide *whether* to fire.

## The three trigger types

From `cloud_site/functions/models.py::TriggerType`:

| Trigger type | When it fires |
|---|---|
| `api` | Direct call via `execute_function` (frontend or MCP). Default for most functions. |
| `schedule` | Cron-scheduled execution. Configure via the function's config / celery-beat. |
| `event` | Automatic, when an event matching the `filter_conditions` CEL expression occurs. |

Two orthogonal flags (not trigger types, but modify behavior):

- `is_async=True` — any trigger type. Returns a `task_id` instead of a result; caller polls for the outcome.
- `is_public=True` — any trigger type. Function is callable without authentication; `user_data` is `None`.

## Filter conditions (CEL)

An event-triggered function has a `filter_conditions` string — a CEL (Common Expression Language) expression. The function only executes when the expression evaluates to `true`.

### CEL context

When a function is evaluated, the context passed to CEL has three top-level keys:

```
{
  "event": {...},     # The event payload (row data, action, etc.)
  "user": {...},      # Current user (UserDetailSerializer output), or null
  "time": {...}       # Current time snapshot
}
```

#### `event` (populated from the invocation params)

Fields depend on the event source. Common ones for datatable events:
- `event.datatable` — table name (e.g., `"orders"`)
- `event.data` — the row contents (dict)
- `event.action` — event type marker if the dispatcher sets it

Always check what the dispatcher actually populates by inspecting a test run's `params`.

#### `user` (from `UserDetailSerializer`)

- `user.id`
- `user.username`
- `user.email`
- `user.first_name`
- `user.last_name`
- `user.is_active`
- `user.is_staff`
- `user.is_superuser`
- `user.roles` — list of role slugs
- plus any custom attributes on the user

`user` is `null` for public / anonymous invocations.

#### `time`

- `time.now` — ISO 8601 UTC timestamp
- `time.timestamp` — Unix epoch (int)
- `time.year`, `time.month`, `time.day`
- `time.hour`, `time.minute`, `time.second`
- `time.day_of_week` — 0=Monday, 6=Sunday
- `time.day_of_year` — 1–366

## Supported operators

The platform uses [celpy](https://pypi.org/project/cel-python/) (Google CEL). Full CEL syntax is supported:

| Operator | Example |
|---|---|
| `==`, `!=` | `event.datatable == "orders"` |
| `&&`, `\|\|`, `!` | `event.data.status == "paid" && event.data.total > 100` |
| `<`, `<=`, `>`, `>=` | `time.hour >= 9 && time.hour < 17` |
| `in` | `event.datatable in ["orders", "payments"]` |
| `.startsWith()`, `.endsWith()`, `.contains()` | `event.datatable.startsWith("temp_")` |
| `.matches()` | regex match (CEL regex syntax) |
| Arithmetic: `+`, `-`, `*`, `/`, `%` | `event.data.total * 1.1 > 100` |
| `size()` | `size(event.data.items) > 0` |
| Ternary-ish | `event.data.priority == "high" ? true : false` |

## Common filter patterns

### Fire only when a specific table is written

```
event.datatable == "orders"
```

### Fire only on paid orders over $100

```
event.datatable == "orders" && event.data.status == "paid" && event.data.total > 100
```

### Fire only for specific user roles

```
"admin" in user.roles
```

### Fire only during business hours (UTC)

```
time.day_of_week < 5 && time.hour >= 9 && time.hour < 17
```

### Fire only for tables matching a prefix

```
event.datatable.startsWith("temp_")
```

### Skip if the field hasn't actually changed (when the event payload includes previous state)

```
event.data.status == "completed" && event.previous.status != "completed"
```

## The permissive-vs-strict ambiguity

There's an inconsistency in the platform:

- **`Function.filter_conditions` model help_text** says "If null/empty, function will NOT execute (strict enforcement)."
- **`CELEvaluator.evaluate()` actual code** says "PERMISSIVE: Empty/None expression returns True (allow execution)."

The evaluator's actual behavior is permissive — an empty filter lets the function run. The help_text is stale. If you rely on filter_conditions for any access control, **always set an explicit expression** — don't rely on null/empty as a block.

## Setting up an event-triggered function

Registration via MCP (see `taruvi-backend-provisioning`):

```
manage_function(
    action="create_update",
    name="on-paid-order",
    execution_mode="app",
    code="def main(params, user_data, sdk_client): ...",
    filter_conditions='event.datatable == "orders" && event.data.status == "paid"',
    is_active=True,
    async_mode=True,       # recommended for event handlers — don't block the event dispatcher
)
```

Inside the function body, `params` IS the event payload — so `params["datatable"]` and `params["data"]` are what the CEL filter matched on.

## Idempotency

Event handlers should be **idempotent** — the same event may be delivered more than once (at-least-once semantics are typical for event pipelines). Guard with:

- Dedupe key in a datatable (`event_dedupe` table keyed on event ID)
- Check-then-act: `if record.status == "processed": return`
- Upsert semantics over create, where safe

## Validation

Before saving a function with `filter_conditions`, validate the CEL expression compiles:

```python
from cloud_site.functions.services.condition_evaluator import CELEvaluator

valid, error = CELEvaluator().validate("event.datatable == 'orders'")
# valid: True, error: None
#
# Or:
valid, error = CELEvaluator().validate("invalid ===")
# valid: False, error: "Invalid CEL syntax: ..."
```

Save a malformed expression and the function will silently never fire. Always validate.
