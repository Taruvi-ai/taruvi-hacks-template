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

You do **not** need to set these manually anywhere — they apply across every component.

> **Note on radii**: this template intentionally runs the `radius.*` token block ~50% softer than the raw design-system values (e.g. cards at 10px instead of 16px, buttons at 4px instead of 8px). The table below lists the **actual rendered** values. If you see "design spec says X" callouts inside `themeOptions.ts`, they refer to the original — the radius block is the only deliberate deviation.

| Surface | Spec | Where applied |
|---|---|---|
| Body font | Open Sans, 13px, line-height 1.6 | `MuiCssBaseline` |
| Heading font | Quicksand (H1 800 / H2–H6 700) | `typography.h1…h6` |
| Buttons | Quicksand 700 UPPERCASE, 4px radius, sm/md/lg = 6·14 / 10·20 / 14·28 px, min-h 28/36/44, **44px on `(pointer: coarse)` for mobile WCAG** | `MuiButton` |
| Chips | Pill (999), Quicksand 700 UPPERCASE 0.06em, h 24 / sm 20 | `MuiChip` |
| **Tag chips (rotation)** | 4 pastel `variant="tagBlue"/"tagPurple"/"tagGreen"/"tagOrange"` — no `sx` needed | `MuiChip` variants |
| Cards | 10px radius, 28px padding, `0 2px 12px rgba(0,0,0,0.07)` shadow | `MuiCard` / `MuiCardContent` |
| Card title | Quicksand 600 12px UPPERCASE 0.05em, 16px margin-bottom | `MuiCardHeader.title` |
| Inputs | 6px radius, `#F3F3F5` fill, **12×16 padding, 16px font**, 2px focus ring, opacity-0.5 disabled, muted read-only | `MuiOutlinedInput` |
| Form label | Open Sans 600 13px, asterisk in error | `MuiInputLabel` / `MuiFormLabel` |
| Helper / error text | 11px, muted / error | `MuiFormHelperText` |
| **Accordion** (collapsible section) | Flat (no shadow), no top divider, 6px radius, 13px summary | `MuiAccordion*` |
| Tables (plain) | 8px wrapper, head 11px Quicksand 700 UPPERCASE, cell 13px 12×16, row hover `primary-50`, **selected = primary-50 + 2px primary left border** | `MuiTable*` |
| **DataGrid** | Mirrors the plain Table styling — same 8px wrapper, same head font, same 12×16 cells, same hover + selected states, same footer divider | `MuiDataGrid` |
| Alerts | 6px radius, 14·18 padding, 4px colored left border | `MuiAlert` |
| Breadcrumbs | 14px body, **16px / 600** for current item | `MuiBreadcrumbs` |
| Sidebar items | 10·12 padding, 4px radius, Quicksand 600, active = `#1976d2` white | `MuiListItemButton` |
| Tooltip | 6px radius, dark `#121414` | `MuiTooltip` |
| Tabs | Quicksand 700 UPPERCASE, 3px primary indicator | `MuiTabs` / `MuiTab` |
| Dialog | 10px radius, 28px padding, design-system shadow | `MuiDialog` |
| **Dialog body text** | body2 size, secondary color (used by §4.8 confirmation dialog) | `MuiDialogContentText` |
| Avatar (default) | 34×34, Quicksand 700, 13px | `MuiAvatar` |
| **Skeleton** | Wave animation, theme-tinted bg (neutral-100 / dark equivalent) | `MuiSkeleton` |
| **CircularProgress** | Default `color="primary"` (use `size={16}` inline in buttons) | `MuiCircularProgress` |
| Focus ring | `0 0 0 2px rgba(30,136,229,0.35)` (2px solid ring) | inputs, focus-visible |

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

`MuiChip` ships 4 status-friendly color slots; map the design system's 6 statuses onto them. ON HOLD and TO DO have no slot — pass `sx` colors directly.

| Status | Usage |
|---|---|
| COMPLETE / ACTIVE | `<Chip color="success" label="COMPLETE" />` |
| IN PROGRESS | `<Chip color="info" label="IN PROGRESS" />` |
| REVIEW / PLANNING | `<Chip color="warning" label="REVIEW" />` |
| DELAYED / CANCELLED | `<Chip color="error" label="DELAYED" />` |
| ON HOLD | `<Chip label="ON HOLD" sx={{ bgcolor: '#7b1fa2', color: '#fff' }} />` |
| TO DO | `<Chip label="TO DO" sx={{ bgcolor: '#00acc1', color: '#fff' }} />` |

**Priority** (outlined):

```tsx
<Chip variant="outlined" color="error"   label="HIGH" />
<Chip variant="outlined" color="warning" label="MEDIUM" />
<Chip variant="outlined" color="success" label="LOW" />
```

