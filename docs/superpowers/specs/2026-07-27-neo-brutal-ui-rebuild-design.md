# Neo-Brutal UI Rebuild

**Date:** 2026-07-27  
**Scope:** CSS-only rebuild — all `.css` files, `tokens.css`, `reset.css`, `neo-brutal.css`, plus targeted TSX edits to eliminate inline styles. No changes to `api.ts`, routing, or component logic.

---

## Goals

- Consistent, correctly-applied neo-brutal aesthetic across all pages and components
- Fix mobile nav overflow at 320–375px viewport widths
- Eliminate inline style overrides that break the design system (e.g. `boxShadow: 'none'` on FilterBar buttons)
- Single source of truth: all visual tokens in `tokens.css`, all patterns in `neo-brutal.css`

---

## Design Tokens (`tokens.css`)

```css
:root {
  /* palette */
  --bg:      #FFFDF5;   /* warm cream — page background */
  --surface: #FFFFFF;   /* white — cards, nav, inputs */
  --ink:     #000000;

  /* accents — strictly scoped */
  --yellow: #FFE600;    /* selection, active states ONLY */
  --pink:   #FF2D55;    /* destructive actions ONLY */
  --green:  #00D084;    /* success toasts ONLY */

  /* structure — these are the design system contracts */
  --border:    3px solid var(--ink);
  --shadow:    4px 4px 0 var(--ink);
  --shadow-lg: 6px 6px 0 var(--ink);
  --shadow-sm: 2px 2px 0 var(--ink);

  /* typography */
  --font-display: 'Syne', sans-serif;
  --font-ui:      'Space Grotesk', sans-serif;

  /* layout */
  --nav-h:        68px;
  --page-max:     900px;
  --page-pad:     20px;
}

@media (max-width: 480px) {
  :root {
    --nav-h: 60px;
    --page-pad: 14px;
  }
}
```

### Accent color rules (enforced globally)
- `--yellow` → active nav links, checked checkboxes, selected row highlights, filter button active state
- `--pink` → delete/danger buttons only
- `--green` → success toast backgrounds only
- No element uses more than one accent color

---

## Shadow / Interaction Contract

Every interactive element follows this exact pattern:

| State  | Transform              | Box-shadow       |
|--------|------------------------|------------------|
| rest   | none                   | `var(--shadow)`  |
| hover  | `translate(-2px,-2px)` | `var(--shadow-lg)` |
| active | `translate(4px,4px)`   | `none`           |

**No exceptions.** No inline `boxShadow: 'none'` overrides. Non-interactive elements (playlist rows, info text) do not get the shadow treatment.

---

## Nav

### Desktop (≥769px)
- White (`--surface`) background, `border-bottom: var(--border)`, `box-shadow: 0 3px 0 var(--ink)` (gives the "floating slab" look)
- Height: `var(--nav-h)`
- Layout: `display: flex; justify-content: space-between; align-items: center; padding: 0 24px`
- Brand (left): `[YT]` chip + "Playlist Manager" title, `flex-shrink: 0; min-width: 0`
- Links (center-right): All, Duplicates, [SPO], Recent
  - Rest state: `border: 2px solid transparent; background: transparent`
  - Hover: `border-color: var(--ink); background: var(--bg)`
  - Active: `border: 2px solid var(--ink); background: var(--yellow); box-shadow: var(--shadow-sm)`
- Logout (far right): ghost button, `border: 2px solid var(--ink)`

### Mobile (≤768px)
- Nav collapses to: brand + hamburger button only
- **Nav overflow fix**: `.nav-brand { min-width: 0; overflow: hidden }` + `.nav-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap }`
- Hamburger: 44×44px, `border: var(--border)`, `box-shadow: var(--shadow-sm)`, animated lines → X
- Drawer: full-width, `position: fixed; top: var(--nav-h); left: 0; right: 0`, ink background
  - Link rows: white text, `border-bottom: 2px solid rgba(255,255,255,0.1)`, `padding: 20px 20px`
  - Active link: `background: var(--yellow); color: var(--ink)`
  - Footer: Logout button at bottom of drawer

---

## Page Layout

```
.page {
  max-width: var(--page-max);
  margin: 0 auto;
  padding: 32px var(--page-pad) 160px;
}

.page-title {
  font-family: var(--font-display);
  font-size: clamp(36px, 9vw, 64px);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 0.9;
  text-transform: uppercase;
  margin-bottom: 28px;
}
```

---

## Buttons (`.btn`)

```
padding: 12px 24px
font: Space Grotesk 800 14px uppercase letter-spacing 0.04em
border: var(--border)
box-shadow: var(--shadow)
min-height: 48px
transition: transform 80ms, box-shadow 80ms
```

