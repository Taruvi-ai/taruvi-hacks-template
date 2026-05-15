# Runtime and Packages

## Mandatory Runtime Split

| Runtime | Use | Packages |
|---|---|---|
| Frontend (React + Refine) | UI, CRUD hooks, auth/access control in browser | `@taruvi/sdk`, `@taruvi/refine-providers`, `@refinedev/core` |
| Python (functions/services/scripts) | Backend orchestration, multi-resource operations | Taruvi Python SDK |

## Non-Negotiables

- Never use Python SDK in browser code.
- Never use frontend providers as a substitute for backend orchestration.
- Never answer Taruvi-specific behavior from memory only; read the relevant module references first.
- Never invent endpoints or method names.

## Query Strategy for Dashboards

- Single-table metrics: use datatable provider with `aggregate`/`groupBy`.
- Dashboard elements needing data from 2+ tables: use saved analytics queries via the `app` provider.
- Never fetch full row sets into React to derive summary metrics.
