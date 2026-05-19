# Taruvi UI Guidelines

This document captures what the **Taruvi design system** specifies that the MUI theme alone cannot enforce — page-level patterns, ambiguous color choices, and conventions you need to follow by hand.

For pure tokens (colors, font sizes, radii, shadows, paddings, etc.) the single source of truth is [themeOptions.ts](themeOptions.ts) — import the `taruviTokens` object whenever you need a raw value.

```ts
import { taruviTokens } from "@/../themeOptions";
// or via the re-export:
import { taruviTokens } from "@/theme/themeOptions";
```

---

## 1. What the theme enforces for free

You do **not** need to set these manually anywhere — they apply across every component:

| Surface | Spec | Where applied |
|---|---|---|
| Body font | Open Sans, 13px, line-height 1.6 | `MuiCssBaseline` |
| Heading font | Quicksand (H1 800 / H2–H6 700) | `typography.h1…h6` |
| Buttons | Quicksand 700 UPPERCASE, 8px radius, sm/md/lg = 6·14 / 10·20 / 14·28 px, min-h 28/36/44 | `MuiButton` |
| Chips | Pill (999), Quicksand 700 UPPERCASE 0.06em, h 24 / sm 20 | `MuiChip` |
| Cards | 16px radius, 28px padding, `0 2px 12px rgba(0,0,0,0.07)` shadow | `MuiCard` / `MuiCardContent` |
| Card title | Quicksand 600 12px UPPERCASE 0.05em, 16px margin-bottom | `MuiCardHeader.title` |
| Inputs | 10px radius, `#F3F3F5` fill, focus ring `0 0 0 3px rgba(30,136,229,0.12)` | `MuiOutlinedInput` |
| Form label | Open Sans 600 13px, asterisk in error | `MuiInputLabel` / `MuiFormLabel` |
| Helper / error text | 11px, muted / error | `MuiFormHelperText` |
| Tables | 12px wrapper, head 11px Quicksand 700 UPPERCASE, cell 13px 12×16 padding, row hover `primary-50` | `MuiTable*` |
| Alerts | 10px radius, 14·18 padding, 4px colored left border | `MuiAlert` |
| Breadcrumbs | 14px body, **16px / 600** for current item | `MuiBreadcrumbs` |
| Sidebar items | 10·12 padding, 8px radius, Quicksand 600, active = `#1976d2` white | `MuiListItemButton` |
| Tooltip | 6px radius, dark `#121414` | `MuiTooltip` |
| Tabs | Quicksand 700 UPPERCASE, 3px primary indicator | `MuiTabs` / `MuiTab` |
| Dialog | 16px radius, 28px padding, design-system shadow | `MuiDialog` |
| Avatar (default) | 34×34, Quicksand 700, 13px | `MuiAvatar` |
| Focus ring | `0 0 0 3px rgba(30,136,229,0.12)` everywhere | inputs, focus-visible |

---

## 2. Color disambiguation — the design system has **three greens, three blues, two oranges**

These aren't bugs; the design intentionally separates *brand* tones (palette swatches), *operational status* tones (chips, alerts), and *chart* tones. Use the right token for the right surface.

### Greens

| Token | Hex | Use for |
|---|---|---|
| `tokens.success[500]` | `#10B981` | Brand emerald — illustrations, palette swatches, success accents on dark backgrounds |
| `#388e3c` (chip-complete / alert-success) | `#388e3c` | **Status chips ("COMPLETE", "ACTIVE", "LOW priority"), success alert border + icon** — already wired in `MuiChip` color="success" and `MuiAlert` severity="success" |
| `tokens.status.resolved` | `#008751` | **Charts only** (pie/donut "Resolved", funnel, stacked bar "Complete") |

### Blues

| Token | Hex | Use for |
|---|---|---|
| `tokens.primary[700]` | `#1AB3E6` | Brand sky — illustrations, accents |
| `tokens.button.primaryDefault` | `#1E88E5` | **All primary action buttons + input focus ring** — already wired in `MuiButton` |
| `tokens.status.inProgress` | `#1976d2` | **Status chips ("IN PROGRESS"), sidebar active item, info alerts, links** — already wired in `MuiListItemButton.Mui-selected`, `MuiAlert` severity="info", `MuiLink` |
| `tokens.status.chartPrimary` | `#1e88f5` | **Charts only** (default series fill) |
| `tokens.surface.navBlue` | `#2b97ff` | Hero cover gradient end-stop, blue NavKit variant |
| `tokens.surface.navDark` | `#004369` | Dark NavKit variant background, footer background |

### Oranges

| Token | Hex | Use for |
|---|---|---|
| `tokens.status.review` | `#f57c00` | **Status chips ("REVIEW", "PLANNING", "MEDIUM priority"), warning alerts** — already wired in `MuiChip` color="warning" |
| `tokens.status.underReview` | `#FF8C00` | **Charts only** (pie/donut "Under Review", funnel "Review", stacked bar "Review") |

> **Rule of thumb:** UI affordances (chips, alerts, buttons, sidebars) use the `chip/status` variant. Charts use the `chart` variant.

---

## 3. Status chip semantic mapping

`MuiChip` only ships `default | primary | secondary | error | info | success | warning`. The design system has six status chips. Map them as follows:

