# Function templates

Copy-paste skeletons for common Taruvi function patterns. Start from one of these instead of from scratch.

## Template 1: CRUD webhook

Receives params from an HTTP caller, validates, writes to a datatable.

```python
def main(params, user_data, sdk_client):
    """
    params: {"title": str, "body": str, "tags": list[str]}
    """
    # Validate
    required = ["title", "body"]
    missing = [k for k in required if k not in params or not params[k]]
    if missing:
        return {"status": "error", "message": f"Missing: {missing}"}

    # Auth guard
    if user_data is None:
        return {"status": "error", "message": "Authentication required"}

    # Create
    try:
        result = (sdk_client.database
            .from_("posts")
            .create({
                "title": params["title"],
                "body": params["body"],
                "tags": params.get("tags", []),
                "author_id": user_data["id"],
                "status": "draft",
            })
            .execute()
        )
        log("Post created", level="info", data={"post_id": result["data"]["id"]})
        return {"status": "ok", "data": result["data"]}
    except Exception as exc:
        log("Create failed", level="error", data={"exception": str(exc)})
        return {"status": "error", "message": str(exc)}
```

## Template 2: Scheduled cleanup

Runs on a cron schedule. No user context (scheduled functions typically use a service account).

```python
from datetime import datetime, timedelta, timezone

def main(params, user_data, sdk_client):
    """
    Scheduled daily. Deletes expired sessions.
    """
    # Scheduled runs have user_data=None. Elevate via service key.
    service_key = sdk_client.secrets.get("SCHEDULER_SERVICE_KEY")["value"]
    admin_client = sdk_client.auth.signInWithToken(
        token=service_key,
        token_type="api_key",
    )

    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    # Delete by filter
    result = (admin_client.database
        .from_("sessions")
        .filter("expires_at", "lt", cutoff)
        .delete()   # fluent delete; matches the filter chain
        .execute()
    )

    deleted = result.get("deleted_count", 0)
    log("Expired sessions cleaned", level="info", data={"count": deleted, "cutoff": cutoff})

    return {"status": "ok", "deleted": deleted}
```

## Template 3: File processor

Picks up an uploaded file, processes it, writes a result back to storage or a datatable.

```python
def main(params, user_data, sdk_client):
    """
    params: {"bucket": str, "path": str}

    Downloads the file, extracts metadata, writes a row to `file_metadata`.
    """
    bucket = params["bucket"]
    path = params["path"]

    # Download
    file_bytes = sdk_client.storage.from_(bucket).download(path).execute()
    log("Downloaded file", level="info", data={"bucket": bucket, "path": path, "size_bytes": len(file_bytes)})

    # Extract metadata (example: size + simple hash)
    import hashlib
    file_hash = hashlib.sha256(file_bytes).hexdigest()

    # Record
    sdk_client.database.from_("file_metadata").upsert({
        "bucket": bucket,
        "path": path,
        "size_bytes": len(file_bytes),
        "sha256": file_hash,
        "processed_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    return {"status": "ok", "size": len(file_bytes), "hash": file_hash}
```

## Template 4: Analytics aggregator

Runs an analytics query, reshapes results, returns a summary.

```python
def main(params, user_data, sdk_client):
    """
    params: {"start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"}

    Returns a revenue summary from the `daily-revenue` analytics query.
    """
    start = params.get("start_date")
    end = params.get("end_date")
    if not (start and end):
        return {"status": "error", "message": "start_date and end_date required"}

    # Execute registered analytics query
    result = sdk_client.analytics.execute("daily-revenue", params={
        "start_date": start,
        "end_date": end,
    })

    rows = result["data"]
    total_revenue = sum(r["revenue"] for r in rows)
    avg_daily = total_revenue / len(rows) if rows else 0

    log("Revenue summary", level="info", data={"days": len(rows), "total": total_revenue})

    return {
        "status": "ok",
        "start_date": start,
        "end_date": end,
        "days": len(rows),
        "total_revenue": total_revenue,
        "avg_daily_revenue": avg_daily,
        "rows": rows,
    }
```

## Template 5: Async fan-out

Use async when you need concurrent I/O.

```python
import asyncio

async def main(params, user_data, sdk_client):
    """
    params: {"user_ids": list[int]}

    Fetches recent orders for each user in parallel.
    """
    user_ids = params.get("user_ids", [])
    if not user_ids:
        return {"status": "error", "message": "user_ids required"}

    async def fetch_recent_orders(user_id):
        result = (await sdk_client.database
            .from_("orders")
            .filter("user_id", "eq", user_id)
            .sort("created_at", "desc")
            .page_size(5)
            .execute()
        )
        return user_id, result["data"]

    results = await asyncio.gather(*[fetch_recent_orders(uid) for uid in user_ids])
    summary = {str(uid): orders for uid, orders in results}

    log("Fan-out complete", level="info", data={"users": len(summary)})
    return {"status": "ok", "users": summary}
```

## Patterns across all templates

1. **Guard `user_data is None`** at the top if your function requires auth.
2. **Validate params** before touching the SDK — cheap failure is better than partial work.
3. **Log at entry, success, and error** — invocation records are your only post-mortem tool.
4. **Return structured JSON** with a `status` field. Callers pattern-match on it.
5. **Don't swallow exceptions** — catch, log, and return error status, or let it propagate for the runtime to log.
6. **Use transactions implicitly** — one `.execute()` is atomic. If you need multi-statement atomicity, the runtime doesn't expose transactions; use analytics queries or raw SQL via MCP at provisioning time instead.

## Anti-patterns

1. **Top-level client construction.** Don't do `CLIENT = Client(...)` at module level — use the `sdk_client` passed in. Module-level clients don't have per-invocation auth.
2. **Synchronous `time.sleep` inside async main.** Use `await asyncio.sleep()`.
3. **Mutating `params`.** It's passed by reference; don't confuse later code. Copy if needed.
4. **Returning non-serializable types.** `datetime`, `Decimal`, bytes → convert to ISO string / float / base64 first.
5. **Calling `signInWithPassword` in function context.** The password isn't available; use a service token.
6. **Large responses.** If your return is >10 MB, write to storage and return a path instead.
