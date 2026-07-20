# Design: NestJS + React Web UI

**Date:** 2026-07-20
**Branch:** `feat/nestjs-ui`
**Sub-project:** 2 of 3 — Full-stack web app

---

## Overview

A full-stack web application that exposes all four CLI playlist management modes
(deduplicate, tag with [SPO], search & delete, delete recent) through a responsive,
neo-brutal UI. Built on NestJS (backend) + Vite/React (frontend), designed to be
extensible to future music providers (Spotify, Apple Music).

The user writes all NestJS pieces (modules, controllers, services, guards, strategies,
SSE endpoints). The frontend (React components, CSS, Vite config) is pre-written.

---

## File Layout

```
youtube-playlist-deleter/
├── src/                          ← existing CLI (untouched)
├── web/
│   ├── package.json              ← NestJS backend deps
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── .env.example
│   └── src/
│       ├── main.ts               ← bootstrap, session middleware, static serve
│       ├── app.module.ts         ← root module
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts   ← /auth/login, /auth/callback
│       │   ├── auth.service.ts      ← token exchange + refresh
│       │   ├── auth.guard.ts        ← protects /api/* routes
│       │   └── google.strategy.ts   ← Passport GoogleStrategy
│       ├── providers/
│       │   ├── music-provider.interface.ts   ← shared contract
│       │   ├── providers.module.ts
│       │   └── youtube/
│       │       ├── youtube.provider.ts       ← implements MusicProvider
│       │       └── youtube.module.ts
│       └── playlists/
│           ├── playlists.module.ts
│           ├── playlists.controller.ts       ← REST + SSE routes
│           └── playlists.service.ts          ← delegates to MusicProvider
└── web/client/                   ← Vite + React (pre-written by assistant)
    ├── package.json
    ├── vite.config.ts            ← proxies /api & /auth to :3000
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── pages/
        │   ├── PlaylistsPage.tsx     ← main list, search, filter, bulk select
        │   ├── DuplicatesPage.tsx
        │   ├── TagPage.tsx
        │   └── RecentPage.tsx
        ├── components/
        │   ├── PlaylistCard.tsx
        │   ├── FilterBar.tsx
        │   ├── BulkActionBar.tsx
        │   ├── ProgressDrawer.tsx    ← SSE consumer
        │   ├── ProviderChip.tsx
        │   └── Nav.tsx
        └── styles/
            ├── tokens.css            ← design tokens
            ├── neo-brutal.css        ← component classes
            └── reset.css
```

---

## Provider Abstraction

All playlist operations are routed through a `MusicProvider` interface. Only
`YoutubeProvider` is implemented now; Spotify and Apple Music are future additions
that implement the same contract without touching controllers or services.

```typescript
// src/providers/music-provider.interface.ts

export interface Playlist {
  id: string
  title: string
  description: string
  itemCount: number
  publishedAt: string          // ISO 8601
  provider: 'youtube' | 'spotify' | 'apple'
}

export interface DuplicateGroup {
  name: string
  playlists: Playlist[]        // sorted: most tracks first, then oldest
  keepIndex: number
}

export interface MusicProvider {
  readonly name: string
  listPlaylists(token: string): Promise<Playlist[]>
  deletePlaylist(token: string, id: string): Promise<void>
  renamePlaylist(token: string, id: string, title: string, description: string): Promise<void>
}

export const MUSIC_PROVIDER = Symbol('MUSIC_PROVIDER')
```

`ProvidersModule` registers `YoutubeProvider` under the `MUSIC_PROVIDER` token.
`PlaylistsService` injects `@Inject(MUSIC_PROVIDER) private provider: MusicProvider`.

---

## Authentication Flow

Web OAuth — tokens live in a server-side session, never in the browser.

```
1. Browser  →  GET /auth/login
2. NestJS   →  301 to Google consent screen
3. Google   →  GET /auth/callback?code=...&state=...
4. NestJS   →     exchange code for { access_token, refresh_token, expiry_date }
               →  store in req.session.token
               →  302 to /
5. All /api/* routes   →  AuthGuard reads req.session.token
                       →  401 if missing, auto-refresh if expired
6. React app           →  on 401, redirect window.location to /auth/login
```

**Packages:** `passport`, `passport-google-oauth20`, `@nestjs/passport`,
`express-session`, `@types/express-session`, `@types/passport-google-oauth20`.

**Session store:** in-memory (`express-session` default) — fine for a local tool.
Production would use `connect-redis` but that is out of scope.

**`credentials.json`** — the same GCP OAuth Desktop client used by the CLI.
Copy `client_id` and `client_secret` from it into `web/.env`.
You must also add `http://localhost:3000/auth/callback` as an authorized
redirect URI in GCP Console (APIs & Services → Credentials → your OAuth 2.0 Client).

---

## API Surface

All routes under `/api/*` require `AuthGuard`.

```
GET    /auth/login                     → redirect to Google OAuth
GET    /auth/callback                  → exchange code, set session, redirect /

GET    /api/playlists                  → list all playlists
       ?search=<string>                  filter by title substring
       ?days=<number>                    filter by age (created within N days)
       ?provider=youtube                 (future: spotify | apple)

DELETE /api/playlists                  → bulk delete
       body: { ids: string[] }

PUT    /api/playlists/:id              → rename
       body: { title: string }

GET    /api/playlists/duplicates       → DuplicateGroup[]

GET    /api/playlists/tag-candidates   → untagged playlists for [SPO] mode

POST   /api/jobs                       → start delete job
       body: { ids: string[] }
       returns: { jobId: string }

GET    /api/jobs/:jobId/progress       → SSE stream (text/event-stream)
       events: { done: number, total: number, current: string, error?: string }
       final: { done: number, total: number, complete: true }
```

