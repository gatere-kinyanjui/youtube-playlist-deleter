# YouTube Playlist Deduper — Design Spec

**Date:** 2026-07-06
**Status:** Approved
**Language:** TypeScript (Node.js 18+)
**Dependencies:** Zero runtime npm packages (only `typescript` + `@types/node` as dev deps)

---

## Problem

After migrating 1000+ Spotify playlists to YouTube Music, duplicate playlists were created — multiple playlists with the exact same name. I need a local tool to identify and delete the duplicates, with full control over what gets deleted before anything happens.

---

## Goals

- List all YouTube Music playlists via the official YouTube Data API v3
- Detect duplicates by **exact name match**
- For each duplicate group, **pre-select the playlist with the most tracks** as the keeper
- Present a TUI (terminal UI) review screen where the user can confirm or override each group's selection
- Require a final explicit confirmation before any deletion occurs
- Provide clear progress and a summary after deletion

## Non-Goals

- Deduplication by track content (only name-based)
- Batch/scheduled runs
- Any web hosting or deployment — this is a local, one-off tool
- GUI or browser-based UI

---

## Architecture

Five focused TypeScript modules under `src/`, each with one responsibility:

```
youtube-playlist-deleter/
├── src/
│   ├── index.ts     # Entry point — orchestrates full flow
│   ├── auth.ts      # OAuth 2.0 login, token storage, token refresh
│   ├── api.ts       # YouTube Data API v3 client (native fetch, no SDK)
│   ├── dedup.ts     # Duplicate detection + keeper pre-selection logic
│   └── tui.ts       # TUI rendering + readline-based user interaction
├── credentials.json # GITIGNORED — user's Google OAuth client_id/secret
├── tokens.json      # GITIGNORED — auto-saved access/refresh tokens
├── .gitignore
├── package.json
└── tsconfig.json
```

---

## Data Flow

```
App start
  │
  ├── tokens.json exists?
  │     Yes → try to refresh access token
  │     No  → run OAuth flow:
  │             open browser to Google consent URL
  │             start local HTTP server on 127.0.0.1:8080
  │             catch redirect with auth code
  │             exchange code for access + refresh tokens
  │             save tokens.json
  │
  ├── Fetch all playlists (YouTube API, paginated 50/page)
  │
  ├── Group playlists by exact name
  │     → discard groups with only 1 playlist (no duplicate)
  │
  ├── Pre-select keeper = playlist with most tracks
  │     (itemCount already available from listAllPlaylists — no extra API call)
  │     (tie-break: oldest creation date wins)
  │
  ├── TUI review screen
  │     Paginated (10 groups per screen)
  │     Each group shows: name, playlist count, track counts, keeper marked ✓
  │     User types group number to flip the keeper
  │     User types 'n' to enter next page, 'p' for previous, 'd' when done
  │
  ├── Final confirmation prompt
  │     "X playlists across Y groups will be deleted. Proceed? [y/N]"
  │
  ├── Delete marked playlists (sequential, with live progress counter)
  │     Stop cleanly on quota exhaustion — show how many completed
  │
  └── Summary: "Done. Deleted X playlists, cleaned up Y duplicate groups."
```

---

## Module Contracts

### `auth.ts`

```typescript
// Ensures a valid access token is available. Runs OAuth flow if needed.
// Returns the access token string.
async function ensureAuth(): Promise<string>;

// Refreshes the access token using the stored refresh token.
// Throws if refresh fails (e.g. token revoked).
async function refreshToken(): Promise<string>;
```

**OAuth details:**

- Flow: Authorization Code (installed app / loopback)
- Local redirect URI: `http://127.0.0.1:8080/oauth2callback`
- Scope: `https://www.googleapis.com/auth/youtube`
- Tokens saved to `tokens.json` (access_token, refresh_token, expiry_date)
- Server shuts down immediately after receiving the callback

### `api.ts`