| Chip in design system | MUI usage | Notes |
|---|---|---|
| COMPLETE / ACTIVE | `<Chip color="success" label="COMPLETE" />` | Background `#388e3c` (already overridden) |
| IN PROGRESS | `<Chip color="info" label="IN PROGRESS" />` | Background `#1976d2` (already overridden) |
| REVIEW / PLANNING | `<Chip color="warning" label="REVIEW" />` | Background `#f57c00` (already overridden) |
| DELAYED / CANCELLED | `<Chip color="error" label="DELAYED" />` | Background `#c2185b` (already overridden) |
| **ON HOLD** | `<Chip label="ON HOLD" sx={{ bgcolor: '#7b1fa2', color: '#fff' }} />` | No MUI color slot — use `sx` |
| **TO DO** | `<Chip label="TO DO" sx={{ bgcolor: '#00acc1', color: '#fff' }} />` | No MUI color slot — use `sx` |

For **priority chips** (outlined variant), the spec uses high `#c2185b`, medium `#f57c00`, low `#388e3c`:

```tsx
<Chip variant="outlined" color="error" label="HIGH" />
<Chip variant="outlined" color="warning" label="MEDIUM" />
<Chip variant="outlined" color="success" label="LOW" />
```

For **category / tag chips** (filled):

The design system uses a **4-color pastel rotation palette** so adjacent tags read as distinct without looking like status. Exposed in tokens as `taruviTokens.tagPalette[i]`:

| Index | Bg | Text | Design system example |
|---|---|---|---|
| `0` | `#E0F6FE` | `#004369` | Design (blue) |
| `1` | `#EDE7F6` | `#4527A0` | Development (purple) |
| `2` | `#E8F5E9` | `#1B5E20` | Marketing (green) |
| `3` | `#FFF3E0` | `#E65100` | Research (orange) |

Pick deterministically from the tag's name so the same category always lands on the same color:

```tsx
import { taruviTokens } from "@/theme/themeOptions";

const colorForTag = (name: string) => {
  // tiny stable hash → palette index
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return taruviTokens.tagPalette[Math.abs(h) % taruviTokens.tagPalette.length];
};

const { bg, text } = colorForTag(tag);
<Chip label={tag} sx={{ bgcolor: bg, color: text, fontFamily: 'Quicksand', fontWeight: 700 }} />
```

For **category / tag chips (outlined)** — single brand-blue outline is fine when tags are technical (Frontend, Backend, API) rather than thematic:

```tsx
<Chip variant="outlined" label="Frontend" sx={{ color: '#1976d2', borderColor: '#1976d2' }} />
```

> **Don't** use the rotation palette for **status** — status uses the semantic chip colors documented above in §3. Rotation is for *categories* where the meaning is "different from each other", not "different in severity".

---

## 4. Page-level layout patterns (not in the theme)

The theme styles components but doesn't dictate page composition. Use these patterns.

### 4.1 Page container

```tsx
<Container maxWidth="lg" sx={{ py: 6, px: 4 }}>  {/* 48px y, 32px x — matches design `.container` */}
  …
</Container>
```

### 4.2 Section

```tsx
<Box component="section" sx={{ mb: 8 }}>  {/* 64px section gap */}
  <Typography variant="h2" sx={{ mb: 1 }}>Section title</Typography>
  <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic', mb: 3.5 }}>
    Section subtitle (italic, muted, mb 28px)
  </Typography>
  <Card>…</Card>
</Box>
```

### 4.3 Form layout

The design uses a single-column layout by default, a 2-column grid for related paired inputs, and a "form section title" header for grouping. The theme handles input visuals (12×16 padding, 16px base font, 10px radius, focus ring) — this section covers the layout, labels, conventions, and accessibility you have to do by hand.

**Vertical rhythm** (design system spec — also exported as theme tokens):

| Gap | Value | Token |
|---|---|---|
| Label → input | 8px | `taruviTokens.spacing.formLabelToInput` |
| Input → helper / error | 4px | `taruviTokens.spacing.formInputToHelper` |
| Between adjacent fields in a stack | 16px | `taruviTokens.spacing.formFieldGap` |
| Between form sections | 32px | `taruviTokens.spacing.formSectionGap` |
| Form actions top margin | 24px | `taruviTokens.spacing.formActionsMt` |
| Cancel ↔ Save button gap | 10px | `taruviTokens.spacing.formActionsGap` |

**Section title** (use above each logical group of fields — e.g., "Contact Information", "Billing Address"):

```tsx
<Typography sx={{
  fontFamily: 'Quicksand', fontSize: 13, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.05em',
  color: 'text.disabled', mt: 4, mb: 1.75,   // 32px above (between-section), ~14px to first field
}}>Contact Information</Typography>
```

**Two-column grid** for related paired inputs (Start/End date, Status/Priority, City/Country). Stacks on mobile:

```tsx
<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
  <TextField label="Start Date" type="date" />
  <TextField label="End Date *" type="date" required />
</Box>
```

> Single-column is the **default** layout. Use 2-column only when fields are clearly related and similar in importance.

**Field-label conventions:**

