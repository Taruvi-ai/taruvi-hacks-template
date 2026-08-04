# Prompt: Add “Report an issue” to the Navkit profile menu

Share this prompt with a developer (or coding agent) to add a **Report an issue** item to the Navkit avatar dropdown. Clicking it opens the Taruvi helpdesk in a new browser tab so the user can create a support ticket.

---

### Goal
Add a **Report an issue** item to the Navkit avatar dropdown. Clicking it opens the Taruvi helpdesk in a new browser tab so the user can create a support ticket.

### Prerequisites
This app is based on the Taruvi hacks / Refine template and already wires Navkit via `useNavkitProfileMenuItems` → `<Navkit profileMenuItems={...} />` in `src/App.tsx`.

### Steps

1. **Ensure `@taruvi/navkit` supports `profileMenuItems`**
   - Check `package.json` for `@taruvi/navkit`.
   - If the version is below `0.0.49` (or missing / not resolving to ≥ `0.0.49`), upgrade:
     ```bash
     npm install @taruvi/navkit@latest
     ```
   - Confirm installed version is **≥ 0.0.49**.

2. **Add the menu item (only if missing)**
   - Edit `src/navkit/useNavkitProfileMenuItems.tsx`.
   - If an item with `title: "Report an issue"` (case-insensitive) already exists in the returned array, **do not add another** — leave the existing item as-is unless it clearly needs the URL/icon wiring below.
   - Otherwise, add a `ProfileMenuItem` that:
     - `title`: `"Report an issue"`
     - `icon`: Font Awesome `["fas", "comments"]` (already available via Navkit peer deps)
     - `callBackFunc`: opens the helpdesk URL in a new tab with `noopener,noreferrer`

3. **Keep the URL easy to change**
   - Define a constant at the top of that file, e.g.:
     ```ts
     const SUPPORT_TICKET_URL = "https://support.taruvi.app/";
     ```
   - Use `SUPPORT_TICKET_URL` in `callBackFunc`. Do **not** use env vars for this.

4. **Do not change**
   - `src/App.tsx` wiring (it should already pass `profileMenuItems` into `<Navkit />`)
   - Navkit internals
   - Auth / login flows

### Expected result
Avatar menu order: user name → Dark Mode (if enabled) → **Report an issue** → Logout.  
Clicking **Report an issue** opens [https://support.taruvi.app/](https://support.taruvi.app/) in a new tab.  
Running this prompt again must not create a duplicate menu item.

### Reference shape
```tsx
import { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ProfileMenuItem } from "@taruvi/navkit";

const SUPPORT_TICKET_URL = "https://support.taruvi.app/";

export function useNavkitProfileMenuItems(): ProfileMenuItem[] {
  return useMemo(
    () => [
      {
        title: "Report an issue",
        icon: <FontAwesomeIcon icon={["fas", "comments"]} />,
        callBackFunc: () => {
          window.open(SUPPORT_TICKET_URL, "_blank", "noopener,noreferrer");
        },
      },
    ],
    [],
  );
}
```
