# Neo-Brutal UI Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild all CSS from scratch for a consistent, responsive neo-brutal UI — fixing mobile nav overflow, eliminating inline style overrides, and enforcing a strict design system.

**Architecture:** CSS-only rebuild (no routing or logic changes). All tokens live in `tokens.css`, all reusable patterns in `neo-brutal.css`, component-specific overrides in per-component `.css` files. TSX edits are limited to removing inline styles and replacing them with classnames.

**Tech Stack:** React 18, Vite 5, TypeScript. No CSS-in-JS. Dev server: `cd web/client && npm run dev` → `http://localhost:6173`

## Global Constraints

- No changes to `api.ts`, `App.tsx` routing, or any component state/logic
- No rounded corners on any element — sharp right angles everywhere
- Shadow direction contract: hover = `translate(-2px,-2px)` + bigger shadow; active = `translate(4px,4px)` + no shadow
- `--yellow` (#FFE600) is used ONLY for active states and selections
- `--pink` (#FF2D55) is used ONLY for destructive actions
- All borders are solid black — never transparent or invisible (exception: ghost buttons use `2px solid var(--ink)`)
- Minimum touch target: 44px height on mobile for all interactive elements
- Dev server port: `6173`

---

### Task 1: Foundation — `tokens.css` + `reset.css`

**Files:**
- Modify: `web/client/src/styles/tokens.css`
- Modify: `web/client/src/styles/reset.css`

**Interfaces:**
- Produces: CSS custom properties consumed by every other file in this plan

- [ ] **Step 1: Rewrite `tokens.css`**

```css
/* web/client/src/styles/tokens.css */
:root {
  --bg:      #FFFDF5;
  --surface: #FFFFFF;
  --ink:     #000000;

  --yellow:  #FFE600;
  --pink:    #FF2D55;
  --green:   #00D084;

  --border:    3px solid var(--ink);
  --shadow:    4px 4px 0 var(--ink);
  --shadow-lg: 6px 6px 0 var(--ink);
  --shadow-sm: 2px 2px 0 var(--ink);

  --font-display: 'Syne', sans-serif;
  --font-ui:      'Space Grotesk', sans-serif;

  --nav-h:    68px;
  --page-max: 900px;
  --page-pad: 20px;
}

@media (max-width: 480px) {
  :root {
    --nav-h:    60px;
    --page-pad: 14px;
  }
}
```

- [ ] **Step 2: Rewrite `reset.css`**

```css
/* web/client/src/styles/reset.css */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--font-ui); background: var(--bg); color: var(--ink);
  line-height: 1.5; -webkit-font-smoothing: antialiased;
}
a { color: inherit; text-decoration: none; }
button { cursor: pointer; font-family: var(--font-ui); background: none; border: none; }
ul, ol { list-style: none; }
img { display: block; max-width: 100%; }
```

- [ ] **Step 3: Verify TypeScript still compiles**

```bash
cd web/client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add web/client/src/styles/tokens.css web/client/src/styles/reset.css
git commit -m "style: rewrite design tokens and reset"
```

---

### Task 2: Global Patterns — `neo-brutal.css`

**Files:**
- Modify: `web/client/src/styles/neo-brutal.css`

**Interfaces:**
- Consumes: all `--*` tokens from Task 1
- Produces: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost`, `.card`, `.card-list`, `.card-empty`, `.card-empty-title`, `.card-empty-body`, `.input`, `.checkbox`, `.chip`, `.chip-yt`, `.chip-count`, `.page`, `.page-title`, `.page-header`, `.page-intro`, `.msg-error`, `.progress-track`, `.progress-fill`, `.bulk-bar`, `.toast`, `.toast-container`, `.recent-search`, `.recent-search-field`, `.recent-label`, `.tag-recommended`, `.login-wrap`, `.login-hero`, `.login-title`, `.login-sub`, `.login-chip`, `.login-cta`, `.login-fine`

- [ ] **Step 1: Rewrite `neo-brutal.css`**

```css
/* web/client/src/styles/neo-brutal.css */

/* ── Buttons ─────────────────────────────────────────────────── */
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 24px;
  font-family: var(--font-ui); font-weight: 800; font-size: 14px;
  text-transform: uppercase; letter-spacing: 0.04em; line-height: 1;
  border: var(--border); box-shadow: var(--shadow);
  background: var(--surface); color: var(--ink);
  cursor: pointer; min-height: 48px; touch-action: manipulation;
  transition: transform 80ms, box-shadow 80ms;
}
.btn:hover    { transform: translate(-2px, -2px); box-shadow: var(--shadow-lg); }
.btn:active   { transform: translate(4px, 4px);   box-shadow: none; }
.btn:disabled { opacity: 0.4; pointer-events: none; }

.btn-primary   { background: var(--pink);   color: #fff; }
.btn-danger    { background: var(--pink);   color: #fff; }
.btn-secondary { background: var(--yellow); color: var(--ink); }
.btn-ghost {
  background: transparent; box-shadow: none;
  border: 2px solid var(--ink);
}
.btn-ghost:hover  { background: var(--ink); color: var(--bg); transform: none; box-shadow: none; }
.btn-ghost:active { transform: none; }

/* ── Cards ───────────────────────────────────────────────────── */
.card {
  background: var(--surface); border: var(--border); box-shadow: var(--shadow);
}
.card-list  { padding: 0; overflow: hidden; }
.card-empty { padding: 40px 32px; text-align: center; }
.card-empty-title { font-weight: 800; font-size: 18px; margin-bottom: 6px; }
.card-empty-body  { font-size: 13px; color: #777; }

/* ── Input ───────────────────────────────────────────────────── */
.input {
  padding: 12px 16px; border: var(--border); background: var(--surface);
  font-family: var(--font-ui); font-size: 16px; width: 100%;
  outline: none; box-shadow: var(--shadow);
  transition: box-shadow 80ms;
}
.input:focus { box-shadow: var(--shadow-lg); }
.input:hover { box-shadow: var(--shadow-lg); }

/* ── Checkbox ────────────────────────────────────────────────── */
.checkbox {
  width: 32px; height: 32px; flex-shrink: 0;
  border: var(--border); background: var(--surface); box-shadow: var(--shadow-sm);
  display: grid; place-items: center; cursor: pointer;
  transition: background 80ms, transform 80ms; touch-action: manipulation;
}
.checkbox:hover   { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 var(--ink); }
.checkbox.checked { background: var(--yellow); }
.checkbox.checked::after { content: '✓'; font-weight: 900; font-size: 18px; }

/* ── Chip / badge ────────────────────────────────────────────── */
.chip {
  display: inline-flex; align-items: center;
  padding: 3px 10px; border: 2px solid var(--ink);
  font-family: var(--font-display); font-size: 12px; font-weight: 800;
  letter-spacing: 0.08em; text-transform: uppercase;
}
.chip-yt    { background: var(--pink); color: #fff; }
.chip-count { background: var(--ink);  color: var(--bg); }

/* ── Page layout ─────────────────────────────────────────────── */
.page {
  max-width: var(--page-max); margin: 0 auto;
  padding: 32px var(--page-pad) 160px;
}
.page-title {
  font-family: var(--font-display); font-weight: 900;
  font-size: clamp(36px, 9vw, 64px);
  letter-spacing: -0.04em; text-transform: uppercase;
  line-height: 0.9; margin-bottom: 28px;
}
.page-header {
  display: flex; align-items: baseline; gap: 16px; margin-bottom: 24px;
}
.page-header .page-title { margin-bottom: 0; }
.page-intro { margin-bottom: 20px; color: #555; font-weight: 600; font-size: 15px; }

/* ── Error message ───────────────────────────────────────────── */
.msg-error { color: var(--pink); font-weight: 800; font-size: 15px; margin-bottom: 16px; }

/* ── Page-level striped progress bar ────────────────────────── */
.progress-track {
  height: 24px; border: var(--border); background: var(--surface); overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: repeating-linear-gradient(
    -45deg, var(--yellow) 0, var(--yellow) 10px,
    var(--ink) 10px, var(--ink) 12px
  );
  background-size: 200% 100%;
  animation: stripe-march 1s linear infinite;
  transition: width 300ms ease;
}
@keyframes stripe-march {
  0%   { background-position: 0% 0; }
  100% { background-position: -100% 0; }
}

/* ── Bulk action bar ─────────────────────────────────────────── */
.bulk-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: var(--ink); color: var(--bg);
  padding: 14px 24px;
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  font-family: var(--font-ui); font-weight: 700; font-size: 15px;
  transform: translateY(100%); transition: transform 220ms ease;
  z-index: 50; border-top: var(--border);
}
.bulk-bar.visible { transform: translateY(0); }

.bulk-bar .btn-danger {
  border-color: rgba(255,255,255,0.6);
  box-shadow: 4px 4px 0 rgba(255,255,255,0.3);
}
.bulk-bar .btn-danger:hover  { box-shadow: 6px 6px 0 rgba(255,255,255,0.4); }
.bulk-bar .btn-danger:active { box-shadow: none; }
.bulk-bar .btn-secondary { color: var(--ink); }
.bulk-bar .btn-ghost {
  color: rgba(255,255,255,0.7); border-color: rgba(255,255,255,0.4);
}
.bulk-bar .btn-ghost:hover {
  background: rgba(255,255,255,0.1); color: #fff; transform: none; box-shadow: none;
}

@media (max-width: 599px) {
  .bulk-bar { padding: 10px 14px; gap: 8px; }
  .bulk-bar .btn { font-size: 12px; padding: 10px 14px; min-height: 44px; }
}

/* ── Toast ───────────────────────────────────────────────────── */
.toast-container {
  position: fixed; top: 14px; right: 14px; z-index: 9999;
  display: flex; flex-direction: column; gap: 10px;
  pointer-events: none; max-width: 360px;
}
.toast {
  pointer-events: auto; padding: 14px 20px;
  border: var(--border); box-shadow: var(--shadow);
  font-weight: 800; font-size: 15px; cursor: pointer;
  animation: toast-in 250ms ease forwards;
}
.toast.exiting { animation: toast-out 200ms ease forwards; }
.toast-success { background: var(--green);  color: #fff; }
.toast-error   { background: var(--pink);   color: #fff; }
.toast-warning { background: var(--yellow); color: var(--ink); }
.toast-info    { background: var(--ink);    color: var(--bg); }
@keyframes toast-in {
  from { transform: translateX(110%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}
@keyframes toast-out {
  from { transform: translateX(0);    opacity: 1; }
  to   { transform: translateX(110%); opacity: 0; }
}
@media (max-width: 599px) {
  .toast-container { top: 8px; right: 8px; left: 8px; max-width: none; }
  .toast { font-size: 14px; padding: 12px 16px; }
}

/* ── Recent page search row ──────────────────────────────────── */
.recent-search { display: flex; gap: 14px; align-items: flex-end; margin-bottom: 16px; }
.recent-search-field { flex: 1; max-width: 420px; }
.recent-label {
  display: block; font-weight: 800; font-size: 13px;
  margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.06em;
}
@media (max-width: 599px) {
  .recent-search { flex-direction: column; align-items: stretch; }
  .recent-search-field { max-width: 100%; }
}

/* ── Tag badge ───────────────────────────────────────────────── */
.tag-recommended {
  display: inline-block; padding: 2px 8px;
  background: var(--yellow); border: 2px solid var(--ink);
  font-size: 11px; font-weight: 800; margin-left: 8px;
  text-transform: uppercase; letter-spacing: 0.06em;
}

/* ── Login page ──────────────────────────────────────────────── */
.login-wrap {
  min-height: 100vh; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 40px;
  background: var(--bg); padding: 24px;
}
.login-hero { text-align: center; max-width: 480px; }
.login-chip { font-size: 14px; margin-bottom: 20px; }
.login-title {
  font-family: var(--font-display); font-size: clamp(44px, 12vw, 80px);
  font-weight: 900; line-height: 0.9;
  letter-spacing: -0.04em; text-transform: uppercase; margin-bottom: 20px;
}
.login-sub  { font-size: 17px; font-weight: 600; color: #444; letter-spacing: 0.01em; }
.login-cta  { font-size: 17px; padding: 16px 40px; }
.login-fine { font-size: 12px; color: #888; font-weight: 500; }
```

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
cd web/client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add web/client/src/styles/neo-brutal.css
git commit -m "style: rewrite global neo-brutal patterns"
```

---

### Task 3: Nav — `Nav.css` + `Nav.tsx`

**Files:**
- Modify: `web/client/src/components/Nav.css`
- Modify: `web/client/src/components/Nav.tsx`

**Interfaces:**
- Consumes: `--nav-h`, `--border`, `--shadow`, `--shadow-sm`, `--yellow`, `--ink`, `--bg`, `--surface`, `--font-display`, `--font-ui` from Task 1
- Produces: `.nav`, `.nav-brand`, `.nav-title`, `.nav-right`, `.nav-links`, `.nav-link`, `.nav-logout`, `.hamburger`, `.hamburger-line`, `.hamburger--open`, `.menu-overlay`, `.menu-drawer`, `.menu-drawer--open`, `.menu-drawer-footer`

- [ ] **Step 1: Rewrite `Nav.css`**

```css
/* web/client/src/components/Nav.css */

/* ── Nav shell ──────────────────────────────────────────────── */
.nav {
  position: sticky; top: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; height: var(--nav-h);
  background: var(--surface);
  border-bottom: var(--border);
  box-shadow: 0 3px 0 var(--ink);
}

/* ── Brand ──────────────────────────────────────────────────── */
.nav-brand {
  display: flex; align-items: center; gap: 12px;
  flex-shrink: 0; min-width: 0; overflow: hidden;
}
.nav-title {
  font-family: var(--font-display); font-weight: 900;
  font-size: clamp(15px, 3vw, 20px);
  letter-spacing: -0.03em; text-transform: uppercase;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ── Right group ────────────────────────────────────────────── */
.nav-right {
  display: flex; align-items: center; gap: 4px;
  flex-shrink: 0; margin-left: 16px;
}

/* ── Desktop links ──────────────────────────────────────────── */
.nav-links { display: flex; align-items: center; gap: 2px; }
.nav-link {
  padding: 8px 14px;
  font-family: var(--font-ui); font-weight: 800; font-size: 13px;
  text-transform: uppercase; letter-spacing: 0.06em;
  border: 2px solid transparent;
  min-height: 40px; display: inline-flex; align-items: center;
  white-space: nowrap;
  transition: background 80ms, border-color 80ms;
}
.nav-link:hover { border-color: var(--ink); background: var(--bg); }
.nav-link.active {
  border: 2px solid var(--ink);
  background: var(--yellow);
  box-shadow: var(--shadow-sm);
}

/* ── Logout ─────────────────────────────────────────────────── */
.nav-logout {
  font-size: 12px; white-space: nowrap;
  min-height: 40px; padding: 8px 14px; margin-left: 6px;
}

/* ── Hamburger ──────────────────────────────────────────────── */
.hamburger {
  display: none; flex-direction: column; justify-content: center; gap: 5px;
  width: 44px; height: 44px; padding: 11px;
  background: var(--surface); border: var(--border); box-shadow: var(--shadow-sm);
  touch-action: manipulation; flex-shrink: 0; cursor: pointer;
  transition: transform 80ms, box-shadow 80ms;
}
.hamburger:hover  { transform: translate(-2px, -2px); box-shadow: var(--shadow); }
.hamburger:active { transform: translate(4px, 4px);   box-shadow: none; }

.hamburger-line {
  display: block; width: 100%; height: 3px;
  background: var(--ink); transition: transform 220ms ease, opacity 150ms;
  transform-origin: center;
}
.hamburger--open .hamburger-line:nth-child(1) { transform: translateY(8px) rotate(45deg); }
.hamburger--open .hamburger-line:nth-child(2) { opacity: 0; transform: scaleX(0); }
.hamburger--open .hamburger-line:nth-child(3) { transform: translateY(-8px) rotate(-45deg); }

/* ── Mobile overlay ─────────────────────────────────────────── */
.menu-overlay {
  position: fixed; inset: 0; z-index: 90;
  background: rgba(0,0,0,0.6);
}

/* ── Mobile drawer ──────────────────────────────────────────── */
.menu-drawer {
  position: fixed; top: var(--nav-h); left: 0; right: 0; z-index: 95;
  display: flex; flex-direction: column;
  background: var(--ink);
  border-bottom: var(--border);
  transform: translateY(-110%);
  transition: transform 240ms cubic-bezier(0.4, 0, 0.2, 1);
}
.menu-drawer--open { transform: translateY(0); }

.menu-drawer .nav-link {
  width: 100%; padding: 20px 24px;
  font-size: 24px; font-weight: 900; letter-spacing: -0.02em;
  color: var(--bg); border: none;
  border-bottom: 2px solid rgba(255,255,255,0.1);
  justify-content: flex-start; text-transform: uppercase;
  transition: background 80ms;
}
.menu-drawer .nav-link:hover  { background: rgba(255,255,255,0.05); border-color: transparent; }
.menu-drawer .nav-link.active { background: var(--yellow); color: var(--ink); box-shadow: none; border-color: transparent; }

.menu-drawer-footer {
  padding: 16px 24px;
  border-top: 2px solid rgba(255,255,255,0.1);
}
.menu-drawer-footer .btn {
  color: rgba(255,255,255,0.8); border-color: rgba(255,255,255,0.4);
  background: transparent; box-shadow: none;
  width: 100%; justify-content: center;
  text-transform: uppercase; font-size: 13px;
}
.menu-drawer-footer .btn:hover  { background: rgba(255,255,255,0.08); color: #fff; transform: none; box-shadow: none; }
.menu-drawer-footer .btn:active { transform: none; }

/* ── Breakpoints ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .nav-links, .nav-logout { display: none; }
  .hamburger { display: flex; }
}
@media (max-width: 480px) {
  .nav { padding: 0 14px; }
  .menu-drawer .nav-link { font-size: 20px; padding: 18px 18px; }
}
```

- [ ] **Step 2: Verify `Nav.tsx` has no inline styles to remove**

Open `web/client/src/components/Nav.tsx`. It currently has no inline `style={{}}` props — all styles are classnames. No TSX changes needed.

- [ ] **Step 3: Start dev server and verify nav**

```bash
cd web/client && npm run dev
```

Open `http://localhost:6173`. Check:
- [ ] Nav has white background, 3px black bottom border, 3px solid black drop shadow
- [ ] Brand chip and "Playlist Manager" title render side by side
- [ ] Active link has yellow background + black border box-shadow
- [ ] Hover on inactive link shows black border appearing
- [ ] Logout button shows on desktop (≥769px), hidden on mobile
- [ ] At ≤768px: hamburger appears, links hidden
- [ ] Hamburger click opens black drawer with white links
- [ ] Active link in drawer is yellow with black text
- [ ] At 375px viewport: nav title does NOT overflow — it truncates with ellipsis
- [ ] At 320px viewport: no horizontal scrollbar on the nav

- [ ] **Step 4: Commit**

```bash
git add web/client/src/components/Nav.css web/client/src/components/Nav.tsx
git commit -m "style: rebuild nav with mobile overflow fix"
```

---

### Task 4: FilterBar — `FilterBar.css` + `FilterBar.tsx`

**Files:**
- Modify: `web/client/src/components/FilterBar.css`
- Modify: `web/client/src/components/FilterBar.tsx`

**Interfaces:**
- Consumes: `.btn`, `.btn-secondary`, `.input` from Task 2
- Produces: `.filter-bar`, `.filter-search-wrap`, `.filter-search`, `.filter-days`

- [ ] **Step 1: Rewrite `FilterBar.css`**

```css
/* web/client/src/components/FilterBar.css */
.filter-bar { display: flex; flex-direction: column; gap: 14px; margin-bottom: 28px; }
.filter-search-wrap { max-width: 420px; }
.filter-search { width: 100%; }
.filter-days { display: flex; flex-wrap: wrap; gap: 8px; }

/* Day buttons — always visible border, no inline overrides needed */
.filter-days .btn {
  min-height: 40px; padding: 8px 16px; font-size: 13px;
  border: 2px solid var(--ink); box-shadow: none;
  background: var(--surface);
}
.filter-days .btn:hover  { box-shadow: var(--shadow-sm); transform: translate(-1px,-1px); }
.filter-days .btn:active { transform: translate(4px,4px); box-shadow: none; }

/* Selected day button gets btn-secondary class — override shadows appropriately */
.filter-days .btn.btn-secondary { box-shadow: var(--shadow); }
.filter-days .btn.btn-secondary:hover { box-shadow: var(--shadow-lg); transform: translate(-2px,-2px); }

@media (max-width: 599px) {
  .filter-search-wrap { max-width: 100%; }
  .filter-days .btn { font-size: 12px; padding: 7px 12px; min-height: 38px; }
}
```

- [ ] **Step 2: Remove inline style override in `FilterBar.tsx`**

Current code in `FilterBar.tsx` (around line 49):
```tsx
className={`btn ${days === opt.value ? 'btn-secondary' : ''}`}
style={days !== opt.value ? {boxShadow:'none',borderColor:'transparent'} : {}}
```

Replace with (remove the `style` prop entirely):
```tsx
className={`btn ${days === opt.value ? 'btn-secondary' : ''}`}
```

The full updated button in `FilterBar.tsx`:
```tsx
<button
  key={opt.label}
  className={`btn ${days === opt.value ? 'btn-secondary' : ''}`}
  onClick={() => apply(search, opt.value, true)}
>
  {opt.label}
</button>
```

- [ ] **Step 3: Verify in browser**

Open `http://localhost:6173`. On the All Playlists page, check:
- [ ] Search input has black border + shadow
- [ ] All 4 day-filter buttons have visible black borders (not transparent)
- [ ] Selected button (default: "All time") has yellow background + shadow
- [ ] Unselected buttons have white background, no shadow, but visible black border
- [ ] Clicking a day button selects it (yellow) and deselects the previous
- [ ] On 375px viewport: buttons wrap to next line cleanly

- [ ] **Step 4: Commit**

```bash
git add web/client/src/components/FilterBar.css web/client/src/components/FilterBar.tsx
git commit -m "style: rebuild filter bar, remove inline shadow override"
```

---

### Task 5: PlaylistCard + Spinner

**Files:**
- Modify: `web/client/src/components/PlaylistCard.css`
- Modify: `web/client/src/components/Spinner.css`

**Interfaces:**
- Consumes: `.playlist-row`, `.checkbox`, `.checkbox.checked` from `neo-brutal.css` (Task 2)
- Produces: `.playlist-row-body`, `.playlist-title`, `.playlist-meta`, `.playlist-row.removing`, `.spinner`, `.spinner--inline`, `.spinner-dot`, `.spinner-label`

- [ ] **Step 1: Rewrite `PlaylistCard.css`**

```css
/* web/client/src/components/PlaylistCard.css */
.playlist-row-body {
  display: flex; flex-direction: column; gap: 4px;
  flex: 1; cursor: pointer; min-width: 0;
}
.playlist-title {
  font-weight: 800; font-size: 16px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  letter-spacing: -0.01em;
}
.playlist-meta { font-size: 13px; color: #555; font-weight: 500; }

/* Collapse animation when row is being deleted */
.playlist-row {
  transition: opacity 250ms ease, max-height 300ms ease 150ms,
    padding 300ms ease 150ms, border 300ms ease 150ms;
  max-height: 200px; overflow: hidden;
}
.playlist-row.removing {
  opacity: 0; max-height: 0;
  padding-top: 0; padding-bottom: 0; border-bottom: none;
}
```

- [ ] **Step 2: Rewrite `Spinner.css`**

```css
/* web/client/src/components/Spinner.css */
.spinner {
  display: flex; align-items: center; gap: 14px;
  padding: 32px 0; font-weight: 800; font-size: 15px;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.spinner--inline {
  display: inline-flex; padding: 0; gap: 8px;
  text-transform: none; letter-spacing: normal; font-size: 14px;
}
.spinner-dot {
  display: block; width: 20px; height: 20px;
  border: 3px solid var(--ink); border-top-color: var(--yellow);
  border-radius: 50%;
  animation: spin 600ms linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }
.spinner-label { color: #555; }
```

- [ ] **Step 3: Verify in browser**

On the All Playlists page:
- [ ] Playlist rows show: checkbox on left, title + date/tracks on right
- [ ] Checkbox is a square (not round), black border, shadow
- [ ] Checking a row: checkbox turns yellow with ✓, row background turns light yellow, left border turns yellow
- [ ] Row hover shows subtle grey background tint
- [ ] Spinner shows on load (uppercase text + spinning yellow-topped circle)

- [ ] **Step 4: Commit**

```bash
git add web/client/src/components/PlaylistCard.css web/client/src/components/Spinner.css
git commit -m "style: rebuild playlist card and spinner"
```

---

### Task 6: BulkActionBar

**Files:**
- Modify: `web/client/src/components/BulkActionBar.css`

**Interfaces:**
- Consumes: `.bulk-bar`, `.bulk-bar.visible`, all `.bulk-bar .btn-*` overrides from `neo-brutal.css` (Task 2)
- Produces: `.bulk-select-n`, `.bulk-n-input`, `.bulk-n-go`

- [ ] **Step 1: Rewrite `BulkActionBar.css`**

```css
/* web/client/src/components/BulkActionBar.css */
.bulk-select-n { display: inline-flex; align-items: center; gap: 8px; }

.bulk-n-input {
  width: 58px; padding: 8px 10px;
  border: 3px solid rgba(255,255,255,0.4);
  background: rgba(255,255,255,0.08);
  font-family: var(--font-ui); font-size: 15px; font-weight: 800;
  text-align: center; outline: none; color: var(--bg);
}
.bulk-n-input:focus { border-color: var(--yellow); background: rgba(255,230,0,0.15); }

.bulk-n-go { font-size: 12px; padding: 8px 14px; min-height: 40px; }
```

- [ ] **Step 2: Verify in browser**

Select 2+ playlists on the All Playlists page:
- [ ] Black bar slides up from bottom
- [ ] "X selected" count on left
- [ ] Yellow "Select all N" button (black text)
- [ ] N input field and "Select" button visible
- [ ] Pink "Delete X" button on right
- [ ] Grey "Clear" ghost button
- [ ] At 375px: buttons wrap, remain tappable (≥44px height)

- [ ] **Step 3: Commit**

```bash
git add web/client/src/components/BulkActionBar.css
git commit -m "style: rebuild bulk action bar"
```

---

### Task 7: ProgressDrawer

**Files:**
- Modify: `web/client/src/components/ProgressDrawer.css`

**Interfaces:**
- Consumes: `--border`, `--shadow`, `--yellow`, `--green`, `--ink`, `--bg`, `--surface`, `--font-display` from Task 1; `.progress-track`, `.progress-fill` from Task 2
- Produces: `.progress-drawer`, `.progress-drawer.visible`, `.progress-label`, `.progress-pct`, `.progress-complete`, `.progress-check`

- [ ] **Step 1: Rewrite `ProgressDrawer.css`**

```css
/* web/client/src/components/ProgressDrawer.css */
.progress-drawer {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: var(--surface); color: var(--ink);
  padding: 16px 24px;
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  transform: translateY(100%); transition: transform 250ms ease;
  z-index: 40; font-weight: 700;
  border-top: var(--border);
  box-shadow: 0 -3px 0 var(--ink);
}
.progress-drawer.visible { transform: translateY(0); }

.progress-label {
  white-space: nowrap; font-size: 15px; font-weight: 800;
  text-transform: uppercase; letter-spacing: 0.04em; flex-shrink: 0;
}
.progress-pct {
  white-space: nowrap; font-size: 20px; font-weight: 900;
  min-width: 52px; text-align: right; flex-shrink: 0;
  font-family: var(--font-display); letter-spacing: -0.02em;
}

/* Override progress-track height inside the drawer */
.progress-drawer .progress-track { flex: 1; min-width: 80px; height: 20px; }

.progress-complete {
  display: flex; align-items: center; gap: 14px;
  font-size: 16px; font-weight: 800; width: 100%;
  animation: complete-pop 320ms ease;
  text-transform: uppercase; letter-spacing: 0.04em;
}
.progress-check {
  display: grid; place-items: center;
  width: 36px; height: 36px; flex-shrink: 0;
  background: var(--green); color: #fff;
  font-weight: 900; font-size: 20px;
  border: 3px solid var(--ink);
}
@keyframes complete-pop {
  0%   { transform: scale(0.5); opacity: 0; }
  60%  { transform: scale(1.12); }
  100% { transform: scale(1);   opacity: 1; }
}

@media (max-width: 599px) {
  .progress-drawer { padding: 12px 14px; gap: 10px; }
  .progress-drawer .progress-track { width: 100%; order: 1; flex: 0 0 100%; }
  .progress-label { font-size: 13px; }
  .progress-pct   { font-size: 16px; }
}
```

- [ ] **Step 2: Verify in browser**

Trigger a delete job (select 1+ playlists and click Delete) — or observe the drawer directly if you have a running backend. If no backend: temporarily change ProgressDrawer.tsx to always return visible content by setting `if (!jobId || !progress) return null` to temporarily return a mocked progress element. Revert after checking.

Check:
- [ ] Progress drawer has white background, black top border + upward shadow
- [ ] Striped yellow/black animated progress fill
- [ ] "Deleting X/Y…" label uppercase left, "Z%" right
- [ ] On complete: green checkbox square (black border) + "Deleted N playlists" uppercase
- [ ] No overlap with bulk action bar (they don't appear simultaneously — deletion clears selection)

- [ ] **Step 3: Commit**

```bash
git add web/client/src/components/ProgressDrawer.css
git commit -m "style: rebuild progress drawer (white background)"
```

---

### Task 8: DuplicateGroup

**Files:**
- Modify: `web/client/src/components/DuplicateGroup.css`

**Interfaces:**
- Consumes: `.card` from Task 2; `--border`, `--yellow`, `--pink`, `--green`, `--ink` from Task 1
- Produces: `.dg-card`, `.dg-header`, `.dg-row`, `.dg-row.keep`, `.dg-row.delete`, `.dg-badge`, `.dg-title`, `.dg-meta`

- [ ] **Step 1: Rewrite `DuplicateGroup.css`**

```css
/* web/client/src/components/DuplicateGroup.css */
.dg-card { padding: 0; overflow: hidden; margin-bottom: 24px; }

.dg-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; background: var(--bg); border-bottom: var(--border);
  cursor: pointer;
  font-family: var(--font-display); font-size: 18px; font-weight: 900;
  letter-spacing: -0.02em; text-transform: uppercase;
  transition: background 80ms;
}
.dg-header:hover { background: var(--yellow); }

.dg-row {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px; border-bottom: 2px solid var(--ink);
  transition: background 80ms;
}
.dg-row:last-child { border-bottom: none; }
.dg-row.keep   { background: rgba(0,208,132,0.06); }
.dg-row.delete { background: rgba(255,45,85,0.04); }
.dg-row:hover  { background: #F5F5F0; }

.dg-badge {
  font-size: 11px; font-weight: 900; font-family: var(--font-display);
  min-width: 56px; flex-shrink: 0;
  text-transform: uppercase; letter-spacing: 0.08em;
  padding: 3px 8px; border: 2px solid currentColor; text-align: center;
}
.dg-row.keep   .dg-badge { color: var(--green); }
.dg-row.delete .dg-badge { color: var(--pink); }

.dg-title {
  flex: 1; font-weight: 700; font-size: 15px;
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.dg-meta { font-size: 13px; color: #666; white-space: nowrap; flex-shrink: 0; font-weight: 500; }

@media (max-width: 599px) {
  .dg-header { font-size: 15px; padding: 12px 14px; }
  .dg-row    { gap: 8px; padding: 10px 14px; }
  .dg-badge  { min-width: 44px; font-size: 10px; }
  .dg-meta   { display: none; }
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `/duplicates`. If no duplicates exist, this page shows the empty state card — verify it looks correct. If duplicates exist:
- [ ] Each group card has black border + shadow
- [ ] Group header: cream background, uppercase bold name, count chip right-aligned
- [ ] Header hover turns yellow
- [ ] Keep row: subtle green tint background, green badge "✓ KEEP"
- [ ] Delete row: subtle pink tint background, pink badge "✗ DEL"
- [ ] Rows have visible black bottom borders (not grey)

- [ ] **Step 3: Commit**

```bash
git add web/client/src/components/DuplicateGroup.css
git commit -m "style: rebuild duplicate group cards"
```

---

### Task 9: Page TSX inline style cleanup

**Files:**
- Modify: `web/client/src/pages/LoginPage.tsx`
- Modify: `web/client/src/pages/PlaylistsPage.tsx`
- Modify: `web/client/src/pages/DuplicatesPage.tsx`
- Modify: `web/client/src/pages/RecentPage.tsx`
- Modify: `web/client/src/pages/TagPage.tsx`

**Interfaces:**
- Consumes: `.card-list`, `.card-empty`, `.card-empty-title`, `.card-empty-body`, `.page-header`, `.page-intro`, `.msg-error`, `.login-wrap`, `.login-hero`, `.login-title`, `.login-sub`, `.login-chip`, `.login-cta`, `.login-fine` from Task 2

- [ ] **Step 1: Rewrite `LoginPage.tsx`**

```tsx
// web/client/src/pages/LoginPage.tsx
import '../styles/tokens.css'
import '../styles/reset.css'
import '../styles/neo-brutal.css'

export function LoginPage() {
  return (
    <div className="login-wrap">
      <div className="login-hero">
        <div className="chip chip-yt login-chip">YT</div>
        <h1 className="login-title">Playlist<br />Manager</h1>
        <p className="login-sub">Bulk-delete your YouTube playlists.<br />No mercy.</p>
      </div>
      <a href="/auth/login" className="btn btn-primary login-cta">Connect YouTube &rarr;</a>
      <p className="login-fine">Requires YouTube Data API permission</p>
    </div>
  )
}
```

- [ ] **Step 2: Update `PlaylistsPage.tsx` — replace inline card styles**

Find and replace the two inline card instances:

```tsx
// Replace:
<div className="card" style={{padding:0, overflow:'hidden'}}>
// With:
<div className="card card-list">

// Replace:
<div className="card" style={{padding:32,textAlign:'center',color:'#999'}}>
  <p style={{fontWeight:700,fontSize:18,marginBottom:4}}>No playlists found</p>
  <p style={{fontSize:13}}>Try adjusting your search or time filter.</p>
</div>
// With:
<div className="card card-empty">
  <p className="card-empty-title">No playlists found</p>
  <p className="card-empty-body">Try adjusting your search or time filter.</p>
</div>
```

- [ ] **Step 3: Update `DuplicatesPage.tsx` — replace inline styles**

```tsx
// Replace:
<div style={{display:'flex',alignItems:'baseline',gap:16,marginBottom:24}}>
  <h1 className="page-title" style={{margin:0}}>Duplicates</h1>
// With:
<div className="page-header">
  <h1 className="page-title">Duplicates</h1>

// Replace:
<div className="card" style={{padding:32,textAlign:'center',color:'#999'}}>
  <p style={{fontWeight:700,fontSize:18,marginBottom:4}}>No duplicates found</p>
  <p style={{fontSize:13}}>Your playlists are all unique!</p>
</div>
// With:
<div className="card card-empty">
  <p className="card-empty-title">No duplicates found</p>
  <p className="card-empty-body">Your playlists are all unique!</p>
</div>
```

- [ ] **Step 4: Update `RecentPage.tsx` — replace inline styles**

```tsx
// Replace:
<p style={{marginBottom:16,color:'#555',fontWeight:600}}>
  Find playlists created within a time range, then bulk delete.
</p>
// With:
<p className="page-intro">Find playlists created within a time range, then bulk delete.</p>

// Replace: (msg-error already has margin-bottom in CSS now)
{error && <p className="msg-error" style={{marginBottom:16}}>{error}</p>}
// With:
{error && <p className="msg-error">{error}</p>}

// Replace empty state:
<div className="card" style={{padding:32,textAlign:'center',color:'#999'}}>
  <p style={{fontWeight:700,fontSize:18,marginBottom:4}}>No playlists found</p>
  <p style={{fontSize:13}}>Try a wider time range.</p>
</div>
// With:
<div className="card card-empty">
  <p className="card-empty-title">No playlists found</p>
  <p className="card-empty-body">Try a wider time range.</p>
</div>

// Replace the card holding playlist rows:
<div className="card" style={{padding:0,overflow:'hidden',marginTop:16}}>
// With:
<div className="card card-list" style={{marginTop:16}}>
```

- [ ] **Step 5: Update `TagPage.tsx` — replace inline styles**

```tsx
// Replace page intro paragraph:
<p style={{marginBottom:16,color:'#555',fontWeight:600}}>
  Playlists younger than 30 days are pre-selected <span className="tag-recommended">★ new</span>
</p>
// With:
<p className="page-intro">
  Playlists younger than 30 days are pre-selected <span className="tag-recommended">★ new</span>
</p>

// Replace card holding playlist rows:
<div className="card" style={{padding:0,overflow:'hidden'}}>
// With:
<div className="card card-list">

// Replace empty state card:
<div className="card" style={{padding:32,textAlign:'center',color:'#999'}}>
  <p style={{fontWeight:700,fontSize:18,marginBottom:4}}>No candidates found</p>
  <p style={{fontSize:13}}>All playlists already have [SPO] or none need it.</p>
</div>
// With:
<div className="card card-empty">
  <p className="card-empty-title">No candidates found</p>
  <p className="card-empty-body">All playlists already have [SPO] or none need it.</p>
</div>

// In RenameBulkBar — remove style={{color:'#aaa'}} from ghost buttons:
// Replace:
<button className="btn btn-ghost" style={{color:'#aaa'}} onClick={onRename} disabled={renaming}>
// With:
<button className="btn btn-ghost" onClick={onRename} disabled={renaming}>

// Replace:
<button className="btn btn-ghost" style={{color:'#aaa'}} onClick={allSelected ? onClear : onSelectAll}>
// With:
<button className="btn btn-ghost" onClick={allSelected ? onClear : onSelectAll}>

// Replace:
<button className="btn btn-ghost" style={{color:'#aaa'}} onClick={onClear}>Clear</button>
// With:
<button className="btn btn-ghost" onClick={onClear}>Clear</button>

// The style={{position:'relative'}} wrapper div for the "★ new" badge overlay is acceptable to leave as-is
// since it is a direct layout requirement for the absolute-positioned badge.
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd web/client && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Full visual verification in browser**

Open `http://localhost:6173/login`:
- [ ] Centered layout, huge bold title, pink CTA button with shadow
- [ ] Button hover: moves up-left, bigger shadow
- [ ] Button active: presses down-right

Open `http://localhost:6173` (All Playlists):
- [ ] Page title: huge uppercase bold
- [ ] Filter bar: search input + visible-bordered day buttons
- [ ] Playlist rows in a card with black border + shadow
- [ ] Empty state (if no playlists): centered card with larger bold title + smaller body

Open `http://localhost:6173/duplicates`:
- [ ] Page header: "Duplicates" title + "Delete N duplicates" button side by side
- [ ] Group cards with proper row styling

Open `http://localhost:6173/tag`:
- [ ] Page intro text (grey, no inline style)
- [ ] Ghost buttons in bulk bar are black text (not grey muted)

Open `http://localhost:6173/recent`:
- [ ] Page intro text renders correctly
- [ ] Error message has margin below (from CSS)

Resize to 375px on all pages:
- [ ] No horizontal scroll on any page
- [ ] Nav brand truncates cleanly (no overflow)
- [ ] Bulk action bar buttons remain tappable

- [ ] **Step 8: Commit**

```bash
git add web/client/src/pages/LoginPage.tsx \
        web/client/src/pages/PlaylistsPage.tsx \
        web/client/src/pages/DuplicatesPage.tsx \
        web/client/src/pages/RecentPage.tsx \
        web/client/src/pages/TagPage.tsx
git commit -m "style: replace inline styles with design system classnames"
```
