# Guardrails

- Read Taruvi SDK/function docs before coding behavior details.
- Use exact APP signature: `main(params, user_data, sdk_client)`.
- Never hardcode secret values.
- Never re-authenticate injected `sdk_client`.
- Return JSON-serializable payloads only.
- Use serverless functions for multi-resource side effects.
