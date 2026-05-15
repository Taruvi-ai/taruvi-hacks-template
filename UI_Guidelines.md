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

For **category / tag chips**:

```tsx
// Filled
<Chip label="Design" sx={{ bgcolor: '#E0F6FE', color: '#004369', fontFamily: 'Quicksand', fontWeight: 700 }} />
// Outlined
<Chip variant="outlined" label="Frontend" sx={{ color: '#1976d2', borderColor: '#1976d2' }} />
```

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

The design uses a 2-column grid for paired inputs and a "form section title" header. Wire it as:

```tsx
{/* Form section title — Quicksand 600 13px UPPERCASE 0.05em, muted */}
<Typography sx={{
  fontFamily: 'Quicksand', fontSize: 13, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.05em',
  color: 'text.disabled', mt: 3, mb: 1.75,
}}>Edit Task</Typography>

{/* Form row — two columns, 16px gap */}
<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
  <TextField label="Start Date" type="date" />
  <TextField label="End Date" type="date" required />
</Box>

{/* Form actions — right-aligned, 10px gap, 24px top margin */}
<Stack direction="row" spacing={1.25} sx={{ mt: 3, justifyContent: 'flex-end' }}>
  <Button variant="outlined">Cancel</Button>
  <Button variant="contained">Save</Button>
</Stack>
```

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

### 4.6 Empty state

```tsx
<Box sx={{ textAlign: 'center', py: 5, px: 2.5, color: 'text.disabled' }}>
  <Icon sx={{ fontSize: 48, mb: 1.5, display: 'block', mx: 'auto' }}>folder_open</Icon>
  <Typography variant="h5" sx={{ color: 'text.secondary', mb: 0.75 }}>No projects yet</Typography>
  <Typography variant="body2" sx={{ mb: 2 }}>Get started by creating your first project</Typography>
  <Button variant="contained">Create project</Button>
</Box>
```

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
