# Design: Delete Recent Playlists Mode

**Date:** 2026-07-20
**Sub-project:** 1 of 3 — CLI feature

## Context

The app currently has three modes: deduplicate, tag with [SPO], and search & delete.
After a Spotify migration, users want to bulk-delete recently imported playlists newer than a
custom time threshold. This adds a fourth mode with a flexible time-range filter.

## What It Does

New main menu option: **"4. Delete recent playlists"**

1. Prompts user to enter a time range (e.g. `2 weeks`, `30 days`, `6 hours`, `3 months`)
2. Parses the input into milliseconds
3. Filters all fetched playlists to those created within that window
4. Shows a paginated review screen — all entries pre-selected, user can toggle any off
5. User confirms by typing `yes`
6. Runs deletions with progress indicator and final summary
7. Returns to main menu (where playlist list is refreshed)

## Time Range Input

### Supported units (case-insensitive, singular or plural)

| Input examples | Resolves to |
|----------------|-------------|
| `6 hours` / `6h` | 6 × 3 600 000 ms |
| `2 days` / `2d` | 2 × 86 400 000 ms |
| `3 weeks` / `3w` | 3 × 604 800 000 ms |
| `1 month` / `1mo` | 30 × 86 400 000 ms (calendar approx.) |

### Parsing (`src/time.ts` — new file)

```typescript
export function parseTimeRange(input: string): number | null
```

- Trims and lowercases input
- Regex: `/^(\d+)\s*(h|hour|hours|d|day|days|w|week|weeks|mo|month|months)$/`
- Returns ms on match, `null` on invalid input
- No external dependencies

### Invalid input handling

Loops back with an inline error message:  
`  Invalid range. Try: 6 hours, 3 days, 2 weeks, 1 month`

## Changes

### `src/time.ts` (new)

`parseTimeRange(input: string): number | null` — pure function, zero deps.

### `src/types.ts`

Extend `MenuChoice`:
```typescript
export type MenuChoice = 'deduplicate' | 'tag' | 'search' | 'delete-recent' | 'exit'
```

### `src/tui.ts`

**Add `promptTimeRange(): Promise<number>`**
- Prints prompt: `  Delete playlists newer than (e.g. 2 weeks, 30 days, 6 hours):`
- Reads input, calls `parseTimeRange()`
- Loops on `null` until valid input

**Add `reviewRecentDeletions(playlists: Playlist[], label: string): Promise<Playlist[]>`**
- `label` is the human-readable range string (e.g. `"2 weeks"`) shown in the header
- Paginated list (10/page), all pre-selected `[✓]`
- Each row: title, creation date, track count
- Controls: `[number]` toggle, `[a]` select all, `[n/p]` page, `[d]` done
- Returns the final selected subset

**Update `showMainMenu()`**
- Add option `4  Delete recent playlists`
- Shift `Exit` from `4` → `5`

### `src/index.ts`

**Add `runDeleteRecent(token, playlists)`**
```
promptTimeRange()
  → filter playlists by windowMs
  → if none: print message, return token
  → reviewRecentDeletions()
  → confirmDeletion()
  → runDeletions()
  → showSummary()
  → return updated token
```

Wire into main loop:
```typescript
if (choice === 'delete-recent') token = await runDeleteRecent(token, playlists)
```

Remove `THIRTY_DAYS_MS` constant — no longer needed (time range is now user-driven).

## Reuse

- `confirmDeletion()` — existing, reused as-is
- `runDeletions()` — existing, reused as-is
- `showProgress()` / `showSummary()` — existing, reused as-is

## Error Handling

- Invalid time range: inline error, re-prompt (no crash)
- Zero matches: graceful message, returns to menu
- Inherits token refresh, quota handling from `runDeletions()`

## Out of Scope

- Multiple simultaneous ranges (e.g. "between 1 and 3 weeks")
- Filtering by [SPO] prefix
- Sub-project 2 (Web UI — NestJS backend + neo-brutal React frontend)
- Sub-project 3 (Spotify / Apple Music)
