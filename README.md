# YouTube Playlist Manager

A local TypeScript TUI tool to clean up YouTube Music playlists after a Spotify migration.

## Features

| Mode | What it does |
|------|-------------|
| **Find duplicates** | Groups playlists with the same name, pre-selects the one with the most tracks to keep, lets you review and delete the rest |
| **Tag [SPO]** | Renames Spotify-imported playlists by adding a `[SPO]` prefix so they're easy to filter in YouTube Music. Pre-selects playlists created in the last 30 days (your recent migration batch), with an auto-confirm shortcut |
| **Search & delete** | Type a keyword, pick from matching playlists, delete with confirmation |

## Requirements

- Node.js 18 or later (`node --version` to check)
- A Google Cloud project with the YouTube Data API v3 enabled (free, one-time ~5 min setup)

## Setup

### 1. Google Cloud (one-time)

1. Go to https://console.cloud.google.com → create a new project
2. Search "YouTube Data API v3" → **Enable**
3. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Application type: **Desktop app** → Create
5. Download JSON → rename to `credentials.json` → place in this folder
6. **OAuth consent screen → Test users** → add your Google account email

> Staying in **Testing** mode means only your whitelisted account can log in — no app verification needed.

### 2. Install and run

```bash
npm install
npm run dev
```

On first run, your browser opens for Google login. After approval, tokens are saved to `tokens.json` — you won't need to log in again.

## TUI controls

### Duplicate finder
| Input | Action |
|-------|--------|
| `1`–`10` | Flip the keeper in that group |
| `n` / `p` | Next / previous page |
| `d` | Done reviewing |

### [SPO] tagger
| Input | Action |
|-------|--------|
| `1`–`10` | Toggle a playlist on/off |
| `a` | Auto-confirm — select all recommended (★) playlists |
| `n` / `p` | Next / previous page |
| `d` | Done reviewing |

★ = created in the last 30 days (recommended for tagging)

### Search & delete
Type a search query → results appear → enter comma-separated numbers or `all` → confirm.

## Security

- `credentials.json` and `tokens.json` are gitignored — never leave your machine
- OAuth server binds to `127.0.0.1:8080` only — not reachable from the network
- Only calls `accounts.google.com` (login) and `www.googleapis.com` (API)
- Scope: `youtube` — minimum required for playlist write access

## API quota

YouTube free quota: **10,000 units/day**

| Operation | Cost |
|-----------|------|
| List all playlists (1,000 total) | ~20 units |
| Delete a playlist | 50 units |
| Rename a playlist | 50 units |

~200 deletes or renames per day on the free tier. If quota is hit mid-run, the app stops cleanly — re-run the next day from where it left off (already-deleted/renamed playlists won't reappear).

## Architecture

```
src/
  types.ts   — Playlist, DuplicateGroup, PlaylistRename, TokenData, Credentials, MenuChoice
  auth.ts    — OAuth 2.0 flow + token storage/refresh (127.0.0.1:8080 loopback)
  api.ts     — YouTube Data API v3 client: listAllPlaylists, deletePlaylist, renamePlaylist
  dedup.ts   — groups playlists by exact name, pre-selects keeper by track count
  tui.ts     — all TUI screens (readline + ANSI — no third-party UI libs)
  index.ts   — orchestrator: auth → fetch → main menu → mode routing
```

### Data flow

```
start → ensureAuth() → listAllPlaylists()
  → showMainMenu()
      → deduplicate:  findDuplicates → reviewGroups → confirmDeletion → deletePlaylist×N
      → tag:          build PlaylistRename[] → reviewRenames → confirmRenames → renamePlaylist×N
      → search:       searchAndSelect → confirmDeletion → deletePlaylist×N
  → refresh playlist list → showMainMenu() again
```

## Extending

- **Case-insensitive duplicates:** change `byName.get(p.title)` in `dedup.ts` to `p.title.toLowerCase()`
- **Different prefix:** change `SPO_PREFIX` in `index.ts`
- **Different age window:** change `THIRTY_DAYS_MS` in `index.ts`
- **Dry-run mode:** check `process.argv.includes('--dry-run')` in `index.ts` and skip the actual API mutation calls
- **Better navigation:** swap `src/tui.ts` for an inquirer-based implementation — the exported function signatures stay the same
