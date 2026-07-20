# Delete Recent Playlists — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fourth CLI mode that lets the user enter a custom time range (hours / days / weeks / months), review matching playlists, and bulk-delete them.

**Architecture:** A new pure-function module `src/time.ts` handles parsing; two new TUI functions handle the prompt and review screen; a new orchestrator function `runDeleteRecent()` wires them together following the exact same pattern as the three existing modes.

**Tech Stack:** TypeScript 6, Node.js 26 built-ins, Vitest 2 (unit tests for the parser only — TUI functions are not unit-tested due to stdin dependency).

## Global Constraints

- TypeScript strict mode — no `any`, no `!` non-null assertions
- No new runtime npm dependencies
- All new exports must be named exports (no default exports — existing codebase convention)
- `THIRTY_DAYS_MS` in `src/index.ts` must NOT be removed — it is still used by `runTag()`
- Build command: `npm run build` (must exit 0 with zero errors before each commit)
- Test command: `npm test` (must exit 0 before each commit)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/time.ts` | **Create** | `parseTimeRange()` — pure parser, no I/O |
| `src/time.test.ts` | **Create** | Vitest unit tests for `parseTimeRange()` |
| `src/types.ts` | **Modify** | Add `'delete-recent'` to `MenuChoice` |
| `src/tui.ts` | **Modify** | Add `promptTimeRange()`, `reviewRecentDeletions()`, update `showMainMenu()` |
| `src/index.ts` | **Modify** | Add `runDeleteRecent()`, wire into main loop |
| `package.json` | **Modify** | Add `vitest` devDep, add `"test"` script |

---

### Task 1: Time parser + test framework

**Files:**
- Create: `src/time.ts`
- Create: `src/time.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `parseTimeRange(input: string): number | null`
  - Returns milliseconds on valid input, `null` otherwise
  - `null` also returned for zero or negative numbers

- [ ] **Step 1: Add Vitest**

```bash
npm install --save-dev vitest@^2.0.0
```

- [ ] **Step 2: Add test script to `package.json`**

In `package.json`, add `"test"` to `"scripts"`:

```json
"scripts": {
  "build": "tsc",
  "start": "node dist/index.js",
  "dev": "npx ts-node src/index.ts",
  "test": "vitest run"
}
```

- [ ] **Step 3: Write the failing tests**

Create `src/time.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseTimeRange } from './time'

const H = 3_600_000
const D = 86_400_000
const W = 7 * D
const MO = 30 * D

describe('parseTimeRange', () => {
  // valid — long form
  it('parses "6 hours"',  () => expect(parseTimeRange('6 hours')).toBe(6 * H))
  it('parses "2 days"',   () => expect(parseTimeRange('2 days')).toBe(2 * D))
  it('parses "3 weeks"',  () => expect(parseTimeRange('3 weeks')).toBe(3 * W))
  it('parses "1 month"',  () => expect(parseTimeRange('1 month')).toBe(1 * MO))
  it('parses "2 months"', () => expect(parseTimeRange('2 months')).toBe(2 * MO))

  // valid — short form
  it('parses "6h"',  () => expect(parseTimeRange('6h')).toBe(6 * H))
  it('parses "2d"',  () => expect(parseTimeRange('2d')).toBe(2 * D))
  it('parses "3w"',  () => expect(parseTimeRange('3w')).toBe(3 * W))
  it('parses "1mo"', () => expect(parseTimeRange('1mo')).toBe(1 * MO))

  // case + whitespace
  it('is case-insensitive',         () => expect(parseTimeRange('2 WEEKS')).toBe(2 * W))
  it('trims surrounding whitespace', () => expect(parseTimeRange('  3 days  ')).toBe(3 * D))
  it('allows multiple spaces between number and unit', () => expect(parseTimeRange('3  days')).toBe(3 * D))

  // singular
  it('parses "1 hour"', () => expect(parseTimeRange('1 hour')).toBe(1 * H))
  it('parses "1 day"',  () => expect(parseTimeRange('1 day')).toBe(1 * D))
  it('parses "1 week"', () => expect(parseTimeRange('1 week')).toBe(1 * W))

  // invalid
  it('returns null for empty string',   () => expect(parseTimeRange('')).toBeNull())
  it('returns null for unknown unit',   () => expect(parseTimeRange('5 years')).toBeNull())
  it('returns null for unit only',      () => expect(parseTimeRange('days')).toBeNull())
  it('returns null for zero',           () => expect(parseTimeRange('0 days')).toBeNull())
  it('returns null for decimal',        () => expect(parseTimeRange('1.5 days')).toBeNull())
  it('returns null for negative',       () => expect(parseTimeRange('-1 days')).toBeNull())
  it('returns null for missing space and no shorthand', () => expect(parseTimeRange('3days')).toBeNull())
})
```