**Category / tag chips** — pastel rotation, wired as 4 `MuiChip` variants. Use directly; no `sx` needed:

```tsx
<Chip variant="tagBlue"   label="Design" />        // #E0F6FE / #004369
<Chip variant="tagPurple" label="Development" />   // #EDE7F6 / #4527A0
<Chip variant="tagGreen"  label="Marketing" />     // #E8F5E9 / #1B5E20
<Chip variant="tagOrange" label="Research" />      // #FFF3E0 / #E65100
```

For deterministic rotation by tag name, hash → variant:

```tsx
const TAG_VARIANTS = ['tagBlue', 'tagPurple', 'tagGreen', 'tagOrange'] as const;
const variantForTag = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return TAG_VARIANTS[Math.abs(h) % TAG_VARIANTS.length];
};
<Chip variant={variantForTag(tag)} label={tag} />
```

Raw values are also exposed at `taruviTokens.tagPalette[i]` for non-Chip surfaces. Outlined tags use a single brand-blue: `<Chip variant="outlined" label="Frontend" sx={{ color: '#1976d2', borderColor: '#1976d2' }} />`.

> **Don't** use the rotation palette for status — rotation = "different from each other"; status colors = "different in severity".

---

## 4. Page-level layout patterns (not in the theme)

The theme styles components but doesn't dictate page composition. Use these patterns.

### 4.1 Page container

```tsx
<Container maxWidth="lg" sx={{ py: 6, px: 4 }}>  {/* 48px y, 32px x — matches design `.container` */}
  …
</Container>
```

### 4.3 Form layout

Single-column by default; 2-column only for related paired inputs (Start/End, Status/Priority, City/Country). The theme handles input visuals — this section covers what you do by hand.

**Vertical rhythm** (exposed as `taruviTokens.spacing.*`):

| | px | Token |
|---|---|---|
| Label → input | 8 | `formLabelToInput` |
| Input → helper / error | 4 | `formInputToHelper` |
| Field ↔ field | 16 | `formFieldGap` |
| Section ↔ section | 32 | `formSectionGap` |
| Form actions top margin | 24 | `formActionsMt` |
| Cancel ↔ Save gap | 10 | `formActionsGap` |

**Section title** above each group:

```tsx
<Typography sx={{ fontFamily: 'Quicksand', fontSize: 13, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.05em',
  color: 'text.disabled', mt: 4, mb: 1.75 }}>Contact Information</Typography>
```

**Two-column row** (stacks on mobile):

```tsx
<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
  <TextField label="Start Date" type="date" />
  <TextField label="End Date" type="date" required />
</Box>
```

**Label conventions**: `Title *` (`<TextField required />` adds the asterisk, themed error-color) · `Updated End Date (Optional)` when most fields are required · helper text for guidance/limits (`0/500 characters`, `Cannot modify after creation`) · error text replaces helper text and turns the border error-color automatically.

**Form actions** — Cancel left, primary right, right-aligned:

```tsx
<Stack direction="row" spacing={1.25} sx={{ mt: 3, justifyContent: 'flex-end' }}>
  <Button variant="outlined">Cancel</Button>
  <Button variant="contained">Save Changes</Button>
</Stack>
```

**Collapsible section** (theme handles the flat look — no `sx` needed):

```tsx
<Accordion>
  <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>Additional Notes (Optional)</AccordionSummary>
  <AccordionDetails><TextField label="Notes" multiline rows={4} fullWidth /></AccordionDetails>
</Accordion>
```

**Accessibility (verify before shipping):**

