---
inclusion: fileMatch
fileMatchPattern: '**/*.tsx'
---

# UI / design system preflight

For any task that renders, styles, or restyles UI — pages, layouts, forms, tables, charts,
status badges, colors, typography, spacing, theme work, MUI overrides, or any "make it look
like X" request.

## Sources of truth

1. Read the app's **`UI_Guidelines.md`** first — it resolves design-system ambiguities the theme
   cannot encode.
2. Design tokens live in **`themeOptions.ts`**. Import `taruviTokens` for raw values. Never
   hardcode brand hex strings (`#1E88E5`, `#388e3c`, `#1AB3E6`, …).
3. If either file is missing, stop and tell the user — do not implement design from memory.

## Component rules

- Prefer plain MUI components (`Button`, `Chip`, `Card`, `TextField`, `Alert`, `Table*`,
  `ListItemButton`, `Breadcrumbs`, `Tabs`, `Dialog`). The theme already applies spec'd size,
  weight, radius, padding, shadow, and color via overrides. Do not reimplement with `sx`.
- Use **`*Rounded`** icon variants from `@mui/icons-material` (`EditRoundedIcon`,
  `AddRoundedIcon`) — the design system uses Material Icons Rounded, not filled defaults.
- Notifications go through the existing `useNotificationProvider` from `@refinedev/mui`.
  Do not add custom toast systems or ad hoc snackbars.

## Page anatomy is mandatory

Not optional decoration. Read the relevant `UI_Guidelines.md` section **and** the
`taruvi-refine-providers` skill before writing a page.

**List pages** must ship with: search input, at least one filter control, active-filter chip row,
server-side pagination, and four distinct empty states (no data yet / no results / no matching
items / unable to load). Column rules: text left, numbers right, `MMM DD, YYYY` dates, actions
right, 5-6 columns max.

**Show / detail pages** must include: breadcrumb, H2 title, status chip, action cluster, meta
line, and tabs-with-counts for related data. Bare field dumps are incomplete.

**Destructive actions** (delete, archive, bulk-delete) must route through a confirmation dialog:
title is a question, body names the specific item or count and states "This action cannot be
undone", primary CTA is `color="error"` with the verb (not "OK"). Wiring `useDelete` directly to
a delete icon click is a bug.

**Lists with selection checkboxes** need a bulk-actions toolbar that appears on selection, shows
the count, and routes destructive bulk actions through the confirmation dialog.

**Never render a blank page during load.** Skeleton for initial loads, spinner overlay for
mid-action refetches, inline button spinner for async submits.

**Forms**: single-column default, two-column only for related paired inputs, section titles for
grouping, Cancel-left / Save-right actions. Meet the accessibility checklist — labels, input
types, contrast, specific error messages, keyboard access, `aria-describedby`, required marker,
44px touch targets on mobile.

## Filtering

Search and filters push into Refine's server-side `filters[]` — never into component state
filtered in React.

## Input safety

Normalize nullable API values before passing them to MUI inputs (`value={field.value ?? ""}`,
boolean `checked`) to avoid controlled/uncontrolled warnings.
