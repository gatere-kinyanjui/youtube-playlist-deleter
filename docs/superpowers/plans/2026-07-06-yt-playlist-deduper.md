# YouTube Playlist Deduper — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local TypeScript TUI tool that manages YouTube Music playlists: finds and deletes duplicates, tags Spotify-imported playlists with a `[SPO]` prefix, and lets the user search and delete playlists by keyword.

**Architecture:** A main menu routes to three modes — deduplicate, tag, search-and-delete — all sharing a single auth flow and playlist fetch. Six focused modules (`types`, `auth`, `api`, `dedup`, `tui`, `index`) communicate through well-defined interfaces.

**Tech Stack:** TypeScript 5, Node.js 18+ (native `fetch`, `readline`, `http`, `fs`, `crypto`), YouTube Data API v3. Zero runtime npm dependencies.

## Global Constraints

- Node.js ≥ 18.0.0 (native `fetch` required — no `node-fetch`)
- Zero runtime npm dependencies — only `typescript` and `@types/node` as devDependencies
- All source in `src/` — compiled output to `dist/`
- `credentials.json` and `tokens.json` MUST be in `.gitignore` before first commit
- OAuth redirect URI: `http://127.0.0.1:8080/oauth2callback` (loopback only)
- OAuth scope: `https://www.googleapis.com/auth/youtube`
- All errors to `stderr`; normal output to `stdout`
- Retry network errors up to 3× with 2 s delay

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/types.ts` | All shared interfaces: `Playlist`, `DuplicateGroup`, `PlaylistRename`, `TokenData`, `Credentials`, `MenuChoice` |
| `src/auth.ts` | OAuth 2.0 flow, token read/write/refresh |
| `src/api.ts` | YouTube Data API v3: list, delete, rename playlists |
| `src/dedup.ts` | Group playlists by exact name, pre-select keeper by track count |
| `src/tui.ts` | All TUI screens: main menu, dedup review, rename review, search-and-delete, confirmation, progress, summary |
| `src/index.ts` | Orchestrator — auth, playlist fetch, main menu routing |
| `.gitignore` | Excludes `credentials.json`, `tokens.json`, `dist/`, `node_modules/` |
| `package.json` | Scripts: `build`, `start`, `dev` |
| `tsconfig.json` | Strict mode, ES2022, CommonJS |
| `README.md` | Setup guide + architecture overview |

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`

**Interfaces:**
- Produces: runnable `npm run build` and `npm run dev`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "youtube-playlist-deleter",
  "version": "1.0.0",
  "description": "TUI tool to manage duplicate and Spotify-imported YouTube Music playlists",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "npx ts-node src/index.ts"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
dist/
credentials.json
tokens.json
*.js.map
```

- [ ] **Step 4: Install dev dependencies**

```bash
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 5: Create source files**

```bash
mkdir -p src
touch src/types.ts src/auth.ts src/api.ts src/dedup.ts src/tui.ts src/index.ts
```

- [ ] **Step 6: Verify build works with empty files**

```bash
npm run build
```

Expected: `dist/` created, no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json .gitignore src/
git commit -m "chore: scaffold project structure"
```

---

## Task 2: Shared types

**Files:**
- Modify: `src/types.ts`

**Interfaces:**
- Produces: all shared types — imported by every other module

- [ ] **Step 1: Write `src/types.ts`**

```typescript
export interface Playlist {
  id: string
  title: string
  description: string    // preserved on rename — required by YouTube API update
  itemCount: number      // from contentDetails.itemCount
  publishedAt: string    // ISO 8601 creation date
}

export interface DuplicateGroup {
  name: string
  playlists: Playlist[]  // sorted: most tracks first, oldest first on tie
  keepIndex: number      // index of the selected keeper in playlists[]
}

export interface PlaylistRename {
  playlist: Playlist
  newTitle: string       // computed: "[SPO] " + playlist.title
  selected: boolean      // whether this rename will be applied
  recommended: boolean   // true if playlist is < 30 days old (app's suggestion)
}

export interface TokenData {
  access_token: string
  refresh_token: string
  expiry_date: number    // ms since epoch
}

export interface Credentials {
  client_id: string
  client_secret: string
}

export type MenuChoice = 'deduplicate' | 'tag' | 'search' | 'exit'
```

- [ ] **Step 2: Verify compile**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add shared types"
```

---

