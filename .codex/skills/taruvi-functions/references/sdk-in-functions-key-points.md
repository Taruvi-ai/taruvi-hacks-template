# SDK in Functions - Key Points

## Runtime Contract

- APP mode entrypoint must be exactly:
  - `def main(params, user_data, sdk_client)`
- Return JSON-serializable payloads only.
- `params` contains user inputs and `params["__function__"]` metadata.
- `user_data` provides authenticated user context.

## Injected SDK Client

- `sdk_client` is pre-authenticated in functions.
- Do not re-authenticate the injected client.
- Available modules:
  - `database`, `functions`, `storage`, `secrets`, `users`, `analytics`, `app`, `settings`, `policy`

## Common Function Patterns

- Long-running tasks: `sdk_client.functions.execute(..., is_async=True)` and poll with `get_result`.
- Policy checks: use `policy.check_resources(...)`; pass `principal=None` so server resolves principal.
- Secrets: always read with `sdk_client.secrets.get(...)` / `list(...)`; never hardcode.

## Safety and Reliability

- Use `log()` and structured errors.
- Validate input params before side effects.
- Keep cross-resource orchestration in functions, not frontend.