```typescript
async function listAllPlaylists(token: string): Promise<Playlist[]>;
async function deletePlaylist(token: string, playlistId: string): Promise<void>;
```

```typescript
interface Playlist {
  id: string;
  title: string;
  itemCount: number; // from contentDetails — fetched with part=snippet,contentDetails
  publishedAt: string; // ISO 8601
}
```

All functions use native `fetch`. Pagination handled internally in `listAllPlaylists` (follows `nextPageToken`). Retries: up to 3 attempts with 2s delay on network errors.

### `dedup.ts`

```typescript
interface DuplicateGroup {
  name: string;
  playlists: Playlist[]; // sorted: most tracks first
  keepIndex: number; // index of the pre-selected keeper (default 0)
}

function findDuplicates(playlists: Playlist[]): DuplicateGroup[];
```

Groups playlists by exact title. Returns only groups with 2+ playlists. Within each group, sorts by `itemCount` descending, then `publishedAt` ascending (oldest wins tie-breaks). `keepIndex` always starts at 0 (the playlist with most tracks).

### `tui.ts`

```typescript
async function reviewGroups(
  groups: DuplicateGroup[],
): Promise<DuplicateGroup[]>;
async function confirmDeletion(toDelete: Playlist[]): Promise<boolean>;
function showProgress(current: number, total: number): void;
function showSummary(deleted: number, groups: number): void;
```

Uses Node.js built-in `readline` for input. ANSI escape codes for color (green = keeper, red = to delete, bold = group header). No third-party libraries.

---

## Error Handling

| Error                        | Handling                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `credentials.json` missing   | Print step-by-step setup instructions, exit 1                                    |
| OAuth flow fails / times out | Clear message, exit 1                                                            |
| 401 Unauthorized             | Auto-refresh token; if refresh fails, delete `tokens.json` and restart auth      |
| 403 Quota exceeded           | Stop deletions, print count of completed deletions, tell user to re-run tomorrow |
| 404 Not Found (on delete)    | Skip silently — playlist already deleted manually                                |
| Network error                | Retry up to 3× with 2s delay; bail with message after 3 failures                 |
| No duplicates found          | Print friendly message, exit 0                                                   |

All errors go to `stderr`. Normal output goes to `stdout`.

---

## Security

- `credentials.json` and `tokens.json` are gitignored from project init
- Local OAuth server binds to `127.0.0.1` (loopback only) — not reachable from the network
- OAuth scope is the minimum required for playlist deletion (`youtube` — YouTube offers no narrower write scope)
- Tokens stored as plaintext JSON locally (acceptable for a personal local tool; same pattern as `gcloud` CLI)
- No telemetry. External calls: `accounts.google.com` (OAuth) and `www.googleapis.com` (API) only
- Google Cloud app stays in **Testing** mode — only your whitelisted account can log in

---

## API Quota

YouTube Data API v3 free quota: **10,000 units/day**

| Operation                                            | Cost     |
| ---------------------------------------------------- | -------- |
| List playlists (per page of 50, with contentDetails) | 1 unit   |
| Delete playlist                                      | 50 units |

With 1,000 playlists: ~20 units to list them all. If 500 are duplicates to delete: 25,000 units — exceeds the daily limit.

**Mitigation:** The app detects quota exhaustion (403 with `quotaExceeded` reason), stops cleanly, reports progress, and tells the user to re-run the next day. Re-runs are safe — already-deleted playlists won't reappear.

---

## One-Time Setup (for the user)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable the **YouTube Data API v3**
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Desktop app**
6. Download the JSON, rename it `credentials.json`, place it in the project root
7. Go to **OAuth consent screen → Test users** and add your Google account email
8. Run the app: `npx ts-node src/index.ts`

---

## Future Improvements (out of scope for now)

- Case-insensitive duplicate detection (Option B from brainstorming)
- Dry-run mode (`--dry-run` flag)
- Export deletion log to CSV
- Upgrade to inquirer for arrow-key navigation if 100+ groups becomes tedious