## Task 3: Deduplication logic

**Files:**
- Modify: `src/dedup.ts`

**Interfaces:**
- Consumes: `Playlist`, `DuplicateGroup` from `src/types.ts`
- Produces: `findDuplicates(playlists: Playlist[]): DuplicateGroup[]`

- [ ] **Step 1: Implement `src/dedup.ts`**

```typescript
import { Playlist, DuplicateGroup } from './types'

export function findDuplicates(playlists: Playlist[]): DuplicateGroup[] {
  const byName = new Map<string, Playlist[]>()
  for (const p of playlists) {
    const group = byName.get(p.title) ?? []
    group.push(p)
    byName.set(p.title, group)
  }

  const groups: DuplicateGroup[] = []
  for (const [name, members] of byName) {
    if (members.length < 2) continue
    const sorted = [...members].sort((a, b) => {
      if (b.itemCount !== a.itemCount) return b.itemCount - a.itemCount
      return a.publishedAt.localeCompare(b.publishedAt)
    })
    groups.push({ name, playlists: sorted, keepIndex: 0 })
  }
  return groups
}
```

**Logic:**
- Groups by exact title (case-sensitive)
- Within each group: sorts by `itemCount` descending, then `publishedAt` ascending (oldest wins tie-break)
- `keepIndex: 0` always means the playlist with the most tracks is pre-selected as keeper

- [ ] **Step 2: Verify compile**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/dedup.ts
git commit -m "feat: implement deduplication logic"
```

---

## Task 4: Auth module

**Files:**
- Modify: `src/auth.ts`

**Interfaces:**
- Consumes: `TokenData`, `Credentials` from `src/types.ts`
- Produces:
  - `ensureAuth(): Promise<string>` — returns valid access token, running OAuth if needed
  - `refreshToken(): Promise<string>` — exchanges refresh token for new access token

- [ ] **Step 1: Implement `src/auth.ts`**

```typescript
import * as fs from 'fs'
import * as http from 'http'
import * as crypto from 'crypto'
import { TokenData, Credentials } from './types'

const CREDENTIALS_PATH = 'credentials.json'
const TOKENS_PATH = 'tokens.json'
const REDIRECT_URI = 'http://127.0.0.1:8080/oauth2callback'
const SCOPE = 'https://www.googleapis.com/auth/youtube'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

function loadCredentials(): Credentials {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    process.stderr.write(`
ERROR: credentials.json not found.

Setup steps:
  1. Go to https://console.cloud.google.com
  2. Create a project → enable "YouTube Data API v3"
  3. APIs & Services → Credentials → Create OAuth 2.0 Client ID
  4. Application type: Desktop app
  5. Download JSON → rename to credentials.json → place in project root
  6. OAuth consent screen → Test users → add your Google account email

Then re-run the app.
`)
    process.exit(1)
  }
  const raw = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'))
  const creds = raw.installed ?? raw   // Google wraps desktop app creds under "installed"
  if (!creds.client_id || !creds.client_secret) {
    process.stderr.write('ERROR: credentials.json is missing client_id or client_secret.\n')
    process.exit(1)
  }
  return { client_id: creds.client_id, client_secret: creds.client_secret }
}

function loadTokens(): TokenData | null {
  if (!fs.existsSync(TOKENS_PATH)) return null
  try {
    return JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8')) as TokenData
  } catch {
    return null
  }
}

function saveTokens(data: TokenData): void {
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(data, null, 2), 'utf8')
}

function isExpired(tokens: TokenData): boolean {
  return Date.now() >= tokens.expiry_date - 60_000
}

