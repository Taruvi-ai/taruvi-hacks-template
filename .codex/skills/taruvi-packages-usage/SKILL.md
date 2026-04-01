---
name: taruvi-packages-usage
description: How to use Taruvi npm packages (@taruvi/sdk, @taruvi/refine-providers, Refine v5) on the frontend, and the Taruvi Python SDK in Python runtimes (including Taruvi serverless functions). Use when the user asks about Taruvi, Refine data providers, TypeScript/JavaScript client, edge functions, Python SDK, backend scripts, storage, auth, access control, or Cerbos.
---

# Taruvi packages usage (self-contained)

## Mandatory rules

- **Source of truth:** Everything the model needs is in **this skill directory only**—especially `REFERENCE.md` next to this file. Assume the **project has no separate `docs/` tree** for Taruvi.
- **Do not** answer Taruvi API or behavior questions from memory alone. **Open and read `REFERENCE.md`** (search by heading or keyword). Use training data only for generic concepts (e.g. what Refine is), not for Taruvi-specific APIs.

## Frontend vs Python (do not mix them)

| Context | Packages | Notes |
|---------|-----------|--------|
| **Browser / React / Refine** | `@refinedev/core`, **`@taruvi/sdk`** (JS/TS), **`@taruvi/refine-providers`** | Refine hooks and providers. **Do not use the Python SDK here**—it does not run in the frontend. |
| **Python** (functions, scripts, services) | **Taruvi Python SDK** | Same platform capabilities from Python; **Taruvi functions** inject a ready-to-use `sdk_client`. Patterns in `REFERENCE.md` are written around that injected client, but the same API shapes apply when you construct a client yourself in other Python environments unless the doc says otherwise. |

## How to use this skill

1. Skill root: `.cursor/skills/taruvi-packages-usage/` (after you rename/copy the folder).
2. Read **`REFERENCE.md`**. Sections include **Refine** provider guides and **Python SDK** (full detail).
3. Answer from what you read; quote or paraphrase accurately.

## Copying to another project

Copy the **whole** folder `.cursor/skills/taruvi-packages-usage/` including **`REFERENCE.md`**. One file without `REFERENCE.md` is incomplete.