- [ ] **Step 4: Run tests — expect ALL to fail**

```bash
npm test
```

Expected: errors like `Cannot find module './time'`.

- [ ] **Step 5: Implement `src/time.ts`**

```typescript
const MS_PER: Record<string, number> = {
  h: 3_600_000,
  hour: 3_600_000,
  hours: 3_600_000,
  d: 86_400_000,
  day: 86_400_000,
  days: 86_400_000,
  w: 7 * 86_400_000,
  week: 7 * 86_400_000,
  weeks: 7 * 86_400_000,
  mo: 30 * 86_400_000,
  month: 30 * 86_400_000,
  months: 30 * 86_400_000,
}

export function parseTimeRange(input: string): number | null {
  const match = input
    .trim()
    .toLowerCase()
    .match(/^(\d+)\s*(h|hour|hours|d|day|days|w|week|weeks|mo|month|months)$/)
  if (!match) return null
  const n = parseInt(match[1], 10)
  if (n <= 0) return null
  const ms = MS_PER[match[2]]
  return ms !== undefined ? n * ms : null
}
```

- [ ] **Step 6: Run tests — expect all to pass**

```bash
npm test
```

Expected output:
```
✓ src/time.test.ts (22 tests)
Test Files  1 passed (1)
Tests       22 passed (22)
```

- [ ] **Step 7: Build — confirm zero errors**

```bash
npm run build
```

Expected: exits 0, no output.

- [ ] **Step 8: Commit**

```bash
git add src/time.ts src/time.test.ts package.json package-lock.json
git commit -m "feat: add time range parser with vitest suite"
```

---

### Task 2: Extend types + update menu

**Files:**
- Modify: `src/types.ts`
- Modify: `src/tui.ts` (showMainMenu only)

**Interfaces:**
- Consumes: nothing new
- Produces: `MenuChoice` now includes `'delete-recent'`; `showMainMenu()` returns `'delete-recent'` when user presses `4`

- [ ] **Step 1: Update `MenuChoice` in `src/types.ts`**

Replace:
```typescript
export type MenuChoice = 'deduplicate' | 'tag' | 'search' | 'exit'
```
With:
```typescript
export type MenuChoice = 'deduplicate' | 'tag' | 'search' | 'delete-recent' | 'exit'
```

- [ ] **Step 2: Update `showMainMenu()` in `src/tui.ts`**

Replace the body of `showMainMenu`:
```typescript
export async function showMainMenu(): Promise<MenuChoice> {
  const rl = makeRl()
  while (true) {
    console.clear()
    console.log(bold('\n YouTube Playlist Manager\n'))
    console.log(`  ${cyan('1')}  Find and delete duplicate playlists`)
    console.log(`  ${cyan('2')}  Tag Spotify-imported playlists with [SPO] prefix`)
    console.log(`  ${cyan('3')}  Search and delete playlists`)
    console.log(`  ${cyan('4')}  Delete recent playlists`)
    console.log(`  ${cyan('5')}  Exit\n`)
    const input = (await prompt(rl, '> ')).trim()
    if (input === '1') { rl.close(); return 'deduplicate' }
    if (input === '2') { rl.close(); return 'tag' }
    if (input === '3') { rl.close(); return 'search' }
    if (input === '4') { rl.close(); return 'delete-recent' }
    if (input === '5' || input === 'q') { rl.close(); return 'exit' }
  }
}
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/tui.ts
git commit -m "feat: add delete-recent to menu and MenuChoice type"
```

---