export async function refreshToken(): Promise<string> {
  const creds = loadCredentials()
  const tokens = loadTokens()
  if (!tokens?.refresh_token) throw new Error('No refresh token available.')

  const body = new URLSearchParams({
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token',
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    fs.unlinkSync(TOKENS_PATH)
    throw new Error(`Token refresh failed (${res.status}). Deleted tokens.json — re-run to log in again.`)
  }

  const data = await res.json() as { access_token: string; expires_in: number }
  const updated: TokenData = {
    access_token: data.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: Date.now() + data.expires_in * 1000,
  }
  saveTokens(updated)
  return updated.access_token
}

async function runOAuthFlow(creds: Credentials): Promise<TokenData> {
  const state = crypto.randomBytes(16).toString('hex')
  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${encodeURIComponent(creds.client_id)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(SCOPE)}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${state}`

  process.stdout.write('\nOpening browser for Google login...\n')
  process.stdout.write(`If the browser does not open automatically, visit:\n${authUrl}\n\n`)

  const open = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open'
  const { exec } = await import('child_process')
  exec(`${open} "${authUrl}"`)

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://127.0.0.1:8080`)
      const returnedState = url.searchParams.get('state')
      const authCode = url.searchParams.get('code')
      const error = url.searchParams.get('error')

      if (error) {
        res.writeHead(400); res.end('OAuth error: ' + error)
        server.close(); reject(new Error('OAuth error: ' + error)); return
      }
      if (returnedState !== state || !authCode) {
        res.writeHead(400); res.end('Invalid state or missing code.')
        server.close(); reject(new Error('Invalid OAuth callback.')); return
      }
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end('<h2>Login successful — you can close this tab.</h2>')
      server.close()
      resolve(authCode)
    })
    server.listen(8080, '127.0.0.1')
    server.on('error', reject)
    setTimeout(() => {
      server.close()
      reject(new Error('OAuth flow timed out after 5 minutes.'))
    }, 5 * 60 * 1000)
  })

  const body = new URLSearchParams({
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    code,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
  })

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Token exchange failed (${res.status}): ${errText}`)
  }

  const data = await res.json() as {
    access_token: string
    refresh_token: string
    expires_in: number
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: Date.now() + data.expires_in * 1000,
  }
}

export async function ensureAuth(): Promise<string> {
  const tokens = loadTokens()

  if (tokens) {
    if (!isExpired(tokens)) return tokens.access_token
    try {
      return await refreshToken()
    } catch (err) {
      process.stderr.write(`Token refresh failed: ${(err as Error).message}\nStarting fresh login...\n`)
    }
  }

  const creds = loadCredentials()
  const newTokens = await runOAuthFlow(creds)
  saveTokens(newTokens)
  process.stdout.write('Login successful. Tokens saved.\n\n')
  return newTokens.access_token
}
```

- [ ] **Step 2: Verify compile**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/auth.ts
git commit -m "feat: implement OAuth 2.0 auth flow"
```

---

## Task 5: API client

**Files:**
- Modify: `src/api.ts`

**Interfaces:**
- Consumes: `Playlist` from `src/types.ts`; access token string
- Produces:
  - `listAllPlaylists(token: string): Promise<Playlist[]>`
  - `deletePlaylist(token: string, playlistId: string): Promise<void>`
  - `renamePlaylist(token: string, playlistId: string, newTitle: string, description: string): Promise<void>`

- [ ] **Step 1: Implement `src/api.ts`**

```typescript
import { Playlist } from './types'

const BASE = 'https://www.googleapis.com/youtube/v3'

interface ApiError {
  status: number
  reason?: string
  message: string
}

function makeApiError(status: number, reason: string | undefined, message: string): ApiError {
  return { status, reason, message }
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options)
    } catch (err) {
      if (attempt === retries) throw err
      await new Promise(r => setTimeout(r, 2000))
    }
  }
  throw new Error('unreachable')
}

async function parseErrorResponse(res: Response): Promise<ApiError> {
  try {
    const body = await res.json() as { error?: { errors?: { reason?: string }[] } }
    const reason = body.error?.errors?.[0]?.reason
    return makeApiError(res.status, reason, `API error ${res.status} (${reason ?? 'unknown'})`)
  } catch {
    return makeApiError(res.status, undefined, `API error ${res.status}`)
  }
}

function throwIfQuotaOrAuth(err: ApiError): never {
  if (err.status === 401) throw Object.assign(new Error('Unauthorized'), err)
  if (err.status === 403 && err.reason === 'quotaExceeded') {
    throw Object.assign(new Error('API quota exceeded for today.'), err)
  }
  throw Object.assign(new Error(err.message), err)
}

export function parsePlaylistItem(item: {
  id: string
  snippet: { title: string; description: string; publishedAt: string }
  contentDetails: { itemCount?: number }
}): Playlist {
  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description ?? '',
    itemCount: item.contentDetails.itemCount ?? 0,
    publishedAt: item.snippet.publishedAt,
  }
}