### Deletion job flow

Deletion can take minutes for large batches (50 YouTube API units per delete,
10 000 unit daily quota). The two-step job model keeps the HTTP connection clean:

1. `POST /api/jobs` → kicks off async deletion loop, returns `jobId` immediately
2. `GET /api/jobs/:jobId/progress` (SSE) → streams one event per delete until done
3. On quota error mid-batch: SSE emits `{ error: 'quotaExceeded', done, total }` and closes

Jobs are stored in-process (`Map<string, JobState>`) — sufficient for a single-user
local tool.

---

## NestJS Concepts (What the User Writes)

Each task introduces one concept in isolation before it is wired in:

| Task | Concept | File the user writes |
|------|---------|----------------------|
| 1 | `@Module()` + DI container | `PlaylistsModule` |
| 2 | `@Controller()` + `@Get()` | `PlaylistsController` (list endpoint) |
| 3 | `@Injectable()` service | `PlaylistsService.listPlaylists()` |
| 4 | `@UseGuards()` + `CanActivate` | `AuthGuard` |
| 5 | Passport `Strategy` + `@nestjs/passport` | `GoogleStrategy` |
| 6 | `@Delete()` + `@Body()` + job map | `PlaylistsController` (delete endpoint) |
| 7 | `@Sse()` + `Observable` | `JobsController` (SSE progress stream) |

The assistant explains each concept after the user writes it — what it does, why NestJS
does it this way, and how it compares to the express.js equivalent the user might know.

---

## Frontend (Pre-Written by Assistant)

### Pages

| Route | Page | Features |
|-------|------|---------|
| `/` | `PlaylistsPage` | search bar, days filter, infinite scroll (Intersection Observer), bulk select, bulk action bar |
| `/duplicates` | `DuplicatesPage` | grouped cards, keep/delete toggle per group |
| `/tag` | `TagPage` | [SPO] candidates, recommended highlighted, select all / toggle |
| `/recent` | `RecentPage` | date range input (re-uses CLI's `parseTimeRange` units), filtered list, bulk confirm |
| `/login` | `LoginPage` | "Connect YouTube" button → `/auth/login` |

### SSE Integration

`ProgressDrawer` opens an `EventSource` to `/api/jobs/:jobId/progress` after
`POST /api/jobs` resolves. It renders a live progress bar until the `complete`
event closes the stream. On error event it shows the quota message with retry guidance.

### Infinite Scroll

`PlaylistsPage` uses `IntersectionObserver` on a sentinel div at the bottom of the
list. On intersection, it fetches the next page from `/api/playlists?offset=N`.
The backend paginates in-memory from the cached playlist array.

---

## Visual Design System

### Tokens (`styles/tokens.css`)

```css
:root {
  --bg:      #F5F0E8;   /* warm cream */
  --ink:     #0A0A0A;
  --pink:    #FF2D55;   /* primary action */
  --yellow:  #FFE600;   /* selection highlight */
  --blue:    #0057FF;   /* nav, links */
  --green:   #00D084;   /* success */
  --surface: #FFFFFF;
  --border:  2px solid var(--ink);
  --shadow:  4px 4px 0 var(--ink);
  --shadow-lg: 6px 6px 0 var(--ink);
  --radius:  0px;
  --font-display: 'Syne', sans-serif;
  --font-ui:      'Space Grotesk', sans-serif;
}
```

### Component rules

- **Cards:** `background: var(--surface)`, `border: var(--border)`, `box-shadow: var(--shadow)`. Hover → `--shadow-lg` + `transform: translate(-2px, -2px)`.
- **Buttons (primary):** `background: var(--pink)`, `border: var(--border)`, `box-shadow: var(--shadow)`. Active → `transform: translate(4px, 4px)`, shadow removed (pressed-in feel).
- **Buttons (secondary):** `background: var(--yellow)`, same border + shadow.
- **Selected rows:** `border-left: 4px solid var(--yellow)` + `background: rgba(255,230,0,0.12)` — highlighter-marker effect.
- **Checkboxes:** 24×24px, `3px solid ink`. Checked → `background: var(--yellow)`, bold `✓`.
- **Bulk action bar:** fixed bottom, `background: var(--ink)`, white text, `--pink` delete button, slides up when ≥1 item selected.
- **Progress bar:** `height: 20px`, diagonal stripe fill (`repeating-linear-gradient`), animated.
- **Provider chip:** small badge, `background: var(--pink)`, `border: 1px solid ink`, `font: Syne 700`.

### Fonts (Google Fonts CDN)

```html
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
```

---

## Dev Setup

```bash
# Terminal 1 — NestJS
cd web && npm run start:dev     # :3000

# Terminal 2 — Vite
cd web/client && npm run dev    # :5173, proxies /api + /auth → :3000
```

Vite proxy config (`vite.config.ts`):
```typescript
server: {
  proxy: {
    '/api': 'http://localhost:3000',
    '/auth': 'http://localhost:3000',
  }
}
```

**Environment variables** (`.env` in `web/`):
```
GOOGLE_CLIENT_ID=...       # from credentials.json
GOOGLE_CLIENT_SECRET=...   # from credentials.json
SESSION_SECRET=change-me-local
PORT=3000
```

---

## Out of Scope

- Spotify provider (Sub-project 3)
- Apple Music provider (Sub-project 3)
- Production deployment / HTTPS
- Multi-user / multi-account support
- Persistent session store (Redis)
- Database (all state is in-process or via YouTube API)
- Unit tests for the frontend
- Mobile app