### Task 3: TUI screens — time prompt + review

**Files:**
- Modify: `src/tui.ts`

**Interfaces:**
- Consumes: `parseTimeRange` from `./time`; `Playlist` from `./types`
- Produces:
  - `promptTimeRange(): Promise<{ ms: number; label: string }>`
  - `reviewRecentDeletions(playlists: Playlist[], label: string): Promise<Playlist[]>`

- [ ] **Step 1: Add import to `src/tui.ts`**

At the top of `src/tui.ts`, after the existing imports, add:

```typescript
import { parseTimeRange } from './time'
```

- [ ] **Step 2: Add `promptTimeRange()` to `src/tui.ts`**

Add after the `showMainMenu` function:

```typescript
export async function promptTimeRange(): Promise<{ ms: number; label: string }> {
  const rl = makeRl()
  while (true) {
    console.clear()
    console.log(bold('\n Delete Recent Playlists\n'))
    const raw = (await prompt(rl, `  Newer than (e.g. 2 weeks, 30 days, 6 hours, 1 month): `)).trim()
    const ms = parseTimeRange(raw)
    if (ms !== null) {
      rl.close()
      return { ms, label: raw }
    }
    console.log(dim('\n  Invalid range. Try: 6 hours, 3 days, 2 weeks, 1 month\n'))
    await prompt(rl, dim('  Press Enter to try again...'))
  }
}
```

- [ ] **Step 3: Add render helper and `reviewRecentDeletions()` to `src/tui.ts`**

Add after `promptTimeRange`:

```typescript
function renderRecentPage(
  playlists: Playlist[],
  selected: boolean[],
  page: number,
  pageSize: number,
  label: string,
): void {
  const start = page * pageSize
  const end = Math.min(start + pageSize, playlists.length)
  const totalPages = Math.ceil(playlists.length / pageSize)
  const selectedCount = selected.filter(Boolean).length

  console.clear()
  console.log(bold(`\n Delete playlists newer than ${label}\n`))
  console.log(dim(`  Page ${page + 1}/${totalPages} · ${playlists.length} found · ${selectedCount} selected`))
  console.log(dim('  [number] toggle  [a] select all  [n] next  [p] prev  [d] done\n'))

  for (let i = start; i < end; i++) {
    const p = playlists[i]
    const localIdx = i - start + 1
    const check = selected[i] ? green('[✓]') : dim('[ ]')
    const date = p.publishedAt.slice(0, 10)
    const tracks = `${p.itemCount} track${p.itemCount !== 1 ? 's' : ''}`
    console.log(`  ${check} ${cyan(String(localIdx).padStart(2))}. ${p.title}`)
    console.log(`         ${dim(date)}  ${dim(tracks)}`)
    console.log()
  }
}

export async function reviewRecentDeletions(playlists: Playlist[], label: string): Promise<Playlist[]> {
  const PAGE_SIZE = 10
  const selected = playlists.map(() => true)
  let page = 0
  const totalPages = Math.ceil(playlists.length / PAGE_SIZE)
  const rl = makeRl()

  while (true) {
    renderRecentPage(playlists, selected, page, PAGE_SIZE, label)
    const input = (await prompt(rl, cyan('> '))).trim().toLowerCase()

    if (input === 'd') break
    if (input === 'n' && page < totalPages - 1) { page++; continue }
    if (input === 'p' && page > 0) { page--; continue }
    if (input === 'a') { selected.fill(true); continue }

    const num = parseInt(input, 10)
    const pageCount = Math.min(PAGE_SIZE, playlists.length - page * PAGE_SIZE)
    if (!isNaN(num) && num >= 1 && num <= pageCount) {
      selected[page * PAGE_SIZE + num - 1] = !selected[page * PAGE_SIZE + num - 1]
    }
  }

  rl.close()
  return playlists.filter((_, i) => selected[i])
}
```

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: exits 0.

- [ ] **Step 5: Run tests — still all pass**

```bash
npm test
```

Expected: 22 passing.

- [ ] **Step 6: Commit**

```bash
git add src/tui.ts
git commit -m "feat: add promptTimeRange and reviewRecentDeletions TUI screens"
```

---