Variants:
- `.btn-primary` → `background: var(--pink); color: #fff`
- `.btn-secondary` → `background: var(--yellow); color: var(--ink)`
- `.btn-danger` → `background: var(--pink); color: #fff` (same as primary — used in different contexts)
- `.btn-ghost` → `background: transparent; box-shadow: none; border: 2px solid var(--ink)`
  - Hover: `background: var(--ink); color: var(--bg); transform: none; box-shadow: none`

---

## Playlist Rows (`.playlist-row`)

- `display: flex; align-items: center; gap: 14px; padding: 14px 18px`
- `border-bottom: 2px solid var(--ink)` — visible, always
- `background: var(--surface)`
- Last child: `border-bottom: none`
- Hover: `background: #F7F7F2` — subtle tint only, no shadow movement
- Selected: `background: #FFFAD0; border-left: 5px solid var(--yellow)`
- Removing animation: `opacity → 0, max-height → 0` over 300ms

### Checkbox

- 32×32px square, `border: var(--border)`, `box-shadow: var(--shadow-sm)`
- Hover: `translate(-1px,-1px)`, shadow grows
- Checked: `background: var(--yellow)` + `✓` mark

---

## Filter Bar

Two-row layout:
1. Search input (full width on mobile, max 420px on desktop)
2. Day filter buttons: **always visible borders**

Day button states:
- Unselected: `border: 2px solid var(--ink); background: var(--surface); box-shadow: none`
- Selected: `border: var(--border); background: var(--yellow); box-shadow: var(--shadow)`
- Hover: shadow appears (`var(--shadow-sm)`)

**No inline style overrides** on these buttons — the CSS class handles all states.

---

## Bulk Action Bar

- Position: `fixed; bottom: 0; left: 0; right: 0`
- Background: `var(--ink)`, `border-top: var(--border)`
- Slides up: `transform: translateY(100%)` → `translateY(0)` when `count > 0`
- Layout: `display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 14px 24px`
- Buttons inside: same interaction contract but with white-adjusted shadows (`rgba(255,255,255,0.3)`)

Mobile (≤599px): reduced padding, buttons shrink to `min-height: 44px`

---

## Progress Drawer

- Position: `fixed; bottom: 0; left: 0; right: 0`
- When bulk bar is also visible (i.e. `count > 0`), `ProgressDrawer` gets class `above-bulk` which sets `bottom: 80px` to clear it
- White background, `border-top: var(--border)`, `box-shadow: 0 -3px 0 var(--ink)`
- Striped animated progress fill: yellow + ink diagonal stripes (keep existing animation)

---

## Login Page

- Full-viewport centered column, `background: var(--bg)`
- No card wrapper — open layout
- `[YT]` chip top
- Syne 900 title: `clamp(44px, 12vw, 80px)`, uppercase, `letter-spacing: -0.04em`
- Subtitle: Space Grotesk 600, `#555`
- Pink CTA button: "Connect YouTube →", `font-size: 17px; padding: 16px 40px`
- Fine print: `#888`

---

## Toast

- No rounded corners
- `border: var(--border); box-shadow: var(--shadow)`
- Slide in from right, same color semantics as before
- Container: `position: fixed; top: 14px; right: 14px; z-index: 9999`

---

## What Doesn't Change

- `api.ts` — untouched
- `App.tsx` routing — untouched  
- `ProgressDrawer.tsx` polling logic — untouched
- `BulkActionBar.tsx` state logic — untouched
- All page-level logic (filters, selection, job management)
- `[SPO]` label in Nav stays as-is

---

## Files Touched

| File | Action |
|------|--------|
| `src/styles/tokens.css` | Full rewrite |
| `src/styles/reset.css` | Minor — add `font-family` on button |
| `src/styles/neo-brutal.css` | Full rewrite |
| `src/components/Nav.css` | Full rewrite |
| `src/components/Nav.tsx` | Remove inline styles if any |
| `src/components/FilterBar.css` | Full rewrite |
| `src/components/FilterBar.tsx` | Remove `boxShadow: 'none'` inline override |
| `src/components/PlaylistCard.css` | Full rewrite |
| `src/components/BulkActionBar.css` | Full rewrite |
| `src/components/ProgressDrawer.css` | Full rewrite |
| `src/components/Spinner.css` | Full rewrite |
| `src/components/DuplicateGroup.css` | Full rewrite |
| `src/pages/LoginPage.tsx` | Remove inline styles → classnames |
| `src/pages/DuplicatesPage.tsx` | Remove inline styles → classnames |
| `src/pages/PlaylistsPage.tsx` | Remove inline styles → classnames |
| `index.html` | Verify font imports are current |
