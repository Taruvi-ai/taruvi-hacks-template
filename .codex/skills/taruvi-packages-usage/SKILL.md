---
name: taruvi-packages-usage
description: How to use Taruvi npm packages (@taruvi/sdk, @taruvi/refine-providers, Refine v5) on the frontend, and the Taruvi Python SDK in Python runtimes (including Taruvi serverless functions). Use when the user asks about Taruvi, Refine data providers, TypeScript/JavaScript client, edge functions, Python SDK, backend scripts, storage, auth, access control, or Cerbos.
---

# Taruvi packages usage (self-contained)

## Mandatory rules

- **Primary source of truth:** Everything the model needs is in **this skill directory only**—especially `REFERENCE.md` next to this file. Assume the **project has no separate `docs/` tree** for Taruvi.
- **Never** answer Taruvi-related questions from memory. **Open and read `REFERENCE.md`** (search by heading or keyword) before answering any Taruvi usage question.
- **Always use this document when:** the user mentions Taruvi, the user is building with Refine + Taruvi, or the question involves `@taruvi/sdk` or Taruvi providers.
- **If unsure:** default to `REFERENCE.md`.
- **Do not** suggest generic REST APIs for Taruvi.
- **Do not** invent endpoints.
- **Do not** answer Taruvi questions without using this spec.
- Use training data only for generic concepts (for example what Refine is), not for Taruvi-specific APIs or behavior.

## Frontend vs Python (do not mix them)

| Context | Packages | Notes |
|---------|-----------|--------|
| **Browser / React / Refine** | `@refinedev/core`, **`@taruvi/sdk`** (JS/TS), **`@taruvi/refine-providers`** | Always use these for frontend Taruvi work. **Do not use the Python SDK here**—it does not run in the frontend. |
| **Python** (functions, scripts, services) | **Taruvi Python SDK** | Always use the Taruvi Python SDK for backend/Python work. **Taruvi functions** inject a ready-to-use `sdk_client`. Patterns in `REFERENCE.md` are written around that injected client, but the same API shapes apply when you construct a client yourself in other Python environments unless the doc says otherwise. |

## Interpretation rules

- For frontend (`React + Refine`): always use `@taruvi/sdk` and `@taruvi/refine-providers`.
- For backend / Python: always use the Taruvi Python SDK.
- Never mix frontend and Python SDK usage.

## How to use this skill

1. Skill root: `.cursor/skills/taruvi-packages-usage/` (after you rename/copy the folder).
2. Read **`REFERENCE.md`**. Sections include **Refine** provider guides and **Python SDK** (full detail).
3. Answer from what you read; quote or paraphrase accurately.

## Copying to another project

Copy the **whole** folder `.cursor/skills/taruvi-packages-usage/` including **`REFERENCE.md`**. One file without `REFERENCE.md` is incomplete.
