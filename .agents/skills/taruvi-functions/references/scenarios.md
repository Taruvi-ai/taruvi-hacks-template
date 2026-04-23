# Scenarios — right-vs-wrong worked examples

Five end-to-end patterns that show *when* a Taruvi function is the right answer, with the TypeScript frontend call alongside. Use these as templates when the agent has to decide "should this be a function or a direct Refine call?"

The templates in [function-templates.md](function-templates.md) are starting skeletons. This file complements them by showing frontend + backend together and — importantly — the common wrong-way pattern for contrast.

## Scenario 1: Multi-resource cascade delete

**When**: user deletes a task; related attachments (in storage) and activities (in another table) must also be removed.

### Wrong — frontend orchestrates the cascade

```typescript
// Frontend orchestrates 4 separate requests. Unreliable, slow,
// partial-failure leaves orphans.
await dataProvider().deleteMany({ resource: "tasks", ids });

const attachments = await dataProvider().getList({
  resource: "task_attachments",
  filters: [{ field: "task_id", operator: "in", value: ids }],
});

for (const a of attachments.data) {
  await storageProvider.deleteOne({ resource: "task-attachments", id: a.path });
}
await dataProvider().deleteMany({
  resource: "task_attachments",
  ids: attachments.data.map(a => a.id),
});
await dataProvider().deleteMany({ resource: "task_activities", ids: activityIds });
```

Why it's wrong:
- Each hop is a separate network call — total latency is the sum.
- If the browser navigates or loses connection midway, the DB is left inconsistent.
- Race conditions: two deletes running concurrently can interleave.
- No server-side audit log of the cascade operation.

### Right — frontend deletes the primary, function handles cleanup

```typescript
// Frontend: delete the primary resource only (single-resource is fine for Refine).
await dataProvider().deleteMany({ resource: "tasks", ids });

// Function: durable cleanup of related resources, async so the UI isn't blocked.
executeFunctionAsync("cleanup-deleted-tasks", { task_ids: ids })
  .catch(e => console.warn("Cleanup scheduled but will complete async:", e));
```

```python
def main(params, user_data, sdk_client):
    task_ids = params.get("task_ids", [])
    if not task_ids:
        return {"success": True, "deleted": 0}

    for task_id in task_ids:
        # Find attachments with their storage object
        attachments = (sdk_client.database
            .from_("task_attachments")
            .filter("task_id", "eq", task_id)
            .populate("storage_object_id")
            .execute()
        )

        for att in attachments.get("data", []):
            storage_obj = att.get("storage_object_id")
            if storage_obj and storage_obj.get("path"):
                try:
                    sdk_client.storage.from_("task-attachments").delete([storage_obj["path"]])
                except Exception as exc:
                    log("Storage delete failed", level="warning", data={"path": storage_obj["path"], "exc": str(exc)})
            sdk_client.database.delete("task_attachments", record_id=att["id"])

        activities = (sdk_client.database
            .from_("task_activities")
            .filter("task_id", "eq", task_id)
            .execute()
        )
        activity_ids = [a["id"] for a in activities.get("data", [])]
        if activity_ids:
            sdk_client.database.delete("task_activities", ids=activity_ids)

    log(f"Cleaned up related resources for {len(task_ids)} tasks", level="info")
    return {"success": True, "tasks_cleaned": len(task_ids)}
```

---

## Scenario 2: Multi-resource create (employee onboarding)

**When**: creating an employee must also create a salary record, a payroll record, and send an HR notification.

### Right — frontend creates the user, function fans out

```typescript
// Single-resource create from the frontend — fine.
const result = await createUser({
  resource: "users",
  dataProviderName: "user",
  values: userData,
});

// Everything else server-side so it's atomic and auditable.
executeFunctionAsync("onboard-employee", {
  employee_id: result.data.id,
  employee_name: fullName,
}).catch(err => console.error("Onboarding scheduled:", err));
```