export async function listAllPlaylists(token: string): Promise<Playlist[]> {
  const playlists: Playlist[] = []
  let pageToken: string | undefined

  process.stdout.write('Fetching playlists')

  do {
    const params = new URLSearchParams({
      part: 'snippet,contentDetails',
      mine: 'true',
      maxResults: '50',
      ...(pageToken ? { pageToken } : {}),
    })

    const res = await fetchWithRetry(`${BASE}/playlists?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) throwIfQuotaOrAuth(await parseErrorResponse(res))

    const data = await res.json() as { items?: unknown[]; nextPageToken?: string }
    for (const item of data.items ?? []) {
      playlists.push(parsePlaylistItem(item as Parameters<typeof parsePlaylistItem>[0]))
    }
    pageToken = data.nextPageToken
    process.stdout.write('.')
  } while (pageToken)

  process.stdout.write(` done (${playlists.length} playlists)\n`)
  return playlists
}

export async function deletePlaylist(token: string, playlistId: string): Promise<void> {
  const params = new URLSearchParams({ id: playlistId })
  const res = await fetchWithRetry(`${BASE}/playlists?${params}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (res.status === 204 || res.status === 200 || res.status === 404) return
  throwIfQuotaOrAuth(await parseErrorResponse(res))
}

export async function renamePlaylist(
  token: string,
  playlistId: string,
  newTitle: string,
  description: string
): Promise<void> {
  const res = await fetchWithRetry(`${BASE}/playlists?part=snippet`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: playlistId,
      snippet: { title: newTitle, description },
    }),
  })

  if (res.ok) return
  throwIfQuotaOrAuth(await parseErrorResponse(res))
}
```

- [ ] **Step 2: Verify compile**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/api.ts
git commit -m "feat: implement YouTube API v3 client (list, delete, rename)"
```

---

## Task 6: TUI module

**Files:**
- Modify: `src/tui.ts`

**Interfaces:**
- Consumes: `DuplicateGroup`, `Playlist`, `PlaylistRename`, `MenuChoice` from `src/types.ts`
- Produces:
  - `showMainMenu(): Promise<MenuChoice>`
  - `reviewGroups(groups: DuplicateGroup[]): Promise<DuplicateGroup[]>`
  - `reviewRenames(renames: PlaylistRename[]): Promise<PlaylistRename[]>`
  - `searchAndSelect(playlists: Playlist[]): Promise<Playlist[]>`
  - `confirmDeletion(toDelete: Playlist[]): Promise<boolean>`
  - `confirmRenames(renames: PlaylistRename[]): Promise<boolean>`
  - `showProgress(current: number, total: number, action: string): void`
  - `showSummary(count: number, label: string): void`

- [ ] **Step 1: Implement `src/tui.ts`**

