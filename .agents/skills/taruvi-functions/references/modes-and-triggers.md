# Modes and Triggers

## Execution Modes

| Mode | Use For | Required Input |
|---|---|---|
| `app` | Python custom business logic, SDK access | `code` |
| `proxy` | Forward request to an external webhook URL | `webhook_url` |
| `system` | Internal registered platform logic | internal registration |

The mode must be set at creation time. Without it the function cannot be routed and creation fails.

## Creating Functions — `manage_function`

```python
# ✅ APP mode — custom Python logic
manage_function(
    action="create_update",
    name="process-order",
    execution_mode="app",
    code="def main(params, user_data, sdk_client):\n    return {}"
)

# ✅ PROXY mode — webhook forwarding
manage_function(
    action="create_update",
    name="notify-slack",
    execution_mode="proxy",
    webhook_url="https://hooks.slack.com/services/xxx"
)

# ✅ SYSTEM mode — maps to registered internal function
manage_function(
    action="create_update",
    name="cleanup_logs",
    execution_mode="system"
)
```

## Trigger Types

| Trigger | When to Use |
|---|---|
| API | Manual or user-initiated, called from frontend |
| Event | React to row/user events (`RECORD_CREATE`, `POST_USER_CREATE`, etc.) |
| Schedule | Periodic / cron jobs (e.g., `0 8 * * 1` = Monday 8am) |
| API async (`is_async=True`) | Long-running workloads — returns `task_id` immediately |
| API public (`is_public=True`) | Unauthenticated external endpoints (webhooks, payments) |
