# Design: Delete Recent Playlists Mode

**Date:** 2026-07-20
**Sub-project:** 1 of 3 — CLI feature

## Context

The app currently has three modes: deduplicate, tag with [SPO], and search & delete.
After a Spotify migration, users commonly want to bulk-delete recently imported playlists (< 30 days old) that they no longer need. This adds a fourth mode for that workflow.

## What It Does

New main menu option: **"4. Delete recent playlists"**

1. Filters all fetched playlists to those created within the last 30 days (`publishedAt`)
2. Shows a paginated review screen — all entries pre-selected, user can toggle any off
3. User confirms by typing `yes`
4. Runs deletions with progress indicator and final summary
5. Returns to main menu

## Changes

### `src/tui.ts`

Add `reviewRecentDeletions(playlists: Playlist[]): Promise<Playlist[]>`:
- Renders a paginated list (10 per page) matching the style of `reviewRenames`
- Each entry shows: title, creation date, track count
- All pre-selected (`[✓]`) since every item already matches the age filter
- Controls: `[number]` toggle, `[a]` select all, `[n/p]` page, `[d]` done
- Returns the final selected subset

Update `showMainMenu()`:
- Add `'4  Delete recent playlists'` option
- Shift `Exit` from `4` to `5`
- Extend `MenuChoice` type with `'delete-recent'`

### `src/types.ts`

Extend `MenuChoice`:
```typescript
export type MenuChoice = 'deduplicate' | 'tag' | 'search' | 'delete-recent' | 'exit'
```

### `src/index.ts`

Add `runDeleteRecent(token, playlists)`:
- Filters `playlists` to those where `Date.now() - new Date(p.publishedAt) < THIRTY_DAYS_MS`
- If none found: prints "No playlists created in the last 30 days." and returns token
- Calls `reviewRecentDeletions()` → user picks subset
- Calls `confirmDeletion()` → user types `yes`
- Calls `runDeletions()` → progress + summary
- Returns updated token

Wire into main loop:
```typescript
if (choice === 'delete-recent') token = await runDeleteRecent(token, playlists)
```

## Reuse

- `THIRTY_DAYS_MS` constant — already defined in `index.ts`
- `confirmDeletion()` — existing, reused as-is
- `runDeletions()` — existing, reused as-is
- `showProgress()` / `showSummary()` — existing, reused as-is

No new constants, no new files.

## Error Handling

Inherits all existing error handling from `runDeletions()`:
- Token refresh on 401
- Quota exceeded stops cleanly with message
- Per-item errors logged, loop continues

## Out of Scope

- Configurable age threshold (30 days is hardcoded via the existing constant)
- Filtering by [SPO] prefix
- Sub-project 2 (Web UI with NestJS + neo-brutal frontend)
- Sub-project 3 (Spotify / Apple Music)