```typescript
import * as readline from 'readline'
import { DuplicateGroup, Playlist, PlaylistRename, MenuChoice } from './types'

// ANSI helpers
const bold  = (s: string) => `\x1b[1m${s}\x1b[0m`
const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const red   = (s: string) => `\x1b[31m${s}\x1b[0m`
const dim   = (s: string) => `\x1b[2m${s}\x1b[0m`
const cyan  = (s: string) => `\x1b[36m${s}\x1b[0m`
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve))
}

function makeRl(): readline.Interface {
  return readline.createInterface({ input: process.stdin, output: process.stdout })
}

// ─── Main Menu ──────────────────────────────────────────────────────────────

export async function showMainMenu(): Promise<MenuChoice> {
  const rl = makeRl()
  while (true) {
    console.clear()
    console.log(bold('\n YouTube Playlist Manager\n'))
    console.log(`  ${cyan('1')}  Find and delete duplicate playlists`)
    console.log(`  ${cyan('2')}  Tag Spotify-imported playlists with [SPO] prefix`)
    console.log(`  ${cyan('3')}  Search and delete playlists`)
    console.log(`  ${cyan('4')}  Exit\n`)
    const input = (await prompt(rl, '> ')).trim()
    if (input === '1') { rl.close(); return 'deduplicate' }
    if (input === '2') { rl.close(); return 'tag' }
    if (input === '3') { rl.close(); return 'search' }
    if (input === '4' || input === 'q') { rl.close(); return 'exit' }
  }
}

// ─── Deduplicate mode ────────────────────────────────────────────────────────

function renderDedupPage(groups: DuplicateGroup[], page: number, pageSize: number): void {
  const start = page * pageSize
  const end = Math.min(start + pageSize, groups.length)
  const totalPages = Math.ceil(groups.length / pageSize)

  console.clear()
  console.log(bold('\n Duplicate Playlists\n'))
  console.log(dim(`  Page ${page + 1}/${totalPages} · ${groups.length} duplicate groups`))
  console.log(dim('  [number] flip keeper  [n] next page  [p] prev page  [d] done\n'))

  for (let i = start; i < end; i++) {
    const g = groups[i]
    const localIdx = i - start + 1
    console.log(bold(`  ${localIdx}. "${g.name}"`) + dim(` (${g.playlists.length} copies)`))
    for (let j = 0; j < g.playlists.length; j++) {
      const p = g.playlists[j]
      const isKeeper = j === g.keepIndex
      const label = isKeeper ? green('  ✓ KEEP  ') : red('  ✗ DELETE')
      const tracks = `${p.itemCount} track${p.itemCount !== 1 ? 's' : ''}`
      const date = p.publishedAt.slice(0, 10)
      console.log(`     ${label}  ${dim(tracks)}  ${dim(date)}  ${dim('id:' + p.id)}`)
    }
    console.log()
  }
}

export async function reviewGroups(groups: DuplicateGroup[]): Promise<DuplicateGroup[]> {
  const PAGE_SIZE = 10
  const result = groups.map(g => ({ ...g, playlists: [...g.playlists] }))
  let page = 0
  const totalPages = Math.ceil(result.length / PAGE_SIZE)
  const rl = makeRl()

  while (true) {
    renderDedupPage(result, page, PAGE_SIZE)
    const input = (await prompt(rl, cyan('> '))).trim().toLowerCase()

    if (input === 'd') break
    if (input === 'n' && page < totalPages - 1) { page++; continue }
    if (input === 'p' && page > 0) { page--; continue }

    const num = parseInt(input, 10)
    const pageCount = Math.min(PAGE_SIZE, result.length - page * PAGE_SIZE)
    if (!isNaN(num) && num >= 1 && num <= pageCount) {
      const g = result[page * PAGE_SIZE + num - 1]
      g.keepIndex = (g.keepIndex + 1) % g.playlists.length
    }
  }

  rl.close()
  return result
}

// ─── Tag / rename mode ───────────────────────────────────────────────────────

function renderRenamePage(renames: PlaylistRename[], page: number, pageSize: number): void {
  const start = page * pageSize
  const end = Math.min(start + pageSize, renames.length)
  const totalPages = Math.ceil(renames.length / pageSize)
  const selectedCount = renames.filter(r => r.selected).length

  console.clear()
  console.log(bold('\n Tag Spotify Playlists with [SPO]\n'))
  console.log(dim(`  Page ${page + 1}/${totalPages} · ${renames.length} playlists · ${selectedCount} selected`))
  console.log(dim('  [number] toggle  [a] auto-confirm recommendations  [n] next  [p] prev  [d] done\n'))
  console.log(dim('  ' + yellow('★') + ' = recommended (created < 30 days ago)\n'))

  for (let i = start; i < end; i++) {
    const r = renames[i]
    const localIdx = i - start + 1
    const star = r.recommended ? yellow('★') : ' '
    const check = r.selected ? green('[✓]') : dim('[ ]')
    const date = r.playlist.publishedAt.slice(0, 10)
    const tracks = `${r.playlist.itemCount} track${r.playlist.itemCount !== 1 ? 's' : ''}`
    console.log(`  ${check} ${star} ${cyan(String(localIdx).padStart(2))}. ${r.playlist.title}`)
    console.log(`         ${dim('→ ' + r.newTitle)}  ${dim(date)}  ${dim(tracks)}`)
    console.log()
  }
}

export async function reviewRenames(renames: PlaylistRename[]): Promise<PlaylistRename[]> {
  const PAGE_SIZE = 10
  const result = renames.map(r => ({ ...r }))
  let page = 0
  const totalPages = Math.ceil(result.length / PAGE_SIZE)
  const rl = makeRl()

  while (true) {
    renderRenamePage(result, page, PAGE_SIZE)
    const input = (await prompt(rl, cyan('> '))).trim().toLowerCase()

    if (input === 'd') break
    if (input === 'n' && page < totalPages - 1) { page++; continue }
    if (input === 'p' && page > 0) { page--; continue }

    if (input === 'a') {
      // Auto-confirm: select exactly the recommended ones
      for (const r of result) r.selected = r.recommended
      break
    }

    const num = parseInt(input, 10)
    const pageCount = Math.min(PAGE_SIZE, result.length - page * PAGE_SIZE)
    if (!isNaN(num) && num >= 1 && num <= pageCount) {
      const r = result[page * PAGE_SIZE + num - 1]
      r.selected = !r.selected
    }
  }

  rl.close()
  return result
}

// ─── Search and delete mode ──────────────────────────────────────────────────

export async function searchAndSelect(playlists: Playlist[]): Promise<Playlist[]> {
  const rl = makeRl()

  while (true) {
    console.clear()
    console.log(bold('\n Search and Delete Playlists\n'))
    const query = (await prompt(rl, `  Search query (or ${cyan('q')} to go back): `)).trim()

    if (query.toLowerCase() === 'q') { rl.close(); return [] }
    if (!query) continue

    const matches = playlists.filter(p =>
      p.title.toLowerCase().includes(query.toLowerCase())
    )

    if (matches.length === 0) {
      console.log(dim(`\n  No playlists matching "${query}"\n`))
      await prompt(rl, dim('  Press Enter to search again...'))
      continue
    }

    console.clear()
    console.log(bold(`\n Results for "${query}" (${matches.length} found)\n`))
    console.log(dim('  [numbers comma-separated] select  [all] select all  [q] new search\n'))

    for (let i = 0; i < matches.length; i++) {
      const p = matches[i]
      const date = p.publishedAt.slice(0, 10)
      const tracks = `${p.itemCount} track${p.itemCount !== 1 ? 's' : ''}`
      console.log(`  ${cyan(String(i + 1).padStart(3))}. ${p.title}`)
      console.log(`       ${dim(date + '  ' + tracks)}`)
    }
    console.log()

    const sel = (await prompt(rl, cyan('> '))).trim().toLowerCase()

    if (sel === 'q') continue
    if (sel === '') continue

    let selected: Playlist[] = []
    if (sel === 'all') {
      selected = matches
    } else {
      const nums = sel.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= matches.length)
      selected = nums.map(n => matches[n - 1])
    }

    if (selected.length === 0) continue

    rl.close()
    return selected
  }
}

// ─── Confirmation and progress ───────────────────────────────────────────────

export async function confirmDeletion(toDelete: Playlist[]): Promise<boolean> {
  const rl = makeRl()
  console.log()
  console.log(bold('  About to delete:'))
  for (const p of toDelete) {
    console.log(`    ${red('✗')} ${p.title}  ${dim('(' + p.itemCount + ' tracks)')}`)
  }
  console.log()
  console.log(red(`  ${toDelete.length} playlist${toDelete.length !== 1 ? 's' : ''} will be permanently deleted.`))
  console.log()
  const answer = await prompt(rl, `  Type ${bold('yes')} to confirm, or press Enter to cancel: `)
  rl.close()
  return answer.trim().toLowerCase() === 'yes'
}

export async function confirmRenames(renames: PlaylistRename[]): Promise<boolean> {
  const selected = renames.filter(r => r.selected)
  const rl = makeRl()
  console.log()
  console.log(bold('  About to rename:'))
  for (const r of selected) {
    console.log(`    ${green('→')} ${r.playlist.title}`)
    console.log(`       ${dim(r.newTitle)}`)
  }
  console.log()
  console.log(yellow(`  ${selected.length} playlist${selected.length !== 1 ? 's' : ''} will be renamed.`))
  console.log()
  const answer = await prompt(rl, `  Type ${bold('yes')} to confirm, or press Enter to cancel: `)
  rl.close()
  return answer.trim().toLowerCase() === 'yes'
}

export function showProgress(current: number, total: number, action = 'Processing'): void {
  process.stdout.write(`\r  ${action}... ${current}/${total}`)
  if (current === total) process.stdout.write('\n')
}

export function showSummary(count: number, label: string): void {
  console.log()
  console.log(green(bold('  Done!')) + ` ${count} ${label}.`)
  console.log()
}
```

- [ ] **Step 2: Verify compile**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/tui.ts
git commit -m "feat: implement TUI (menu, dedup, rename, search-and-delete)"
```

---

## Task 7: Orchestrator

**Files:**
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: all modules above
- Produces: runnable entry point with all three modes

- [ ] **Step 1: Implement `src/index.ts`**

```typescript
import { ensureAuth, refreshToken } from './auth'
import { listAllPlaylists, deletePlaylist, renamePlaylist } from './api'
import { findDuplicates } from './dedup'
import {
  showMainMenu,
  reviewGroups,
  reviewRenames,
  searchAndSelect,
  confirmDeletion,
  confirmRenames,
  showProgress,
  showSummary,
} from './tui'
import { Playlist, PlaylistRename } from './types'

const SPO_PREFIX = '[SPO] '
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function withTokenRefresh<T>(
  token: string,
  fn: (t: string) => Promise<T>
): Promise<{ result: T; token: string }> {
  try {
    return { result: await fn(token), token }
  } catch (err: unknown) {
    const e = err as { status?: number }
    if (e.status === 401) {
      process.stderr.write('\nAccess token expired. Refreshing...\n')
      const newToken = await refreshToken()
      return { result: await fn(newToken), token: newToken }
    }
    throw err
  }
}

function isQuotaError(err: unknown): boolean {
  const e = err as { status?: number; reason?: string }
  return e.status === 403 && e.reason === 'quotaExceeded'
}

// ─── Delete flow (shared by deduplicate and search modes) ────────────────────

async function runDeletions(token: string, toDelete: Playlist[]): Promise<{ deleted: number; token: string }> {
  let deletedCount = 0
  const deletedIds = new Set<string>()

  for (const playlist of toDelete) {
    try {
      const { token: t } = await withTokenRefresh(token, t => deletePlaylist(t, playlist.id))
      token = t
      deletedCount++
      deletedIds.add(playlist.id)
      showProgress(deletedCount, toDelete.length, 'Deleting')
    } catch (err: unknown) {
      if (isQuotaError(err)) {
        process.stderr.write(`\n\nAPI quota exceeded. Deleted ${deletedCount}/${toDelete.length} playlists today.\n`)
        process.stderr.write('Re-run tomorrow — already-deleted playlists are gone for good.\n\n')
        break
      }
      process.stderr.write(`\nError deleting "${playlist.title}": ${(err as Error).message}\n`)
    }
  }

  return { deleted: deletedCount, token }
}

// ─── Mode: deduplicate ────────────────────────────────────────────────────────

async function runDeduplicate(token: string, playlists: Playlist[]): Promise<void> {
  const groups = findDuplicates(playlists)

  if (groups.length === 0) {
    console.log('\n  No duplicate playlists found.\n')
    return
  }

  console.log(`\n  Found ${groups.length} duplicate group${groups.length !== 1 ? 's' : ''}.\n`)

  const reviewed = await reviewGroups(groups)
  const toDelete = reviewed.flatMap(g => g.playlists.filter((_, i) => i !== g.keepIndex))

  if (toDelete.length === 0) {
    console.log('\n  No playlists marked for deletion.\n')
    return
  }

  const confirmed = await confirmDeletion(toDelete)
  if (!confirmed) { console.log('\n  Cancelled.\n'); return }

  console.log()
  const { deleted } = await runDeletions(token, toDelete)

  const cleanedGroups = reviewed.filter(g =>
    g.playlists.every((p, i) => i === g.keepIndex || !toDelete.find(d => d.id === p.id) || deleted > 0)
  ).length

  showSummary(deleted, `playlist${deleted !== 1 ? 's' : ''} deleted across ${cleanedGroups} group${cleanedGroups !== 1 ? 's' : ''}`)
}

// ─── Mode: tag with [SPO] ────────────────────────────────────────────────────

async function runTag(token: string, playlists: Playlist[]): Promise<void> {
  const now = Date.now()
  const untagged = playlists.filter(p => !p.title.startsWith(SPO_PREFIX))

  if (untagged.length === 0) {
    console.log('\n  All playlists already have the [SPO] prefix.\n')
    return
  }

  const renames: PlaylistRename[] = untagged.map(p => ({
    playlist: p,
    newTitle: SPO_PREFIX + p.title,
    recommended: now - new Date(p.publishedAt).getTime() < THIRTY_DAYS_MS,
    selected: now - new Date(p.publishedAt).getTime() < THIRTY_DAYS_MS,
  }))

  const reviewed = await reviewRenames(renames)
  const toRename = reviewed.filter(r => r.selected)

  if (toRename.length === 0) {
    console.log('\n  No playlists selected for renaming.\n')
    return
  }

  const confirmed = await confirmRenames(reviewed)
  if (!confirmed) { console.log('\n  Cancelled.\n'); return }

  console.log()
  let renamedCount = 0
  for (const r of toRename) {
    try {
      await withTokenRefresh(token, t => renamePlaylist(t, r.playlist.id, r.newTitle, r.playlist.description))
      renamedCount++
      showProgress(renamedCount, toRename.length, 'Renaming')
    } catch (err: unknown) {
      if (isQuotaError(err)) {
        process.stderr.write(`\n\nAPI quota exceeded. Renamed ${renamedCount}/${toRename.length} playlists today.\n`)
        process.stderr.write('Re-run tomorrow to continue.\n\n')
        break
      }
      process.stderr.write(`\nError renaming "${r.playlist.title}": ${(err as Error).message}\n`)
    }
  }

  showSummary(renamedCount, `playlist${renamedCount !== 1 ? 's' : ''} tagged with ${SPO_PREFIX}`)
}

// ─── Mode: search and delete ─────────────────────────────────────────────────

async function runSearch(token: string, playlists: Playlist[]): Promise<void> {
  const selected = await searchAndSelect(playlists)
  if (selected.length === 0) return

  const confirmed = await confirmDeletion(selected)
  if (!confirmed) { console.log('\n  Cancelled.\n'); return }

  console.log()
  const { deleted } = await runDeletions(token, selected)
  showSummary(deleted, `playlist${deleted !== 1 ? 's' : ''} deleted`)
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  let token = await ensureAuth()
  let playlists = await listAllPlaylists(token)

  while (true) {
    const choice = await showMainMenu()
    if (choice === 'exit') break

    try {
      if (choice === 'deduplicate') await runDeduplicate(token, playlists)
      if (choice === 'tag')         await runTag(token, playlists)
      if (choice === 'search')      await runSearch(token, playlists)
    } catch (err: unknown) {
      process.stderr.write(`\nError: ${(err as Error).message}\n`)
    }

    // Refresh the playlist list after any mutation so next mode sees current state
    try {
      const { result, token: t } = await withTokenRefresh(token, t => listAllPlaylists(t))
      playlists = result
      token = t
    } catch {
      // Non-fatal — user can re-run if the list is stale
    }
  }

  console.log('\n  Goodbye!\n')
}

run().catch(err => {
  process.stderr.write(`\nFatal: ${(err as Error).message}\n`)
  process.exit(1)
})
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 3: Smoke test (no credentials needed — verifies startup error path)**

```bash
node dist/index.js
```

Expected: prints setup instructions for `credentials.json` and exits cleanly.

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: implement orchestrator with main menu and all three modes"
```

---

## Task 8: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with full setup guide and architecture"
```

---

## Task 9: Final verification

- [ ] **Step 1: Clean build**

```bash
rm -rf dist && npm run build
```

Expected: no errors, `dist/` recreated with all files.

- [ ] **Step 2: Verify sensitive files are gitignored**

```bash
git status
```

Expected: `credentials.json` and `tokens.json` do NOT appear as untracked files.

- [ ] **Step 3: Verify git log**

```bash
git log --oneline
```

Expected:
```
<hash> docs: add README with full setup guide and architecture
<hash> feat: implement orchestrator with main menu and all three modes
<hash> feat: implement TUI (menu, dedup, rename, search-and-delete)
<hash> feat: implement YouTube API v3 client (list, delete, rename)
<hash> feat: implement OAuth 2.0 auth flow
<hash> feat: implement deduplication logic
<hash> feat: add shared types
<hash> chore: scaffold project structure
<hash> Add design spec for YouTube playlist deduper
```

- [ ] **Step 4: End-to-end smoke test (manual — requires real credentials)**

Place `credentials.json` in the project root, then:

```bash
npm run dev
```

Walk through each mode and **cancel at the confirmation step** (press Enter without typing `yes`) to verify the full flow runs without touching your playlists:
- Mode 1: verify duplicates are listed with correct keeper pre-selection
- Mode 2: verify recommended ★ playlists are pre-selected, `a` auto-selects them, `d` exits
- Mode 3: search for a known playlist name, verify it appears in results

Expected: all three modes render correctly, cancellation exits cleanly, no playlists are modified.
```