```python
def main(params, user_data, sdk_client):
    emp_id = params["employee_id"]
    emp_name = params["employee_name"]

    sdk_client.database.create("salaries", {
        "employee_id": emp_id,
        "base_salary": 0,
        "status": "pending_review",
    })

    sdk_client.database.create("payroll", {
        "employee_id": emp_id,
        "pay_period": "monthly",
        "status": "setup",
    })

    sdk_client.functions.execute("send-slack-notification", params={
        "channel": "#hr",
        "message": f"New employee onboarded: {emp_name}",
    }, is_async=True)

    log("Employee onboarded", level="info", data={"employee_id": emp_id, "name": emp_name})
    return {"success": True, "employee_id": emp_id}
```

**Rule of thumb**: if a user action touches **2+ resources**, it's a function.

---

## Scenario 3: Scheduled / cron job

**When**: runs on a schedule, no direct user trigger. Cron `0 8 * * 1` = Monday 08:00.

```python
from datetime import datetime, timedelta, timezone

def main(params, user_data, sdk_client):
    # Scheduled runs have user_data=None. Use a service key if elevated ops needed.
    revenue = sdk_client.analytics.execute("weekly-revenue", params={
        "period": "last_7_days",
    })

    start = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    signups = (sdk_client.database
        .from_("users")
        .filter("created_at", "gte", start)
        .count()
    )

    log("Weekly report", level="info", data={
        "revenue": revenue["data"]["total"],
        "new_signups": signups,
    })
    return {"revenue": revenue["data"], "new_signups": signups}
```

Register with the `manage_function` MCP tool with the appropriate scheduler trigger config (see `taruvi-backend-provisioning`).

---

## Scenario 4: Event-driven (react to data change)

**When**: fire automatically when a row is created/updated/deleted matching a filter.

Trigger: `RECORD_CREATE` on `orders` with filter `event.data.status == "paid"`.

```python
def main(params, user_data, sdk_client):
    order = params  # event payload is in params

    log("Paid order received", level="info", data={"order_id": order.get("id")})

    # Decrement product stock
    sdk_client.database.update("products",
        record_id=order["product_id"],
        data={"stock": order["current_stock"] - order["quantity"]},
    )

    # Fan out to fulfillment notifier
    sdk_client.functions.execute("notify-fulfillment", params={
        "order_id": order["id"],
        "customer": order["customer_name"],
    }, is_async=True)

    return {"processed": True}
```

---

## Scenario 5: Public webhook receiver

**When**: external service POSTs to Taruvi. Register with `is_public=True` and accept at `/api/public/apps/{app_slug}/functions/{slug}/execute/`.

```python
def main(params, user_data, sdk_client):
    # user_data is None for public invocations — guard accordingly.
    event_type = params.get("type")

    if event_type == "payment.completed":
        sdk_client.database.create("payments", {
            "external_id": params["id"],
            "amount": params["amount"],
            "status": "completed",
        })
        log("Payment recorded", level="info", data={"external_id": params["id"]})
        return {"received": True}

    log("Webhook ignored", level="info", data={"type": event_type})
    return {"ignored": True}
```

**Security note**: public functions run unauthenticated. Verify a shared secret or signature from the caller before trusting `params`.

---

## Decision flowchart (is this a function?)

```
Does the task...
├── Touch 2+ resources (tables + storage, or tables + secrets + users)?  → YES, function
├── React to a data-change event or user lifecycle hook?                 → YES, function
├── Run on a schedule (cron)?                                            → YES, function
├── Call an external API with a stored secret?                           → YES, function
├── Accept unauthenticated webhooks?                                     → YES, function
├── Run longer than ~30 seconds (data import, batch op, report)?         → YES, function (async)
└── Single-resource CRUD a frontend user triggered?                      → NO, use Refine hooks
```

When in doubt, lean toward function. Server-side is easier to audit, easier to retry, and keeps the frontend thin.

## Anti-patterns these scenarios avoid

- **Frontend orchestrates multi-resource transactions** — race-prone, partial-failure-unsafe
- **Browser runs long jobs** — freezes the UI, dies on navigation
- **External API calls from the browser with keys** — leaks credentials into the bundle
- **Cascade cleanup in React** — first network blip leaves orphans in the DB/storage