- Every input has a label via `<TextField label="…">` (MUI wires `htmlFor`).
- Right `type=` (`email`/`tel`/`number`/`date`/`url`/`password`) so mobile shows the right keyboard.
- Error messages are specific (`Email must include @`) — never `Invalid input`.
- Tab order works; `Enter` submits; theme tokens are WCAG AA (don't override colors blindly).
- `<TextField helperText="…">` and `required` give you `aria-describedby` and `aria-required` for free; wire them yourself only for custom fields.

### 4.4 Hero / cover gradient

Used on the Home page only — see [`src/pages/home/index.tsx`](src/pages/home/index.tsx) for the canonical example (sky-blue gradient + Quicksand 300 cover title).

### 4.6 Empty states — four variants

Pick the variant by trigger; never use a generic "no data" for all four.

| Variant | When | Icon | Heading / body | CTA |
|---|---|---|---|---|
| **No data yet** | `total===0 && !search && !filters` | `FolderOpenRounded` (resource icon) | "No projects yet" · "Get started by creating your first project" | `<Button variant="contained">+ Create project</Button>` |
| **No results found** | search active, 0 rows | `SearchOffRounded` (muted) | "No results found" · "Try adjusting your search or filter" | `<Button variant="outlined" onClick={clearSearch}>Clear search</Button>` |
| **No matching items** | filters active, 0 rows | `FilterListRounded` (muted) | "No matching items" · "No items match the current filters" | `<Button variant="outlined" onClick={clearFilters}>Clear all filters</Button>` |
| **Unable to load** | `isError` | `ErrorRounded` (error color) | "Unable to load data" · "There was a problem loading your data" | `<Button variant="contained" onClick={retry}>Try again</Button>` |

**Shared anatomy** (substitute the icon / heading / body / CTA from the row above):

```tsx
<Box sx={{ textAlign: 'center', py: 5, px: 2.5, color: 'text.disabled' }}>
  <Icon sx={{ fontSize: 48, mb: 1.5, display: 'block', mx: 'auto' }} />
  <Typography variant="h5" sx={{ color: 'text.secondary', mb: 0.75 }}>{heading}</Typography>
  <Typography variant="body2" sx={{ mb: 2 }}>{body}</Typography>
  {cta}
</Box>
```

> **Anti-pattern**: a "no results from search" miss followed by a "+ Create" CTA — the user already has data, they just can't see it. Use the **No results found** variant.

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

> Every destructive action (delete, archive, force-remove, bulk-delete) **MUST** go through a confirmation dialog. A bare `useDelete` wired to a delete icon is a bug.

**Rules:**

1. Title is a **question** ending in `?` — e.g., "Delete project?", "Archive 5 invoices?". Not a statement.
2. Body **names the item** (single: `"Website Redesign"`) or **shows the count** (bulk: `5 projects`), and always ends `…This action cannot be undone.` Hint at cascades when relevant.
3. Primary button: `color="error"`, label = the verb (`Delete project`, never `OK`). Cancel is outlined and goes on the **left**.

```tsx
<Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
  <DialogTitle>Delete project?</DialogTitle>
  <DialogContent>
    <DialogContentText>
      Are you sure you want to delete <strong>"{project.name}"</strong>? This action cannot be undone.
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

> **Bulk variant**: title `Delete N projects?`, body names the count, CTA reads `Delete N projects` — so the user re-reads the count before clicking.

**Anti-patterns**: instant delete on click · `window.confirm()` · primary button labelled "OK".

### 4.9 Bulk actions toolbar (mandatory when list supports selection)

> If a list has selection checkboxes, it **MUST** have a bulk-actions toolbar that appears on selection — otherwise the checkboxes are dead controls.

```
┌────────────────────────────────────────────────────────────────────┐
│  3 items selected                          [ Export ] [ Delete ] × │  bg: primary.main, white text
└────────────────────────────────────────────────────────────────────┘
```

**Rules:** show only when ≥1 row selected · always display the count · `×` clears selection · destructive bulk actions route through §4.8 (with the count in the dialog body) · 3 actions max (overflow → `⋮`) · sit above or below the list, not floating.

> **Subtle variant**: same layout, swap `bgcolor: 'primary.main'` for `'primary.50'` and use text-style buttons. Pick when the bar sits inside a card and full-blue feels loud.

```tsx
{selectedIds.length > 0 && (
  <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText',
             borderRadius: 1.25, px: 2, py: 1, mb: 2,
             display: 'flex', alignItems: 'center', gap: 2 }}>
    <Typography sx={{ flex: 1, fontWeight: 600 }}>
      {selectedIds.length} item{selectedIds.length === 1 ? '' : 's'} selected
    </Typography>
    <Button variant="outlined" sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.5)' }}
      startIcon={<DownloadRoundedIcon />} onClick={onExport}>Export</Button>
    <Button variant="outlined" sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.5)' }}
      startIcon={<DeleteRoundedIcon />} onClick={() => setConfirmBulkDelete(true)}>Delete</Button>
    <IconButton sx={{ color: 'inherit' }} onClick={() => setSelectedIds([])}>
      <CloseRoundedIcon />
    </IconButton>
  </Box>
)}
```

**Anti-patterns**: `<DataGrid checkboxSelection />` with no toolbar · bulk delete without §4.8 confirmation.

### 4.10 Loading states (mandatory when fetching data)

> Never leave a page blank while data loads. Pick by intent:

| Variant | Use when | Snippet |
|---|---|---|
| **Skeleton** | Initial list / card / table load (`query.isLoading`) | `<Skeleton variant="text" />` inside each cell, or `<Skeleton variant="rounded" height={180} />` per card |
| **Spinner overlay** | Mid-action refetch >300ms (`query.isFetching`) — refresh, filter change | `<Stack sx={{ alignItems: 'center', py: 8 }}><CircularProgress /><Typography variant="body2" color="text.disabled">Loading data…</Typography></Stack>` (inside the card, not full-screen) |
| **Inline button spinner** | Async submit / function call | `<Button disabled={isSubmitting} startIcon={isSubmitting && <CircularProgress size={16} color="inherit" />}>{isSubmitting ? 'Saving…' : 'Save'}</Button>` |

Skeleton table rows:

```tsx
{isLoading
  ? Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i}>{columns.map((c) => (
        <TableCell key={c.field}><Skeleton variant="text" /></TableCell>
      ))}</TableRow>
    ))
  : rows.map((row) => <TableRow key={row.id}>…</TableRow>)
}
```

**Anti-patterns**: `"Loading..."` text only · full-screen `<Backdrop>` for a 400ms query.

### 4.11 Show / Detail page anatomy (mandatory)

> A show page is not just a list of fields. Every detail page **MUST** include the elements below.

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📁 Projects / Website Redesign                                      │ ← Breadcrumb (current = bold)
│                                                                     │
│ H2 Website Redesign    [IN PROGRESS]      [Edit] [Delete] [⋮]      │ ← Title · status chip · actions
│ Mar 1 – Jun 30, 2026 · Owner: Sarah Johnson                         │ ← Meta line, body2 muted
│                                                                     │
│ [ Overview ]  [ Tasks (12) ]  [ Files (4) ]  [ Activity ]          │ ← Tabs (label + count)
│                                                                     │
│ …active tab body…                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

**Required**: breadcrumb · H2 title · status chip beside title (when the resource has status) · Edit/Delete/More right-aligned (Delete → §4.8) · meta line below title · tabs as `Label (count)` when there's related data · empty states per §4.6 for empty tabs · loading per §4.10. Use Refine's `<Show>` from `@refinedev/mui` for the header scaffold.

> **Anti-pattern**: bare `<Stack>` of `Name: …` / `Status: …` field rows.

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
| **Avatar + name** | Left | 30px avatar (`sx={{ width: 30, height: 30, fontSize: 11 }}`) + name on one line; if the name links to the show page, render as a link, not the row click |

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

Same data as a row, different framing. Use cards when records are mobile-first, drag-and-droppable, or richer than scalars.

```
┌────────────────────────────────────┐
│  Title (H5)                      ⋮ │
│  Short description (body2 muted)   │
│  [IN PROGRESS] [HIGH] [Design]     │ ← status + priority + tag chips
│  Due: Mar 30, 2026     ✎ 🗑       │
└────────────────────────────────────┘
```

```tsx
<Card>
  <CardContent>
    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
      <Typography variant="h5">{project.name}</Typography>
      <IconButton size="small"><MoreVertRoundedIcon /></IconButton>
    </Stack>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{project.description}</Typography>
    <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
      <Chip label={project.status} color="info" />
      <Chip variant="outlined" label={project.priority} color="error" />
      <Chip variant="tagBlue" label={project.category} />
    </Stack>
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant="body2" color="text.secondary">Due: {format(project.due, "MMM dd, yyyy")}</Typography>
      <Stack direction="row">
        <IconButton size="small" onClick={onEdit}><EditRoundedIcon fontSize="small" /></IconButton>
        <IconButton size="small" color="error" onClick={onDelete}><DeleteRoundedIcon fontSize="small" /></IconButton>
      </Stack>
    </Stack>
  </CardContent>