### Task 4: Orchestrator — runDeleteRecent + main loop

**Files:**
- Modify: `src/index.ts`

**Interfaces:**
- Consumes:
  - `promptTimeRange(): Promise<{ ms: number; label: string }>` from `./tui`
  - `reviewRecentDeletions(playlists: Playlist[], label: string): Promise<Playlist[]>` from `./tui`
  - `confirmDeletion(toDelete: Playlist[]): Promise<boolean>` from `./tui` (existing)
  - `runDeletions(token: string, toDelete: Playlist[]): Promise<{ deleted: number; deletedIds: Set<string>; token: string }>` (existing internal)
  - `showSummary(count: number, label: string): void` from `./tui` (existing)
- Produces: `runDeleteRecent(token: string, playlists: Playlist[]): Promise<string>`

- [ ] **Step 1: Add new imports to `src/index.ts`**

Extend the existing tui import line to include the two new functions:

```typescript
import {
  showMainMenu,
  reviewGroups,
  reviewRenames,
  searchAndSelect,
  confirmDeletion,
  confirmRenames,
  showProgress,
  showSummary,
  promptTimeRange,
  reviewRecentDeletions,
} from './tui'
```

- [ ] **Step 2: Add `runDeleteRecent()` to `src/index.ts`**

Add after `runSearch` and before the `process.on('SIGINT')` block:

```typescript
async function runDeleteRecent(token: string, playlists: Playlist[]): Promise<string> {
  const { ms, label } = await promptTimeRange()
  const now = Date.now()
  const recent = playlists.filter(p => now - new Date(p.publishedAt).getTime() < ms)

  if (recent.length === 0) {
    console.log(`\n  No playlists created in the last ${label}.\n`)
    return token
  }

  console.log(`\n  Found ${recent.length} playlist${recent.length !== 1 ? 's' : ''} created in the last ${label}.\n`)

  const selected = await reviewRecentDeletions(recent, label)
  if (selected.length === 0) {
    console.log('\n  No playlists selected.\n')
    return token
  }

  const confirmed = await confirmDeletion(selected)
  if (!confirmed) { console.log('\n  Cancelled.\n'); return token }

  console.log()
  const { deleted, token: t } = await runDeletions(token, selected)
  showSummary(deleted, `playlist${deleted !== 1 ? 's' : ''} deleted`)
  return t
}
```

- [ ] **Step 3: Wire into the main loop in `src/index.ts`**

In the `run()` function, add the new case alongside the existing ones:

```typescript
if (choice === 'deduplicate')    token = await runDeduplicate(token, playlists)
if (choice === 'tag')            token = await runTag(token, playlists)
if (choice === 'search')         token = await runSearch(token, playlists)
if (choice === 'delete-recent')  token = await runDeleteRecent(token, playlists)
```

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: exits 0, zero errors.

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: 22 passing.

- [ ] **Step 6: Commit**

```bash
git add src/index.ts
git commit -m "feat: implement delete-recent-playlists mode with custom time range"
```

---

### Task 5: Manual smoke test

- [ ] **Step 1: Start the app**

```bash
npm start
```

- [ ] **Step 2: Verify menu shows 5 options**

Expected menu:
```
 YouTube Playlist Manager

  1  Find and delete duplicate playlists
  2  Tag Spotify-imported playlists with [SPO] prefix
  3  Search and delete playlists
  4  Delete recent playlists
  5  Exit
```

- [ ] **Step 3: Enter mode 4, test invalid inputs**

Press `4`. At the time range prompt, enter:
- `abc` → should show "Invalid range" error and re-prompt
- `0 days` → should show "Invalid range" error and re-prompt
- `5 years` → should show "Invalid range" error and re-prompt

- [ ] **Step 4: Test valid inputs and review screen**

Enter `2 weeks`. Expected: review screen with playlists created in the last 2 weeks, all `[✓]`.

Try toggling a number, `[a]`, `[n]`/`[p]`, then `[d]` to exit without deleting.

- [ ] **Step 5: Verify Ctrl+C exits cleanly at any prompt**

Press Ctrl+C at the time range prompt and at the review screen. Expected: `Interrupted.` message, clean exit.
