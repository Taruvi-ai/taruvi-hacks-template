# SDK Docs Workflow

Before writing any APP mode function code, use the reference files bundled with this skill. Do not rely on memory — the Taruvi SDK has specific method signatures and module names that differ from generic REST patterns.

## Read in this order

1. `references/sdk-in-functions-key-points.md` — runtime contract, injected client capabilities, common patterns, safety rules.
2. `references/resources.md` — per-module operation patterns (`database`, `storage`, `secrets`, `users`, `analytics`, `policy`, `app`, `settings`, `functions`).
3. `references/sdk-surfaces.md` — quick reference of all available `sdk_client` modules.

## Rules

- Never write Taruvi SDK code from memory — always check the bundled references first.
- Never invent SDK method names, event names, or API URLs.
- If the bundled references do not cover a specific method or behavior, stop and ask for clarification instead of guessing.
- Match examples to the active runtime: Python (`sdk_client`) for functions, TypeScript for frontend.