| Convention | Example | When |
|---|---|---|
| **Required** marker | `Title *` (asterisk handled automatically by `<TextField required>`) | The asterisk is wired in the theme via `MuiFormLabel-asterisk` styled in error color |
| **Optional** marker | `Updated End Date (Optional)` — append `(Optional)` to the label text | Use when **most** fields in the form are required and you need to call out the exception |
| **Character counter** | `0/500 characters` as helper text on text/textarea inputs with a `maxLength` | Always show when there's a hard limit |
| **Helper text** | `Cannot modify after creation` | Use for inline guidance, disabled hints, examples (`e.g. example.com`) |
| **Error text** | `Company name is required` | Replace helper text; field border turns error color automatically |

**Form actions** — Cancel **left**, primary **right**, right-aligned at the bottom of the form/card:

```tsx
<Stack direction="row" spacing={1.25} sx={{ mt: 3, justifyContent: 'flex-end' }}>
  <Button variant="outlined">Cancel</Button>
  <Button variant="contained">Save Changes</Button>
</Stack>
```

> **Order matters**: secondary action on the **left**, primary on the **right**. This is the spec, not a preference — primary on the right matches reading flow ("Cancel … or … Save").

**Collapsible section** for optional/advanced fields (use sparingly — only when most users won't need them):

```tsx
<Accordion sx={{ boxShadow: 'none', '&:before': { display: 'none' } }}>
  <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
    <Typography>Additional Notes (Optional)</Typography>
  </AccordionSummary>
  <AccordionDetails>
    <TextField label="Notes" multiline rows={4} fullWidth />
  </AccordionDetails>
</Accordion>
```

**Accessibility checklist** (from the design system — agents must verify each before shipping a form):

- [ ] Every input has an associated label via `<TextField label="…">` (MUI handles the `htmlFor`).
- [ ] Use the right `type=` for the field — `email` / `tel` / `number` / `date` / `url` / `password`. Mobile shows the right keyboard.
- [ ] WCAG AA 4.5:1 contrast on label, helper, error text. (The theme tokens are AA-compliant; **don't override colors** without checking contrast.)
- [ ] Error messages are specific (`Email must include @`) — never generic (`Invalid input`).
- [ ] All controls reachable by tab; submit on `Enter` works.
- [ ] `aria-describedby` links helper / error text to the input — `<TextField helperText="..." />` already does this for you; if you build a custom field, wire it yourself.
- [ ] Required-field marker uses both visual (`*`) and semantic (`required` attribute, which adds `aria-required`).
- [ ] Touch targets meet 44px on mobile — buttons already do via the `@media (pointer: coarse)` rule in the theme.

### 4.4 Hero / cover gradient

Used on the Home/landing page only:

```tsx
const coverBg = "linear-gradient(135deg, #dce9f5 0%, #5ab4f0 60%, #2b97ff 100%)";  // light
const coverBgDark = "linear-gradient(135deg, #002A3C 0%, #004369 55%, #056A8F 100%)";  // dark
```

Pair with `cover-title` typography: **Quicksand 300, 58px, line-height 1.15, letter-spacing -0.01em, white**.

### 4.5 Footer band

```tsx
<Box sx={{
  bgcolor: '#004369', color: '#9de5fd', textAlign: 'center', py: 3,
  fontFamily: 'Quicksand', fontSize: 13, fontWeight: 600, letterSpacing: '0.04em',
}}>
  Taruvi · Built with Quicksand &amp; Open Sans
</Box>
```

### 4.6 Empty states — four variants

The design system specifies **four distinct empty states**. Picking the right one is part of the contract — a generic "no data" placeholder for a search miss is incomplete.

| Variant | Trigger | Icon | CTA | Mood |
|---|---|---|---|---|
| **No data yet** | Resource has 0 rows total (first run, never used) | resource icon (`FolderOpenRounded`, etc.) | **Primary** "+ Create …" | Inviting |
| **No results found** | Search returned 0 rows | `SearchOffRounded` (or `SearchRounded` muted) | **Secondary outlined** "Clear search" | Helpful |
| **No matching items** | Filters returned 0 rows | `FilterListRounded` (muted) | **Secondary outlined** "Clear all filters" | Helpful |
| **Unable to load data** | API error / network failure | `ErrorRounded` (**error color**) | **Primary** "Try again" | Recoverable |

**Picking the right one** (decision tree):

```text
totalCount === 0
└─ filters.length === 0 && !search  →  No data yet
└─ filters.length > 0 || search     →  No matching items / No results found
   ├─ search active               →  No results found
   └─ only filters active         →  No matching items

isError                              →  Unable to load data
```

**Shared anatomy** (all four):

```tsx
<Box sx={{ textAlign: 'center', py: 5, px: 2.5, color: 'text.disabled' }}>
  <Icon sx={{ fontSize: 48, mb: 1.5, display: 'block', mx: 'auto', color: 'inherit' }}>
    {/* variant icon */}
  </Icon>
  <Typography variant="h5" sx={{ color: 'text.secondary', mb: 0.75 }}>
    {/* variant heading */}
  </Typography>
  <Typography variant="body2" sx={{ mb: 2 }}>
    {/* variant body */}
  </Typography>
  {/* variant CTA */}
</Box>
```

**Per-variant fills:**

```tsx
// 1. No data yet
<FolderOpenRoundedIcon … />
<Typography variant="h5">No projects yet</Typography>
<Typography variant="body2">Get started by creating your first project</Typography>
<Button variant="contained" startIcon={<AddRoundedIcon />}>Create project</Button>

// 2. No results found
<SearchOffRoundedIcon … />
<Typography variant="h5">No results found</Typography>
<Typography variant="body2">Try adjusting your search or filter to find what you're looking for</Typography>
<Button variant="outlined" onClick={clearSearch}>Clear search</Button>

// 3. No matching items
<FilterListRoundedIcon … />
<Typography variant="h5">No matching items</Typography>
<Typography variant="body2">No items match the current filters</Typography>
<Button variant="outlined" onClick={clearFilters}>Clear all filters</Button>

// 4. Unable to load data
<ErrorRoundedIcon sx={{ color: 'error.main', fontSize: 48, mb: 1.5 }} />
<Typography variant="h5">Unable to load data</Typography>
<Typography variant="body2">There was a problem loading your data</Typography>
<Button variant="contained" onClick={retry}>Try again</Button>
```

**Anti-pattern:**

```tsx
// ❌ Generic "No data" for every situation — agents do this constantly
<Typography>No data</Typography>
```

A "no results from search" miss followed by a "+ Create" button is wrong — the user already has data, they just can't see it.

### 4.7 List view anatomy (mandatory)

> **A list page is not just a styled `<Table>`.** Every list view in this template MUST include the elements below. Do not ship a list page without them.

```
┌────────────────────────────────────────────────────────────────────┐
│  Header                                                            │
│  H2 "Projects" ……………………………………………………  [+ Create New]  │
├────────────────────────────────────────────────────────────────────┤
│  Toolbar                                                           │
│  [ 🔍  Search…              ]   [Status ▾] [Owner ▾]      ⋮     │
├────────────────────────────────────────────────────────────────────┤
│  Active-filter chip row (only when filters are set)               │
│  [Status: Active ×]  [Owner: me ×]                     Clear all  │
├────────────────────────────────────────────────────────────────────┤
│  Table                                                             │
│  …rows…                                                            │
│                                                                    │
│             Rows per page: 10  ·  1–10 of 234   <  >              │
└────────────────────────────────────────────────────────────────────┘
```

**Required elements** (no exceptions, even for small datasets):

| # | Element | Rule |
|---|---|---|
| 1 | Page heading (`<Typography variant="h2">`) + primary action button (`+ Create …`) | Header row, action right-aligned. |
| 2 | **Search input** | Always present. Bound to a server-side `search` filter (no client-side filtering). Debounce 300–500ms. Width: full on `xs`, 280–320px on `sm+`. Placeholder describes scope (e.g., "Search projects…"). |
| 3 | **At least one filter control** | Status / category / owner / date-range — whichever is most useful for the resource. Multi-select where it makes sense. Filters push into Refine's `filters` array, not into component state. |
| 4 | Active-filter chip row | Shown only when ≥1 filter is set. Each chip displays `<field>: <value>` and removes the filter on `×` click. "Clear all" link resets every filter (but keeps search). |
| 5 | The table itself | Styled by the theme (`MuiTable*`). 30px avatar in name cells; status as `<Chip>` (see §3); row hover already wired. |
| 6 | **Pagination** | Server-side. Default 10 rows. "Rows per page · X–Y of N · ‹ ›". Use Refine's `useTable`/`useDataGrid` pagination, not a hand-rolled one. |
| 7 | "**No results**" empty state | If search returns 0 rows, render the "No results found" variant from §4.6. |
| 8 | "**No matching items**" empty state | If filters (not search) return 0 rows, render the "No matching items" variant from §4.6. |
| 9 | "**No data yet**" empty state | If the resource has 0 rows total (not a search/filter miss), render the "No data yet" variant from §4.6. Decide via `totalCount === 0 && filters.length === 0 && !search`. |
| 10 | "**Unable to load**" error state | On API failure, render the error variant from §4.6 with a "Try again" CTA. |
| 11 | **Row hover + selected states** | Hover renders `primary-50` tint (already wired). Selected rows render `primary-50` fill + 2px primary-default left border via `<TableRow selected>` — also already wired in theme. |

**Toolbar element styling** (matches the design system's "Filtering & Search" page):

| Toolbar piece | Styling |
|---|---|
| **Search input** | `<TextField size="small">` with `SearchRoundedIcon` start adornment + `CloseRoundedIcon` end adornment (clear). Placeholder: `Search <resource>, …`. The 16px input font-size + 12×16 padding come from the theme — don't override. |
| **"Filters" button** (popover/dialog trigger) | `<Button variant="outlined" startIcon={<FilterListRoundedIcon />}>Filters</Button>`. Pairs nicely with an inline chip row. |
| **Active filter chip** | `<Chip variant="outlined" color="primary" label="Status: Active" onDelete={…} />`. Reads as `<field>: <value>`. `onDelete` removes only that one filter. |
| **"Clear all" link** | `<Button size="small" variant="text" onClick={clearAll}>Clear all</Button>` at the end of the chip row — text-style so it doesn't compete with the chips. |
| **Pagination footer** | Use Refine's `<DataGrid>` built-in footer. If hand-wiring `useList`, use `<TablePagination>` from MUI — same `Rows per page · X–Y of N · ‹ ›` shape. |

**Implementation — defer to the skill**

This file owns the *visual contract* above. The *Refine wiring* (`useDataGrid` vs `useList`, server-side `filters[]`, debounce timing, `meta.search`, pagination, `noRowsOverlay`) lives in the [`taruvi-refine-providers`](.codex/skills/taruvi-refine-providers/SKILL.md) skill — see its "DataGrid checklist" and `database-provider.md` reference. Read those before writing the page so the wiring stays in sync with the skill rather than drifting in this template.

**Anti-pattern**

```tsx
// ❌ DON'T — bare table, no search, no filters, no pagination
const { result } = useList({ resource: "projects" });
return (
  <Table>
    <TableHead>…</TableHead>
    <TableBody>
      {result.data.map((row) => <TableRow>…</TableRow>)}
    </TableBody>
  </Table>
);
```

If you find yourself writing the above, stop. The diagram above is the contract; the skill is how you implement it.

### 4.8 Confirmation dialog (mandatory for destructive actions)

> **Every destructive action MUST go through a confirmation dialog.** This includes delete, archive, force-remove, permanent revoke, bulk-delete — anything the user cannot trivially undo. A bare `useDelete` call wired to a delete icon without a dialog is a bug.

The design system specifies:

```
┌──────────────────────────────────────────────┐
│  Delete project?                             │  ← Title — Quicksand H4, asks the question
│                                              │
│  Are you sure you want to delete             │  ← Body — body2, plain
│  "Website Redesign"? This action cannot      │     Names the specific item in quotes.
│  be undone.                                  │     States consequence explicitly.
│                                              │
│                     [ Cancel ]  [ Delete ]   │  ← Actions — Cancel left, destructive right
└──────────────────────────────────────────────┘
```

**Rules:**

| # | Rule |
|---|---|
| 1 | Title is a **question** ending in `?` (e.g., "Delete project?", "Archive 5 invoices?") — not a statement. |
| 2 | Body **names the specific item** in quotes when single, or **shows the count** when bulk: *"Are you sure you want to delete 'Website Redesign'?"* / *"Are you sure you want to delete 5 invoices?"* |
| 3 | Body **states the consequence**: "This action cannot be undone." Always. |
| 4 | Primary button is **destructive** (`color="error"`), label matches the verb (`Delete`, `Archive`, `Remove`), never generic "OK". |
| 5 | Cancel button is **outlined/text** secondary, on the **left**. |
| 6 | Body should hint at side effects when applicable: *"This will also remove 12 attachments and 3 comments."* |

**Implementation:**

```tsx
import {
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Button,
} from "@mui/material";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";

<Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
  <DialogTitle>Delete project?</DialogTitle>
  <DialogContent>
    <DialogContentText>
      Are you sure you want to delete <strong>"{project.name}"</strong>?
      This action cannot be undone.
    </DialogContentText>
  </DialogContent>
  <DialogActions>
    <Button variant="outlined" onClick={() => setConfirmOpen(false)}>Cancel</Button>
    <Button variant="contained" color="error" startIcon={<DeleteRoundedIcon />} onClick={handleDelete}>
      Delete project
    </Button>
  </DialogActions>
</Dialog>
```

**Anti-pattern:**

```tsx
// ❌ DON'T — instant delete on click, no chance to cancel
<IconButton onClick={() => deleteRecord(id)}>
  <DeleteRoundedIcon />
</IconButton>

// ❌ DON'T — generic confirm()
onClick={() => { if (confirm("Are you sure?")) deleteRecord(id) }}

// ❌ DON'T — confirmation but the primary button is "OK" instead of the verb
<Button>OK</Button>     // doesn't match what the user is actually doing
```

For **bulk** confirmations, the body should reflect the count: *"Are you sure you want to delete **5 projects**? This action cannot be undone."* — and the primary CTA should read `Delete 5 projects` so the user re-reads the count right before clicking.

### 4.9 Bulk actions toolbar (mandatory when list supports selection)

> **If a list page has a selection checkbox column, it MUST have a bulk-actions toolbar** that appears when ≥1 row is selected. Without it, the checkbox is a dead control.

Two visual variants — both are spec'd, pick by emphasis:

**Primary variant** (high-emphasis — full-width primary-blue bar):

```
┌────────────────────────────────────────────────────────────────────┐
│  3 items selected                          [ Export ] [ Delete ] × │  ← bg: button.primaryDefault
└────────────────────────────────────────────────────────────────────┘   text: white, buttons: outlined-white
```

**Subtle variant** (light primary-50 background — use when the toolbar sits inside a card or under tabs and would feel loud at full blue):

```
┌────────────────────────────────────────────────────────────────────┐
│  5 items selected                          ↓ Export   🗑 Delete  × │  ← bg: primary[50]
└────────────────────────────────────────────────────────────────────┘   text: primary, buttons: text-style
```

**Rules:**

| # | Rule |
|---|---|
| 1 | Show **only when** ≥1 row is selected. Hidden otherwise. |
| 2 | Display the **count explicitly** (`3 items selected`, not "Selected"). |
| 3 | Provide a clear way to **clear the selection** (the `×` on the right). |
| 4 | Destructive bulk actions (Delete, Archive, Force-revoke) use **destructive styling** (red text/border) AND **route through §4.8 confirmation dialog** with the count in the body. |
| 5 | Position **above or below the list**, not floating. Above is more discoverable; below avoids pushing the table down on every selection. |
| 6 | Keep the set of bulk actions short (3 max — Export / Edit / Delete is typical). Overflow → "More actions" `⋮` menu. |

**Implementation (primary variant):**

```tsx
import { Box, Stack, Button, IconButton, Typography } from "@mui/material";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

{selectedIds.length > 0 && (
  <Box sx={{
    bgcolor: 'primary.main', color: 'primary.contrastText',
    borderRadius: 1.25, px: 2, py: 1, mb: 2,
    display: 'flex', alignItems: 'center', gap: 2,
  }}>
    <Typography sx={{ flex: 1, fontWeight: 600 }}>
      {selectedIds.length} item{selectedIds.length === 1 ? '' : 's'} selected
    </Typography>
    <Stack direction="row" spacing={1}>
      <Button variant="outlined" startIcon={<DownloadRoundedIcon />}
        sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.5)' }} onClick={onExport}>
        Export
      </Button>
      <Button variant="outlined" startIcon={<DeleteRoundedIcon />}
        sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.5)' }}
        onClick={() => setConfirmBulkDelete(true)}>
        Delete
      </Button>
      <IconButton sx={{ color: 'inherit' }} onClick={() => setSelectedIds([])}>
        <CloseRoundedIcon />
      </IconButton>
    </Stack>
  </Box>
)}
```

**Anti-pattern:**

```tsx
// ❌ DON'T — checkbox column with no toolbar
<DataGrid checkboxSelection />     // user can select but can't do anything with the selection

// ❌ DON'T — bulk delete without confirmation
<Button onClick={() => deleteMany(selectedIds)}>Delete</Button>
```

### 4.10 Loading states (mandatory when fetching data)

> **Never leave a page blank while data loads.** Use one of the three patterns below.

| Variant | When | Look |
|---|---|---|
| **Skeleton loader** | Initial list / card / table load — placeholder for content that will fill in shortly | Light gray animated bars matching the shape of rows/cells |
| **Spinner overlay** | Mid-page action that takes >300ms — refresh, filter change, big query | Centered `<CircularProgress />` + "Loading data…" subtitle, inside the card's body area (not full-screen) |
| **Inline button spinner** | Async button click — submitting a form, executing a function | Replace the button label with `<CircularProgress size={16} />` and disable the button |

**Skeleton (table rows):**

```tsx
import { Skeleton, TableRow, TableCell } from "@mui/material";

{isLoading
  ? Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>
        {columns.map((c) => (
          <TableCell key={c.field}>
            <Skeleton variant="text" />
          </TableCell>
        ))}
      </TableRow>
    ))
  : rows.map((row) => <TableRow key={row.id}>…</TableRow>)
}
```

**Skeleton (card grid):**

```tsx
<Skeleton variant="rounded" height={180} sx={{ borderRadius: 2 }} />
```

**Spinner overlay (inside a card):**

```tsx
{isLoading && (
  <Stack sx={{ alignItems: 'center', justifyContent: 'center', py: 8 }} spacing={1.5}>
    <CircularProgress />
    <Typography variant="body2" color="text.disabled">Loading data…</Typography>
  </Stack>
)}
```

**Inline button spinner:**

```tsx
<Button variant="contained" disabled={isSubmitting} startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : undefined}>
  {isSubmitting ? 'Saving…' : 'Save Changes'}
</Button>
```

**Anti-pattern:**

```tsx
// ❌ DON'T — blank table or "Loading..." text only
{isLoading ? <p>Loading...</p> : <DataGrid rows={rows} />}

// ❌ DON'T — full-screen modal spinner that blocks the entire app for a 400ms query
<Backdrop open={isLoading}><CircularProgress /></Backdrop>
```

Refine wiring: `useList` / `useDataGrid` expose `query.isLoading` for initial load and `query.isFetching` for refetches — use the appropriate one (skeleton for `isLoading`, subtle overlay or grayed table for `isFetching`).

### 4.11 Show / Detail page anatomy (mandatory)

> **A show page is not just a list of fields.** Every detail page MUST include the elements below — same enforcement principle as §4.7 list anatomy.

```
┌────────────────────────────────────────────────────────────────────┐
│  Breadcrumb                                                        │
│  📁 Projects  /  Website Redesign                                  │  ← §4.7 toolbar style; current page bold
├────────────────────────────────────────────────────────────────────┤
│  Header                                                            │
│  H2  Website Redesign      [IN PROGRESS]    [Edit] [Delete] [⋮]  │  ← title + status chip + actions
│  Mar 1, 2026 – Jun 30, 2026 · Owner: Sarah Johnson                 │  ← meta line, body2 muted
├────────────────────────────────────────────────────────────────────┤
│  Tabs (when there is related data)                                 │
│  [ Overview ]  [ Tasks (12) ]  [ Files (4) ]  [ Activity ]        │  ← Tabs + count in label
├────────────────────────────────────────────────────────────────────┤
│  Active tab body                                                   │
│  …field rows, related-record cards, sub-lists…                     │
└────────────────────────────────────────────────────────────────────┘
```

**Required elements:**

| # | Element | Rule |
|---|---|---|
| 1 | **Breadcrumb** | Always present. Last segment = current resource (bold, larger — wired in theme). Provides escape route up. |
| 2 | **Page heading** (H2) | The entity's primary identifier. |
| 3 | **Status chip** next to title | If the resource has a status field, render it here too — not just in the table. |
| 4 | **Action cluster** (Edit / Delete / More) | Right-aligned, in the header. Delete goes through §4.8 confirmation dialog. |
| 5 | **Meta line** below title | Body2, muted: date range, owner, created/updated, anything else that identifies the record at a glance. |
| 6 | **Tabs** when there are related records | Format: `Label (count)` — e.g., `Tasks (12)`. Skip tabs only if the page truly has one block of content. |
| 7 | **Empty states** for related-record tabs | Same four-variant decision tree from §4.6. |
| 8 | **Loading states** | Same three variants from §4.10. |

**Anti-pattern:**

```tsx
// ❌ DON'T — bare field dump
<Stack>
  <Typography>Name: {project.name}</Typography>
  <Typography>Status: {project.status}</Typography>
  <Typography>Owner: {project.owner_name}</Typography>
</Stack>
```

Use Refine's `<Show>` from `@refinedev/mui` as the header scaffold — it gives you the breadcrumb + title + action buttons for free.

### 4.12 Table column-type rules

The design system specifies how each column type should behave. Apply these whenever you build a list — including `<DataGrid>` `colDef` and hand-written `<TableCell>` rows.

| Column type | Alignment | Format / behavior |
|---|---|---|
| **Text** | Left | Truncate with ellipsis + `<Tooltip>` showing the full value on hover |
| **Number** / **Currency** / **Percentage** | **Right** | Consistent format — currency: `$5,000,000` (with separators); percentages: `87%`; integers: `1,234` |
| **Date** | Left | `MMM DD, YYYY` (e.g., `Mar 30, 2026`) — never raw ISO, never mixed formats in the same table |
| **Status** | Left | `<Chip>` from §3 — never a plain colored dot or text |
| **Selection** (bulk-action checkbox) | **Left** edge | First column, fixed narrow width |
| **Actions** (icon-only buttons) | **Right** edge | Last column, fixed narrow width. Tooltip on every icon. |
| **Avatar + name** | Left | 30px avatar (from §8) + name on one line; if the name links to the show page, render as a link, not the row click |

**Column count:** keep visible columns to **5–6 optimal**. More columns → use a column picker, condense to fewer, or move secondary data to the show page.

**Empty cell value:** render an em-dash `—`, never an empty string or `null`. Aligns visually with present values.

```tsx
const columns: GridColDef[] = [
  { field: "name", headerName: "Project Name", flex: 1.2,
    renderCell: (p) => <Tooltip title={p.value}><span>{p.value}</span></Tooltip> },
  { field: "status", headerName: "Status", width: 140,
    renderCell: (p) => <Chip label={p.value} color="info" /> },
  { field: "due", headerName: "Due Date", width: 140,
    valueFormatter: (v) => v ? format(new Date(v), "MMM dd, yyyy") : "—" },
  { field: "amount", headerName: "Amount", width: 140, align: "right", headerAlign: "right",
    valueFormatter: (v) => v != null ? `$${v.toLocaleString()}` : "—" },
  { field: "actions", type: "actions", width: 120, align: "right",
    getActions: (p) => [
      <GridActionsCellItem icon={<Tooltip title="Edit"><EditRoundedIcon /></Tooltip>} label="Edit" onClick={…} />,
      <GridActionsCellItem icon={<Tooltip title="Delete"><DeleteRoundedIcon /></Tooltip>} label="Delete" onClick={…} />,
    ],
  },
];
```

### 4.13 Entity card (kanban / dashboard alternative to a row)

When a list visualization makes more sense as **cards** than rows (kanban boards, dashboard widgets, gallery views, mobile-first lists), use this anatomy. Same data, different framing.

```
┌────────────────────────────────────┐
│  Title (H5)                      ⋮ │  ← H5 + overflow menu
│  Short description (body2 muted)   │
│                                    │
│  [IN PROGRESS] [HIGH] [Design]     │  ← status + priority + tag chips
│                                    │
│  Due: Mar 30, 2026     ✎ 🗑       │  ← meta + actions (icon-only)
└────────────────────────────────────┘
```

```tsx
<Card sx={{ p: 0 /* theme adds 28px; override if you want tighter */ }}>
  <CardContent>
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 1 }}>
      <Typography variant="h5">{project.name}</Typography>
      <IconButton size="small"><MoreVertRoundedIcon /></IconButton>
    </Stack>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      {project.description}
    </Typography>
    <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
      <Chip label={project.status} color="info" />
      <Chip variant="outlined" label={project.priority} color="error" />
      <Chip label={project.category} sx={{ bgcolor: tagBg, color: tagText }} />
    </Stack>
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <Typography variant="body2" color="text.secondary">
        Due: {format(project.due, "MMM dd, yyyy")}
      </Typography>
      <Stack direction="row">
        <IconButton size="small" onClick={onEdit}><EditRoundedIcon fontSize="small" /></IconButton>
        <IconButton size="small" color="error" onClick={onDelete}><DeleteRoundedIcon fontSize="small" /></IconButton>
      </Stack>
    </Stack>
  </CardContent>
</Card>
```

**When to use cards vs. rows:**

| Use rows (§4.7) when | Use cards (§4.13) when |
|---|---|
| User needs to scan many records by column | User needs to see records one-at-a-time with context |
| Sorting / filtering is the primary interaction | Drag-and-drop, kanban, or visual grouping is primary |
| Mobile is secondary | Mobile is the primary target |
| Most data is short scalars (name, status, date) | Records have rich content (cover image, multiple chips, long description) |

Don't mix the two in the same page — pick one.

---

## 5. Icons

The design system uses **Material Icons Rounded**. With `@mui/icons-material`, that means the **`*Rounded`** variant import:

```tsx
// ✅ Matches design system
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';

// ❌ Filled variant — different visual weight
import EditIcon from '@mui/icons-material/Edit';
```

### Icon size standards

| Context | Size | Example |
|---|---|---|
| Inline / compact | 20px | `<Icon sx={{ fontSize: 20 }} />` |
| Standard (buttons, nav) | 24px | default MUI size |
| Feature card / empty state | 32px+ | `<Icon sx={{ fontSize: 48 }} />` |

The CSS-based `<span class="material-icons-round">name</span>` font is also loaded in `index.html`, so if you need to render Material Icons by string name (e.g. dynamic icons from API data) you can use the span fallback.

---

## 6. NavKit variants

`@taruvi/navkit` provides the top navigation. The design system defines three variants:

| Variant | Background | Text / icons | Border / accent |
|---|---|---|---|
| Blue (default) | `#2b97ff` | White | — |
| White | `#ffffff` | `#101828` | Border `#e5e7eb` |
| Dark | `#004369` | `#9de5fd` (accent) | — |

NavKit handles its own theming via the `getTheme` callback in [App.tsx](src/App.tsx) — pick the variant in NavKit settings, not in the MUI theme.

---

## 7. Sidebar dimensions

The design specifies fixed widths:

| State | Width |
|---|---|
| Collapsed | 72px |
| Expanded | 240px (template uses 240 — design ref shows 200) |

These are constants in [MuiSidenav.tsx](src/components/sidenav/MuiSidenav.tsx): `DRAWER_WIDTH_EXPANDED` / `DRAWER_WIDTH_COLLAPSED`. Active items already pick up the `#1976d2` brand via the theme.

---

## 8. Avatars in tables vs. nav

| Context | Size |
|---|---|
| In a table row | **30px** — set explicitly: `<Avatar sx={{ width: 30, height: 30, fontSize: 11 }}>SJ</Avatar>` |
| In the nav bar / sidebar | **34px** — theme default, no overrides needed |

---

## 9. Charts (Recharts / Chart.js / canvas)

MUI theme cannot reach into Recharts. Use the **chart palette** explicitly from `taruviTokens.status`:

```tsx
const chartColors = {
  open:        taruviTokens.status.open,         // #19b3e5
  inProgress:  taruviTokens.status.inProgress,   // #1976d2
  underReview: taruviTokens.status.underReview,  // #FF8C00
  resolved:    taruviTokens.status.resolved,     // #008751
  delayed:     taruviTokens.status.delayedAlt,   // #C71585
  onHold:      taruviTokens.status.onHoldAlt,    // #8B1A72
  primary:     taruviTokens.status.chartPrimary, // #1e88f5
};
```

### Chart labeling standards (from spec)

- **Legend**: top-right or bottom-center · Open Sans 12px · 12×12 markers · 8–12px gaps
- **Axis labels**: Open Sans 11px · color `#000` (light) for contrast · Y-axis starts at 0
- **Gridlines**: `#e0e0e0`, 1px dashed
- **Chart title**: Quicksand 600 16–18px, top-left aligned
- **Subtitle**: Open Sans 12–13px, `#666`

### Heatmap palette

Bicolor interpolation: light corner `rgb(230,245,254)` → mid `rgb(25,139,229)` → dark `rgb(0,55,181)`. Render text at `#fff` for cells > 60% of max, `#003652` otherwise.

---

## 10. WCAG / accessibility

| Level | Contrast ratio |
|---|---|
| AA (text) | min 4.5 : 1 |
| AAA (text) | 7 : 1 |
| Chart elements | min 3 : 1 |

Verify charts with Color Oracle or Coblis (color-blindness simulators). The chip palette is already AA-compliant against the design backgrounds; the chart palette is AA against white.

---

## 11. Where things live

| What | Where |
|---|---|
| Color ramps, font sizes, radii, paddings, shadows | [themeOptions.ts](themeOptions.ts) — exported as `taruviTokens` |
| MUI component overrides | [themeOptions.ts](themeOptions.ts) — `componentOverrides(mode)` |
| Active theme provider | [src/contexts/color-mode/index.tsx](src/contexts/color-mode/index.tsx) |
| Global font loading | [index.html](index.html) |
| Global body / scrollbar styles | [src/App.tsx](src/App.tsx) — `<GlobalStyles>` |
| Sidebar geometry | [src/components/sidenav/MuiSidenav.tsx](src/components/sidenav/MuiSidenav.tsx) |
| Brand cover (Home) | [src/pages/home/index.tsx](src/pages/home/index.tsx) |

When you need a value the theme doesn't surface (a gradient, an explicit hex for a one-off illustration), import `taruviTokens` rather than hardcoding hex strings — it keeps the design system traceable.
