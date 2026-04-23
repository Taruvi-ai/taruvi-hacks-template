# Auth patterns inside a Taruvi function

The single most surprising thing about the Taruvi SDK is that auth operations are **immutable** — they return a new client rather than mutating the current one. This file covers why, how to use it, and common pitfalls.

## Why immutable?

The SDK supports:

1. Thread-safe use (a sync client shared across threads).
2. Functional composition (auth as a data transformation).
3. Concurrent async tasks that may act as different principals.

If `signInWithToken` mutated in place, any of these would race.

## The pattern

```python
def main(params, user_data, sdk_client):
    # sdk_client is already authenticated as the calling user. Use it directly.
    current_user = sdk_client.auth.get_current_user()

    # If you need to act as a different principal, CAPTURE the return value.
    service_client = sdk_client.auth.signInWithToken(
        token=sdk_client.secrets.get("SERVICE_JWT")["value"],
        token_type="jwt",
    )
    # sdk_client is still the original user. service_client is the service account.

    # Use service_client for elevated work
    service_client.database.from_("audit_log").create({...}).execute()

    # Use sdk_client for calling-user-scoped work
    sdk_client.database.from_("user_activity").create({...}).execute()
```

## The anti-pattern (broken)

```python
# DO NOT DO THIS
sdk_client.auth.signInWithToken(token="...", token_type="jwt")
# ^ The return value is discarded. sdk_client is still the original principal.
sdk_client.database.from_("audit_log").create({...}).execute()
# ^ This runs as the original user, NOT the service account. You'll get 403.
```

Always capture the return:

```python
sdk_client = sdk_client.auth.signInWithToken(token="...", token_type="jwt")
# ^ Now sdk_client is the new principal. The old one is garbage-collected.
```

## Token types

`signInWithToken` accepts `token_type=`:

| Token type | Header | Use case |
|---|---|---|
| `"jwt"` | `Authorization: Bearer <token>` | Short-lived JWT, user impersonation |
| `"api_key"` | `Authorization: Api-Key <token>` | Knox-issued API keys, service accounts |
| `"session_token"` | `X-Session-Token: <token>` | Browser-style session, rarely used in functions |

For function-to-function service auth, `api_key` is the common choice. Store the key as a secret with type `api-key` (sensitivity `sensitive`).

## Getting a service token

Typical pattern: a long-lived service API key stored as a secret:

```python
def main(params, user_data, sdk_client):
    service_key = sdk_client.secrets.get("INTERNAL_SERVICE_KEY")["value"]
    service_client = sdk_client.auth.signInWithToken(
        token=service_key,
        token_type="api_key",
    )
    # Use service_client for admin-level operations
```

Create the secret via MCP:

```
manage_secret_types(action="list")       # confirm api-key exists
create_update_secret(
  key="INTERNAL_SERVICE_KEY",
  value="<knox-generated-key>",
  secret_type="api-key",
)
```

## Refresh flow

JWTs expire. The runtime-injected `sdk_client` typically has enough lifetime for a single invocation, but long-running functions may need to refresh:

```python
from taruvi.exceptions import AuthenticationError

try:
    result = sdk_client.database.from_("orders").execute()
except AuthenticationError:
    # refreshToken requires the current refresh token; you must have stored it
    # (e.g., in a secret) — the SDK doesn't track it for you.
    refresh_jwt = sdk_client.secrets.get("USER_REFRESH_TOKEN")["value"]
    sdk_client = sdk_client.auth.refreshToken(refresh_token=refresh_jwt)
    result = sdk_client.database.from_("orders").execute()
```

`refreshToken` also returns a new client — same immutability rule. Note that you must supply the `refresh_token` argument; it's not stored on the client.

## Public functions

When a function is registered with `is_public=True`, the runtime invokes it without an authenticated user:

- `user_data` is `None`.
- `sdk_client` is an anonymous client (no user context).

Always guard:

```python
def main(params, user_data, sdk_client):
    if user_data is None:
        log("Anonymous invocation", level="info")
    else:
        log(f"Invoked by {user_data['username']}", level="info")
```

For anonymous functions that need to do privileged work, sign in with a service token as shown above.

## Current user vs injected context

`user_data` and `sdk_client.auth.get_current_user()` normally return the same user — but not always:

- `user_data` is what the runtime injected at invocation time.
- `get_current_user()` is what the SDK's current token resolves to on the server.

After `signInWithToken`, they diverge:

```python
def main(params, user_data, sdk_client):
    # user_data = {"username": "alice", ...}
    # sdk_client.auth.get_current_user() = alice

    sdk_client = sdk_client.auth.signInWithToken(token=service_key, token_type="api_key")
    # user_data = {"username": "alice", ...}  (unchanged)
    # sdk_client.auth.get_current_user() = service-account
```

Use `user_data` when you want the "who invoked this function" identity. Use `get_current_user()` when you want the "who is the SDK currently authenticated as" identity. They are semantically different.

## Common mistakes

1. **Dropping the return value of `signInWithToken`.** The #1 bug. Every auth method returns a new client — capture it.
2. **Mutating the original `sdk_client` after `signInWithToken`.** It's unchanged. Either use the new client or reassign.
3. **Caching a client globally.** If you do `CLIENT = Client(...)` at module level, it won't have the per-invocation auth context. Always use the `sdk_client` passed to `main`.
4. **Assuming `user_data` updates after re-auth.** It doesn't. `user_data` is the invocation-time snapshot.
5. **Calling `signInWithPassword` inside a function body.** Almost always wrong — the user's password isn't available in function context. Use a stored token. (Also: the module's signature is `signInWithPassword(email=, password=)` — older docstrings say `username=` but the actual parameter is `email`.)
6. **Trying to read sensitive secrets via MCP from inside a function.** Sensitive secrets return `[ENCRYPTED]` via MCP. Inside a function body, use the SDK directly (`sdk_client.secrets.get(...)`) — it decrypts transparently.