</Card>
```

**Rows vs cards** — pick one, don't mix:

| Rows (§4.7) | Cards (§4.13) |
|---|---|
| Scanning many records by column | One-at-a-time with context |
| Sort/filter is primary | Drag-and-drop, kanban, visual grouping |
| Data is short scalars | Records have rich content (image, multiple chips, long text) |

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

| Context | Size |
|---|---|
| Inline / compact | 20px |
| Standard (buttons, nav) | 24px (MUI default) |
| Feature card / empty state | 32px+ |

---

## 6. NavKit & sidebar

NavKit (top nav, from `@taruvi/navkit`) ships three color variants — Blue `#2b97ff` (default), White (`#fff` + `#e5e7eb` border), Dark `#004369` (accent `#9de5fd`). Pick the variant in NavKit's `getTheme` callback in [`src/App.tsx`](src/App.tsx), not the MUI theme.

Sidebar widths are constants in [`src/components/sidenav/MuiSidenav.tsx`](src/components/sidenav/MuiSidenav.tsx): collapsed 72px, expanded 240px. Active items pick up `#1976d2` via the theme.

---

## 7. Charts (Recharts / Chart.js / canvas)

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

## 8. WCAG / accessibility

WCAG AA = 4.5:1 contrast on text, 3:1 on chart elements. The theme tokens and chip palette are AA-compliant against the design backgrounds — don't override colors blindly.

---

## 9. Where things live

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
