# Frontend Calling Patterns

Use helper wrappers for predictable frontend invocation behavior.

```typescript
import { executeFunction, executeFunctionAsync } from "../../utils/functionHelpers";

const result = await executeFunction("calculate-total", { items: [1, 2, 3] });
executeFunctionAsync("cleanup-tasks", { task_ids: [1, 2] }).catch(console.warn);
```

## Selection

- `executeFunction(...)`: use when UI must wait for result.
- `executeFunctionAsync(...)`: use for fire-and-forget/background flows.

## Guardrails

- Keep frontend payloads small and explicit.
- Move multi-step side effects into backend function code.
- For long-running work, prefer async execution and polling/status UX.
