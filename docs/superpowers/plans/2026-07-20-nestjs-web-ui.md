# NestJS + React Web UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **🎓 USER TASK** — the human writes this. Stop, explain the concept, guide them through it.
> **🤖 ASSISTANT TASK** — implement this directly.

**Goal:** Build a full-stack NestJS + Vite/React web app that exposes all four CLI playlist-management modes with a neo-brutal UI, extensible to future music providers.

**Architecture:** NestJS backend proxies YouTube API calls (tokens never touch the browser), Vite + React frontend talks to `/api/*` via session-cookie auth. A `MusicProvider` interface makes Spotify/Apple Music drop-in additions. SSE streams deletion progress in real time.

**Tech Stack:** NestJS 10, Passport + passport-google-oauth20, express-session, RxJS (SSE), Vite 5, React 18, React Router 6, CSS Modules + hand-written neo-brutal styles.

## Global Constraints

- Branch: `feat/nestjs-ui` — never commit web UI code to `main`
- All web app files live under `web/` (backend) and `web/client/` (frontend)
- NestJS: `@nestjs/common@^10`, `rxjs@^7`, `typescript@^5` (NestJS 10 ships its own tsconfig)
- `emitDecoratorMetadata: true` and `experimentalDecorators: true` are **required** in `web/tsconfig.json` — NestJS DI breaks without them
- Session store is in-process (`express-session` default) — sufficient for single-user local use
- Frontend never stores tokens — only session cookie sent with `credentials: 'include'`
- No unit tests for frontend (per spec); NestJS tasks verified with `curl` commands
- `web/client/` is a **separate npm workspace** — run `npm install` inside it separately
- YouTube API quota: 10 000 units/day. List ≈ 1 unit/page, delete/rename = 50 units each
- `MUSIC_PROVIDER` injection token is a `Symbol` — always use `@Inject(MUSIC_PROVIDER)`, not type-only injection

---

## File Map

```
web/
├── package.json
├── tsconfig.json
├── nest-cli.json
├── .env.example
└── src/
    ├── main.ts                              Task 1
    ├── app.module.ts                        Task 1
    ├── types/
    │   └── session.d.ts                     Task 1  (express-session type augmentation)
    ├── providers/
    │   ├── music-provider.interface.ts      Task 2
    │   ├── providers.module.ts              Task 2
    │   └── youtube/
    │       ├── youtube.provider.ts          Task 2
    │       └── youtube.module.ts            Task 2
    ├── auth/
    │   ├── token-data.interface.ts          Task 2  (shared TokenData type)
    │   ├── google.strategy.ts               Task 4  🎓
    │   ├── auth.service.ts                  Task 4  🎓
    │   ├── auth.controller.ts               Task 4  🎓
    │   └── auth.module.ts                   Task 4  🎓
    ├── common/
    │   └── session-auth.guard.ts            Task 5  🎓
    ├── playlists/
    │   ├── playlists.module.ts              Task 3  🎓
    │   ├── playlists.service.ts             Task 3  🎓
    │   └── playlists.controller.ts          Task 3 + 6  🎓
    └── jobs/
        ├── jobs.module.ts                   Task 7  🎓
        ├── jobs.service.ts                  Task 7  🎓
        └── jobs.controller.ts               Task 7  🎓

web/client/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
└── src/
    ├── main.tsx                             Task 8
    ├── App.tsx                              Task 8
    ├── api.ts                               Task 8  (typed fetch helpers)
    ├── pages/
    │   ├── LoginPage.tsx                    Task 8
    │   ├── PlaylistsPage.tsx                Task 9
    │   ├── DuplicatesPage.tsx               Task 10
    │   ├── TagPage.tsx                      Task 10
    │   └── RecentPage.tsx                   Task 10
    ├── components/
    │   ├── Nav.tsx                          Task 8
    │   ├── PlaylistCard.tsx                 Task 9
    │   ├── FilterBar.tsx                    Task 9
    │   ├── BulkActionBar.tsx                Task 9
    │   └── ProgressDrawer.tsx               Task 10
    └── styles/
        ├── reset.css                        Task 8
        ├── tokens.css                       Task 8
        └── neo-brutal.css                   Task 8
```

---

### Task 1 🤖 — NestJS scaffold + bootstrap

**Files:**
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/nest-cli.json`
- Create: `web/.env.example`
- Create: `web/src/main.ts`
- Create: `web/src/app.module.ts`
- Create: `web/src/types/session.d.ts`

**Interfaces:**
- Produces: running NestJS server on `:3000`

- [ ] **Step 1: Create `web/package.json`**

```json
{
  "name": "youtube-playlist-manager-web",
  "version": "1.0.0",
  "scripts": {
    "build": "nest build",
    "start": "node dist/main",
    "start:dev": "nest start --watch"
  },
  "dependencies": {
    "@nestjs/common": "^10.4.15",
    "@nestjs/config": "^3.3.0",
    "@nestjs/core": "^10.4.15",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/platform-express": "^10.4.15",
    "express-session": "^1.18.1",
    "passport": "^0.7.0",
    "passport-google-oauth20": "^2.0.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.9",
    "@nestjs/testing": "^10.4.15",
    "@types/express": "^4.17.21",
    "@types/express-session": "^1.18.1",
    "@types/node": "^20.17.10",
    "@types/passport-google-oauth20": "^2.0.16",
    "ts-node": "^10.9.2",
    "typescript": "^5.7.3"
  }
}
```

- [ ] **Step 2: Create `web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2022",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true
  }
}
```

- [ ] **Step 3: Create `web/nest-cli.json`**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": { "deleteOutDir": true }
}
```

- [ ] **Step 4: Create `web/.env.example`**

```
GOOGLE_CLIENT_ID=paste-from-credentials.json
GOOGLE_CLIENT_SECRET=paste-from-credentials.json
SESSION_SECRET=change-me-for-local-dev
PORT=3000
```

Copy this to `web/.env` and fill in values from `credentials.json` in the repo root.
Also add `http://localhost:3000/auth/callback` as an authorized redirect URI in
GCP Console → APIs & Services → Credentials → your OAuth 2.0 Client.

- [ ] **Step 5: Create `web/src/types/session.d.ts`**

This tells TypeScript that `req.session.token` exists on express-session's `SessionData`.
Without it, TypeScript will error when you read `req.session.token` in controllers.

```typescript
import 'express-session'

declare module 'express-session' {
  interface SessionData {
    token: {
      access_token: string
      refresh_token: string
      expiry_date: number
    }
  }
}
```

- [ ] **Step 6: Create `web/src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
})
export class AppModule {}
```

`ConfigModule.forRoot({ isGlobal: true })` loads `.env` and makes `ConfigService`
injectable everywhere without re-importing `ConfigModule` in every module.

- [ ] **Step 7: Create `web/src/main.ts`**

```typescript
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import * as session from 'express-session'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? 'dev-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
    }),
  )

  app.enableCors({ origin: 'http://localhost:5173', credentials: true })

  await app.listen(process.env.PORT ?? 3000)
  console.log(`Server running on http://localhost:${process.env.PORT ?? 3000}`)
}
bootstrap()
```

`credentials: true` in CORS config is required so the browser sends the session
cookie with every fetch from the React app on `:5173`.

- [ ] **Step 8: Install deps and verify server starts**

```bash
cd web && npm install
npm run start:dev
```

Expected output:
```
Server running on http://localhost:3000
```

`curl http://localhost:3000` → `{"message":"Cannot GET /","error":"Not Found","statusCode":404}` (correct — no routes yet)

- [ ] **Step 9: Commit**

```bash
git add web/package.json web/tsconfig.json web/nest-cli.json web/.env.example web/src/
git commit -m "feat(web): NestJS project scaffold with session + CORS"
```

---

### Task 2 🤖 — Provider interface + YoutubeProvider

**Files:**
- Create: `web/src/auth/token-data.interface.ts`
- Create: `web/src/providers/music-provider.interface.ts`
- Create: `web/src/providers/youtube/youtube.provider.ts`
- Create: `web/src/providers/youtube/youtube.module.ts`
- Create: `web/src/providers/providers.module.ts`
- Modify: `web/src/app.module.ts`

**Interfaces:**
- Produces: `MUSIC_PROVIDER` injectable token; `YoutubeProvider` with `listPlaylists`, `deletePlaylist`, `renamePlaylist`; `Playlist`, `DuplicateGroup` types

- [ ] **Step 1: Create `web/src/auth/token-data.interface.ts`**

```typescript
export interface TokenData {
  access_token: string
  refresh_token: string
  expiry_date: number   // ms since epoch
}
```

- [ ] **Step 2: Create `web/src/providers/music-provider.interface.ts`**

```typescript
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
  playlists: Playlist[]        // most tracks first, then oldest on tie
  keepIndex: number
}

export interface MusicProvider {
  readonly name: string
  listPlaylists(accessToken: string): Promise<Playlist[]>
  deletePlaylist(accessToken: string, id: string): Promise<void>
  renamePlaylist(accessToken: string, id: string, title: string, description: string): Promise<void>
}

export const MUSIC_PROVIDER = Symbol('MUSIC_PROVIDER')
```

- [ ] **Step 3: Create `web/src/providers/youtube/youtube.provider.ts`**

```typescript
import { Injectable } from '@nestjs/common'
import { MusicProvider, Playlist } from '../music-provider.interface'

const BASE = 'https://www.googleapis.com/youtube/v3'

@Injectable()
export class YoutubeProvider implements MusicProvider {
  readonly name = 'youtube'

  async listPlaylists(accessToken: string): Promise<Playlist[]> {
    const playlists: Playlist[] = []
    let pageToken: string | undefined

    do {
      const params = new URLSearchParams({
        part: 'snippet,contentDetails',
        mine: 'true',
        maxResults: '50',
        ...(pageToken ? { pageToken } : {}),
      })
      const res = await fetch(`${BASE}/playlists?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) {
        const body = await res.json() as { error?: { errors?: { reason?: string }[] } }
        const reason = body.error?.errors?.[0]?.reason
        const err = new Error(`YouTube API ${res.status} (${reason ?? 'unknown'})`) as Error & { status: number; reason?: string }
        err.status = res.status
        err.reason = reason
        throw err
      }
      const data = await res.json() as {
        items?: {
          id: string
          snippet: { title: string; description: string; publishedAt: string }
          contentDetails: { itemCount?: number }
        }[]
        nextPageToken?: string
      }
      for (const item of data.items ?? []) {
        playlists.push({
          id: item.id,
          title: item.snippet.title,
          description: item.snippet.description ?? '',
          itemCount: item.contentDetails.itemCount ?? 0,
          publishedAt: item.snippet.publishedAt,
          provider: 'youtube',
        })
      }
      pageToken = data.nextPageToken
    } while (pageToken)

    return playlists
  }

  async deletePlaylist(accessToken: string, id: string): Promise<void> {
    const res = await fetch(`${BASE}/playlists?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (res.status === 204 || res.status === 200 || res.status === 404) return
    const body = await res.json() as { error?: { errors?: { reason?: string }[] } }
    const reason = body.error?.errors?.[0]?.reason
    const err = new Error(`YouTube API ${res.status} (${reason ?? 'unknown'})`) as Error & { status: number; reason?: string }
    err.status = res.status
    err.reason = reason
    throw err
  }

  async renamePlaylist(accessToken: string, id: string, title: string, description: string): Promise<void> {
    const res = await fetch(`${BASE}/playlists?part=snippet`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, snippet: { title, description } }),
    })
    if (res.ok) return
    const body = await res.json() as { error?: { errors?: { reason?: string }[] } }
    const reason = body.error?.errors?.[0]?.reason
    const err = new Error(`YouTube API ${res.status} (${reason ?? 'unknown'})`) as Error & { status: number; reason?: string }
    err.status = res.status
    err.reason = reason
    throw err
  }
}
```

- [ ] **Step 4: Create `web/src/providers/youtube/youtube.module.ts`**

```typescript
import { Module } from '@nestjs/common'
import { YoutubeProvider } from './youtube.provider'
import { MUSIC_PROVIDER } from '../music-provider.interface'

@Module({
  providers: [{ provide: MUSIC_PROVIDER, useClass: YoutubeProvider }],
  exports: [{ provide: MUSIC_PROVIDER, useClass: YoutubeProvider }],
})
export class YoutubeModule {}
```

- [ ] **Step 5: Create `web/src/providers/providers.module.ts`**

```typescript
import { Module } from '@nestjs/common'
import { YoutubeModule } from './youtube/youtube.module'

@Module({
  imports: [YoutubeModule],
  exports: [YoutubeModule],
})
export class ProvidersModule {}
```

- [ ] **Step 6: Wire `ProvidersModule` into `app.module.ts`**

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ProvidersModule } from './providers/providers.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ProvidersModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 7: Verify server still starts**

```bash
npm run start:dev
```

Expected: server starts, no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add web/src/
git commit -m "feat(web): provider interface + YoutubeProvider"
```

---

### Task 3 🎓 — PlaylistsModule, PlaylistsService, PlaylistsController (GET list)

**NestJS concepts introduced:** `@Module`, `@Injectable`, `@Inject`, `@Controller`, `@Get`, `@Query`, `@Req`

**Files:**
- Create: `web/src/playlists/playlists.module.ts`
- Create: `web/src/playlists/playlists.service.ts`
- Create: `web/src/playlists/playlists.controller.ts`
- Modify: `web/src/app.module.ts`

**Interfaces:**
- Consumes: `MUSIC_PROVIDER` token, `MusicProvider`, `Playlist`, `DuplicateGroup` from Task 2; `TokenData` from Task 2
- Produces: `PlaylistsService.listPlaylists(token, filters)`, `PlaylistsService.findDuplicates(token)`, `PlaylistsService.tagCandidates(token)`; `GET /api/playlists`

---

#### 🎓 Concept: `@Module`

A Module is NestJS's unit of organization. It declares:
- `providers` — classes this module creates and manages (services, guards, strategies)
- `controllers` — classes that handle HTTP routes
- `imports` — other modules whose exported providers this module needs
- `exports` — providers that other modules can use after importing this module

NestJS builds a **dependency injection (DI) container** from all modules. When a class
declares a constructor parameter (e.g. `constructor(private svc: PlaylistsService)`),
NestJS finds the right instance in the container and injects it automatically.

---

- [ ] **Step 1: Write `web/src/playlists/playlists.module.ts`**

```typescript
import { Module } from '@nestjs/common'
import { ProvidersModule } from '../providers/providers.module'
import { PlaylistsController } from './playlists.controller'
import { PlaylistsService } from './playlists.service'

@Module({
  imports: [ProvidersModule],      // gives us MUSIC_PROVIDER
  controllers: [PlaylistsController],
  providers: [PlaylistsService],
})
export class PlaylistsModule {}
```

**Why `imports: [ProvidersModule]`?** `PlaylistsService` needs `MUSIC_PROVIDER`. That
token is exported by `ProvidersModule`. Importing `ProvidersModule` here makes it
available to everything inside `PlaylistsModule`.

---

#### 🎓 Concept: `@Injectable` + `@Inject`

`@Injectable()` marks a class as a DI-managed provider. NestJS will create one instance
and reuse it for all injections (singleton scope by default).

`@Inject(TOKEN)` tells NestJS which registered provider to inject when the token is a
`Symbol` (not a class). Since `MUSIC_PROVIDER` is a Symbol, not a class, you must use
`@Inject(MUSIC_PROVIDER)` — type-only injection won't work.

---

- [ ] **Step 2: Write `web/src/playlists/playlists.service.ts`**

```typescript
import { Inject, Injectable } from '@nestjs/common'
import { DuplicateGroup, MusicProvider, MUSIC_PROVIDER, Playlist } from '../providers/music-provider.interface'
import { TokenData } from '../auth/token-data.interface'

const SPO_PREFIX = '[SPO] '

interface ListFilters {
  search?: string
  days?: number
}

@Injectable()
export class PlaylistsService {
  constructor(@Inject(MUSIC_PROVIDER) private readonly provider: MusicProvider) {}

  async listPlaylists(token: TokenData, filters: ListFilters = {}): Promise<Playlist[]> {
    const playlists = await this.provider.listPlaylists(token.access_token)
    let result = playlists

    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(p => p.title.toLowerCase().includes(q))
    }
    if (filters.days) {
      const cutoff = Date.now() - filters.days * 86_400_000
      result = result.filter(p => new Date(p.publishedAt).getTime() > cutoff)
    }
    return result
  }

  async findDuplicates(token: TokenData): Promise<DuplicateGroup[]> {
    const playlists = await this.provider.listPlaylists(token.access_token)
    const byName = new Map<string, Playlist[]>()
    for (const p of playlists) {
      const group = byName.get(p.title) ?? []
      group.push(p)
      byName.set(p.title, group)
    }
    const groups: DuplicateGroup[] = []
    for (const [name, members] of byName) {
      if (members.length < 2) continue
      const sorted = [...members].sort((a, b) =>
        b.itemCount !== a.itemCount
          ? b.itemCount - a.itemCount
          : a.publishedAt.localeCompare(b.publishedAt),
      )
      groups.push({ name, playlists: sorted, keepIndex: 0 })
    }
    return groups
  }

  async tagCandidates(token: TokenData): Promise<Playlist[]> {
    const playlists = await this.provider.listPlaylists(token.access_token)
    return playlists.filter(p => !p.title.startsWith(SPO_PREFIX))
  }
}
```

---

#### 🎓 Concept: `@Controller`, `@Get`, `@Query`, `@Req`

`@Controller('api/playlists')` sets the route prefix for every method in the class.
`@Get()` maps `GET /api/playlists` to that method.
`@Query('search')` extracts `?search=foo` from the URL into a parameter.
`@Req()` injects the Express `Request` object — used here to read `req.session.token`.

---

- [ ] **Step 3: Write `web/src/playlists/playlists.controller.ts`** (GET list only — more endpoints added in Task 6)

```typescript
import { Controller, Get, Query, Req } from '@nestjs/common'
import { Request } from 'express'
import { PlaylistsService } from './playlists.service'

@Controller('api/playlists')
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Get()
  list(
    @Req() req: Request,
    @Query('search') search?: string,
    @Query('days') days?: string,
  ) {
    const token = req.session.token!
    return this.playlistsService.listPlaylists(token, {
      search,
      days: days !== undefined ? Number(days) : undefined,
    })
  }

  @Get('duplicates')
  duplicates(@Req() req: Request) {
    return this.playlistsService.findDuplicates(req.session.token!)
  }

  @Get('tag-candidates')
  tagCandidates(@Req() req: Request) {
    return this.playlistsService.tagCandidates(req.session.token!)
  }
}
```

- [ ] **Step 4: Wire `PlaylistsModule` into `app.module.ts`**

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ProvidersModule } from './providers/providers.module'
import { PlaylistsModule } from './playlists/playlists.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ProvidersModule,
    PlaylistsModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 5: Verify `GET /api/playlists` is reachable**

```bash
npm run start:dev
```

Without a session token, this will either error or return an empty result. That's
correct — we haven't added `AuthGuard` yet. Confirm the route exists:

```bash
curl -s http://localhost:3000/api/playlists
```

Expected: a response (possibly an error about missing session token — that's fine).
No `404 Cannot GET` means the route registered correctly.

- [ ] **Step 6: Commit**

```bash
git add web/src/playlists/ web/src/app.module.ts
git commit -m "feat(web): PlaylistsModule, service, and list endpoints"
```

---

### Task 4 🎓 — AuthModule: GoogleStrategy, AuthService, AuthController

**NestJS concepts introduced:** Passport `Strategy` class, `PassportStrategy`, `@nestjs/passport`, `@UseGuards(AuthGuard('google'))`, `@Res`, `@nestjs/config` ConfigService

**Files:**
- Create: `web/src/auth/google.strategy.ts`
- Create: `web/src/auth/auth.service.ts`
- Create: `web/src/auth/auth.controller.ts`
- Create: `web/src/auth/auth.module.ts`
- Modify: `web/src/app.module.ts`

**Interfaces:**
- Produces: `GET /auth/login` (redirects to Google), `GET /auth/callback` (sets session, redirects to `/`)

---

#### 🎓 Concept: Passport Strategies

Passport.js is an auth middleware library. A **Strategy** encapsulates one auth method
(Google OAuth, JWT, local username/password, etc.). NestJS wraps it with `@nestjs/passport`.

`PassportStrategy(Strategy, 'google')` extends the `passport-google-oauth20` Strategy
with NestJS DI support. The `validate()` method is called after Google authenticates the
user — whatever you return from it becomes `req.user`.

`@UseGuards(AuthGuard('google'))` on a route tells Passport to run the `'google'`
strategy before the handler. On `/auth/login` this triggers the redirect to Google.
On `/auth/callback` it exchanges the `?code=` for tokens and calls `validate()`.

---

- [ ] **Step 1: Write `web/src/auth/google.strategy.ts`**

```typescript
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, VerifyCallback } from 'passport-google-oauth20'
import { Request } from 'express'
import { TokenData } from './token-data.interface'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.getOrThrow('GOOGLE_CLIENT_ID'),
      clientSecret: config.getOrThrow('GOOGLE_CLIENT_SECRET'),
      callbackURL: 'http://localhost:3000/auth/callback',
      scope: ['https://www.googleapis.com/auth/youtube'],
      passReqToCallback: true,
    })
  }

  validate(
    _req: Request,
    accessToken: string,
    refreshToken: string,
    _profile: unknown,
    done: VerifyCallback,
  ): void {
    const token: TokenData = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: Date.now() + 3600 * 1000,
    }
    done(null, token)   // req.user = token
  }
}
```

**Why `config.getOrThrow`?** Fails loudly at startup if the env var is missing.
Better to crash early than to crash mysteriously when the first user tries to log in.

---

#### 🎓 Concept: AuthService for token refresh

The Google access token expires in 1 hour. Before every YouTube API call, the service
checks the expiry and refreshes if needed, updating the session token in-place.

---

- [ ] **Step 2: Write `web/src/auth/auth.service.ts`**

```typescript
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TokenData } from './token-data.interface'

@Injectable()
export class AuthService {
  constructor(private readonly config: ConfigService) {}

  async getValidAccessToken(token: TokenData): Promise<string> {
    if (Date.now() < token.expiry_date - 60_000) {
      return token.access_token
    }
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.getOrThrow('GOOGLE_CLIENT_ID'),
        client_secret: this.config.getOrThrow('GOOGLE_CLIENT_SECRET'),
        refresh_token: token.refresh_token,
        grant_type: 'refresh_token',
      }),
    })
    const data = await res.json() as { access_token: string; expires_in: number }
    token.access_token = data.access_token
    token.expiry_date = Date.now() + data.expires_in * 1000
    return token.access_token
  }
}
```

---

#### 🎓 Concept: `@Res` for redirects and `req.user`

After Google calls back, Passport has set `req.user` to whatever `validate()` returned
(our `TokenData`). The controller saves it to the session and redirects to the frontend.

---

- [ ] **Step 3: Write `web/src/auth/auth.controller.ts`**

```typescript
import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Request, Response } from 'express'
import { TokenData } from './token-data.interface'

@Controller('auth')
export class AuthController {
  @Get('login')
  @UseGuards(AuthGuard('google'))
  login(): void {
    // Passport redirects to Google — this body never runs
  }

  @Get('callback')
  @UseGuards(AuthGuard('google'))
  callback(@Req() req: Request, @Res() res: Response): void {
    req.session.token = req.user as TokenData
    res.redirect('http://localhost:5173')
  }

  @Get('logout')
  logout(@Req() req: Request, @Res() res: Response): void {
    req.session.destroy(() => res.redirect('http://localhost:5173'))
  }
}
```

- [ ] **Step 4: Write `web/src/auth/auth.module.ts`**

```typescript
import { Module } from '@nestjs/common'
import { PassportModule } from '@nestjs/passport'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { GoogleStrategy } from './google.strategy'

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [GoogleStrategy, AuthService],
  exports: [AuthService],
})
export class AuthModule {}
```

**Why `exports: [AuthService]`?** `JobsService` (Task 7) needs `AuthService.getValidAccessToken()`.
Exporting makes it available when other modules import `AuthModule`.

- [ ] **Step 5: Wire `AuthModule` into `app.module.ts`**

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ProvidersModule } from './providers/providers.module'
import { PlaylistsModule } from './playlists/playlists.module'
import { AuthModule } from './auth/auth.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ProvidersModule,
    AuthModule,
    PlaylistsModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 6: Test the auth flow**

```bash
npm run start:dev
```

Open `http://localhost:3000/auth/login` in a browser (incognito works best — no extension interference from earlier session).

Expected:
1. Browser redirects to `accounts.google.com` consent screen
2. After approving, browser hits `/auth/callback` and redirects to `http://localhost:5173` (which isn't running yet — you'll get a connection refused, but the callback URL logged correctly = success)

Check session was set by calling the callback URL directly with curl after auth:
The session cookie should be set in the browser.

- [ ] **Step 7: Commit**

```bash
git add web/src/auth/ web/src/app.module.ts
git commit -m "feat(web): AuthModule with GoogleStrategy, AuthService, AuthController"
```

---

### Task 5 🎓 — SessionAuthGuard

**NestJS concept introduced:** `CanActivate`, `ExecutionContext`, `@UseGuards`

**Files:**
- Create: `web/src/common/session-auth.guard.ts`
- Modify: `web/src/playlists/playlists.controller.ts`

**Interfaces:**
- Produces: `SessionAuthGuard` — rejects requests without `req.session.token` with 401

---

#### 🎓 Concept: Guards and `CanActivate`

A **Guard** decides whether a request should reach the route handler. It implements
`CanActivate`, which has one method: `canActivate(ctx: ExecutionContext): boolean`.

`ExecutionContext` is a wrapper around the underlying platform request/response. For HTTP,
call `.switchToHttp().getRequest()` to get the Express `Request` object.

Return `true` → let the request through. Return `false` → NestJS throws `403 Forbidden`.
Throw `UnauthorizedException()` → NestJS returns `401 Unauthorized`.

`@UseGuards(SessionAuthGuard)` on a controller class applies the guard to **every** method
in that controller. You can also apply it to individual methods.

---

- [ ] **Step 1: Write `web/src/common/session-auth.guard.ts`**

```typescript
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Request } from 'express'

@Injectable()
export class SessionAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>()
    if (!req.session?.token) {
      throw new UnauthorizedException('Not authenticated')
    }
    return true
  }
}
```

- [ ] **Step 2: Apply `@UseGuards` to `PlaylistsController`**

Add the guard import and decorator to the top of `web/src/playlists/playlists.controller.ts`:

```typescript
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { SessionAuthGuard } from '../common/session-auth.guard'
import { PlaylistsService } from './playlists.service'

@Controller('api/playlists')
@UseGuards(SessionAuthGuard)
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Get()
  list(
    @Req() req: Request,
    @Query('search') search?: string,
    @Query('days') days?: string,
  ) {
    const token = req.session.token!
    return this.playlistsService.listPlaylists(token, {
      search,
      days: days !== undefined ? Number(days) : undefined,
    })
  }

  @Get('duplicates')
  duplicates(@Req() req: Request) {
    return this.playlistsService.findDuplicates(req.session.token!)
  }

  @Get('tag-candidates')
  tagCandidates(@Req() req: Request) {
    return this.playlistsService.tagCandidates(req.session.token!)
  }
}
```

- [ ] **Step 3: Register `SessionAuthGuard` in `PlaylistsModule` providers**

Guards used via `@UseGuards(ClassName)` must be in the DI container. Add it to `playlists.module.ts`:

```typescript
import { Module } from '@nestjs/common'
import { ProvidersModule } from '../providers/providers.module'
import { SessionAuthGuard } from '../common/session-auth.guard'
import { PlaylistsController } from './playlists.controller'
import { PlaylistsService } from './playlists.service'

@Module({
  imports: [ProvidersModule],
  controllers: [PlaylistsController],
  providers: [PlaylistsService, SessionAuthGuard],
})
export class PlaylistsModule {}
```

- [ ] **Step 4: Verify guard rejects unauthenticated requests**

```bash
curl -s http://localhost:3000/api/playlists
```

Expected:
```json
{"message":"Not authenticated","error":"Unauthorized","statusCode":401}
```

After logging in via browser (`/auth/login`), copy the `connect.sid` session cookie and:

```bash
curl -s -H "Cookie: connect.sid=YOUR_COOKIE" http://localhost:3000/api/playlists
```

Expected: JSON array of playlists (or quota error if daily limit is hit).

- [ ] **Step 5: Commit**

```bash
git add web/src/common/ web/src/playlists/
git commit -m "feat(web): SessionAuthGuard protecting /api/playlists"
```

---

### Task 6 🎓 — Remaining playlist endpoints (DELETE, PUT, rename)

**NestJS concepts introduced:** `@Delete`, `@Put`, `@Body`, `@Param`, `HttpCode`

**Files:**
- Modify: `web/src/playlists/playlists.service.ts`
- Modify: `web/src/playlists/playlists.controller.ts`
- Modify: `web/src/playlists/playlists.module.ts`
- Modify: `web/src/auth/auth.module.ts` (already done) → `PlaylistsModule` imports `AuthModule`

**Interfaces:**
- Consumes: `AuthService.getValidAccessToken(token)` from Task 4
- Produces: `DELETE /api/playlists` (bulk), `PUT /api/playlists/:id`

---

#### 🎓 Concept: `@Body`, `@Param`, `@Delete`, `@Put`, `HttpCode`

`@Body()` deserializes the JSON request body into a parameter.
`@Param('id')` extracts `:id` from the URL path.
`@Delete()` and `@Put()` map HTTP verbs, same as `@Get()`.
`@HttpCode(204)` overrides the default `200` response code — useful for DELETE which
conventionally returns `204 No Content`.

---

- [ ] **Step 1: Add `deleteMany` and `renameOne` to `PlaylistsService`**

`AuthService` is needed for token refresh before mutations. Import it and inject it.
Update `web/src/playlists/playlists.service.ts`:

```typescript
import { Inject, Injectable } from '@nestjs/common'
import { AuthService } from '../auth/auth.service'
import { DuplicateGroup, MusicProvider, MUSIC_PROVIDER, Playlist } from '../providers/music-provider.interface'
import { TokenData } from '../auth/token-data.interface'

const SPO_PREFIX = '[SPO] '

interface ListFilters {
  search?: string
  days?: number
}

@Injectable()
export class PlaylistsService {
  constructor(
    @Inject(MUSIC_PROVIDER) private readonly provider: MusicProvider,
    private readonly authService: AuthService,
  ) {}

  async listPlaylists(token: TokenData, filters: ListFilters = {}): Promise<Playlist[]> {
    const accessToken = await this.authService.getValidAccessToken(token)
    const playlists = await this.provider.listPlaylists(accessToken)
    let result = playlists
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(p => p.title.toLowerCase().includes(q))
    }
    if (filters.days) {
      const cutoff = Date.now() - filters.days * 86_400_000
      result = result.filter(p => new Date(p.publishedAt).getTime() > cutoff)
    }
    return result
  }

  async findDuplicates(token: TokenData): Promise<DuplicateGroup[]> {
    const accessToken = await this.authService.getValidAccessToken(token)
    const playlists = await this.provider.listPlaylists(accessToken)
    const byName = new Map<string, Playlist[]>()
    for (const p of playlists) {
      const group = byName.get(p.title) ?? []
      group.push(p)
      byName.set(p.title, group)
    }
    const groups: DuplicateGroup[] = []
    for (const [name, members] of byName) {
      if (members.length < 2) continue
      const sorted = [...members].sort((a, b) =>
        b.itemCount !== a.itemCount
          ? b.itemCount - a.itemCount
          : a.publishedAt.localeCompare(b.publishedAt),
      )
      groups.push({ name, playlists: sorted, keepIndex: 0 })
    }
    return groups
  }

  async tagCandidates(token: TokenData): Promise<Playlist[]> {
    const accessToken = await this.authService.getValidAccessToken(token)
    const playlists = await this.provider.listPlaylists(accessToken)
    return playlists.filter(p => !p.title.startsWith(SPO_PREFIX))
  }

  async renameOne(token: TokenData, id: string, title: string, description: string): Promise<void> {
    const accessToken = await this.authService.getValidAccessToken(token)
    await this.provider.renamePlaylist(accessToken, id, title, description)
  }
}
```

- [ ] **Step 2: Add DELETE and PUT to `PlaylistsController`**

Full updated `web/src/playlists/playlists.controller.ts`:

```typescript
import { Body, Controller, Delete, Get, HttpCode, Param, Put, Query, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { SessionAuthGuard } from '../common/session-auth.guard'
import { PlaylistsService } from './playlists.service'

@Controller('api/playlists')
@UseGuards(SessionAuthGuard)
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Get()
  list(
    @Req() req: Request,
    @Query('search') search?: string,
    @Query('days') days?: string,
  ) {
    return this.playlistsService.listPlaylists(req.session.token!, {
      search,
      days: days !== undefined ? Number(days) : undefined,
    })
  }

  @Get('duplicates')
  duplicates(@Req() req: Request) {
    return this.playlistsService.findDuplicates(req.session.token!)
  }

  @Get('tag-candidates')
  tagCandidates(@Req() req: Request) {
    return this.playlistsService.tagCandidates(req.session.token!)
  }

  @Put(':id')
  rename(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { title: string; description?: string },
  ) {
    return this.playlistsService.renameOne(req.session.token!, id, body.title, body.description ?? '')
  }
}
```

Note: bulk deletion (DELETE) is handled by the Jobs endpoints in Task 7 (two-step: POST /api/jobs → SSE). A direct synchronous `DELETE /api/playlists` would block for minutes on large batches.

- [ ] **Step 3: Import `AuthModule` into `PlaylistsModule`** so `AuthService` is available

```typescript
import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ProvidersModule } from '../providers/providers.module'
import { SessionAuthGuard } from '../common/session-auth.guard'
import { PlaylistsController } from './playlists.controller'
import { PlaylistsService } from './playlists.service'

@Module({
  imports: [ProvidersModule, AuthModule],
  controllers: [PlaylistsController],
  providers: [PlaylistsService, SessionAuthGuard],
})
export class PlaylistsModule {}
```

- [ ] **Step 4: Test the rename endpoint**

After authenticating in browser and copying session cookie:

```bash
curl -s -X PUT http://localhost:3000/api/playlists/PLAYLIST_ID \
  -H "Cookie: connect.sid=YOUR_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"title":"[SPO] Test Playlist"}'
```

Expected: `200 {}` (empty body, no error).

- [ ] **Step 5: Commit**

```bash
git add web/src/playlists/ 
git commit -m "feat(web): add rename endpoint + AuthService token refresh in PlaylistsService"
```

---

### Task 7 🎓 — JobsModule: in-process job queue + SSE progress stream

**NestJS concepts introduced:** `@Sse()`, `Observable`, `Subject` (RxJS), `@Post`, `@Param`, in-process state

**Files:**
- Create: `web/src/jobs/jobs.module.ts`
- Create: `web/src/jobs/jobs.service.ts`
- Create: `web/src/jobs/jobs.controller.ts`
- Modify: `web/src/app.module.ts`

**Interfaces:**
- Consumes: `MUSIC_PROVIDER`, `AuthService`
- Produces: `POST /api/jobs` → `{ jobId }`, `GET /api/jobs/:jobId/progress` → SSE stream

---

#### 🎓 Concept: Server-Sent Events with `@Sse()` and `Observable`

NestJS's `@Sse()` decorator turns a route into an SSE endpoint. The route handler must
return an `Observable<MessageEvent>`. NestJS subscribes to it and writes each emitted
value to the HTTP response as `data: ...\n\n`.

`Subject<T>` from RxJS is both an `Observable` (can be subscribed to) and an `Observer`
(you can call `.next(value)` to emit). The deletion loop calls `subject.next()` for each
completed delete, and `subject.complete()` when done — NestJS closes the SSE connection.

`MessageEvent` here is `{ data: unknown }`. The `data` field is JSON-serialized.

---

- [ ] **Step 1: Write `web/src/jobs/jobs.service.ts`**

```typescript
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { Observable, Subject } from 'rxjs'
import { AuthService } from '../auth/auth.service'
import { TokenData } from '../auth/token-data.interface'
import { MusicProvider, MUSIC_PROVIDER } from '../providers/music-provider.interface'

interface ProgressEvent {
  data: {
    done: number
    total: number
    current?: string
    complete?: boolean
    error?: string
  }
}

interface JobState {
  subject: Subject<ProgressEvent>
}

@Injectable()
export class JobsService {
  private readonly jobs = new Map<string, JobState>()

  constructor(
    @Inject(MUSIC_PROVIDER) private readonly provider: MusicProvider,
    private readonly authService: AuthService,
  ) {}

  startDeleteJob(token: TokenData, ids: string[]): string {
    const jobId = Math.random().toString(36).slice(2, 10)
    const subject = new Subject<ProgressEvent>()
    this.jobs.set(jobId, { subject })
    this.runDeletions(token, ids, subject, jobId).catch(() => {
      subject.complete()
      this.jobs.delete(jobId)
    })
    return jobId
  }

  getProgress(jobId: string): Observable<ProgressEvent> {
    const job = this.jobs.get(jobId)
    if (!job) throw new NotFoundException(`Job ${jobId} not found`)
    return job.subject.asObservable()
  }

  private async runDeletions(
    token: TokenData,
    ids: string[],
    subject: Subject<ProgressEvent>,
    jobId: string,
  ): Promise<void> {
    const total = ids.length
    let done = 0

    for (const id of ids) {
      try {
        const accessToken = await this.authService.getValidAccessToken(token)
        await this.provider.deletePlaylist(accessToken, id)
        done++
        subject.next({ data: { done, total, current: id } })
      } catch (err: unknown) {
        const e = err as { reason?: string }
        if (e.reason === 'quotaExceeded') {
          subject.next({ data: { done, total, error: 'quotaExceeded' } })
          break
        }
        // non-quota errors: log and continue
        subject.next({ data: { done, total, current: id, error: (err as Error).message } })
      }
    }

    subject.next({ data: { done, total, complete: true } })
    subject.complete()
    this.jobs.delete(jobId)
  }
}
```

- [ ] **Step 2: Write `web/src/jobs/jobs.controller.ts`**

```typescript
import { Body, Controller, Get, MessageEvent, Param, Post, Req, Sse, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { Observable } from 'rxjs'
import { SessionAuthGuard } from '../common/session-auth.guard'
import { JobsService } from './jobs.service'

@Controller('api/jobs')
@UseGuards(SessionAuthGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  start(@Req() req: Request, @Body() body: { ids: string[] }): { jobId: string } {
    const jobId = this.jobsService.startDeleteJob(req.session.token!, body.ids)
    return { jobId }
  }

  @Sse(':jobId/progress')
  progress(@Param('jobId') jobId: string): Observable<MessageEvent> {
    return this.jobsService.getProgress(jobId) as Observable<MessageEvent>
  }
}
```

**Why `@Sse` instead of `@Get`?** `@Sse` sets `Content-Type: text/event-stream` and
keeps the connection open, writing newline-delimited JSON as the Observable emits.
`@Get` would buffer the entire response and send it at once — useless for progress.

- [ ] **Step 3: Write `web/src/jobs/jobs.module.ts`**

```typescript
import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ProvidersModule } from '../providers/providers.module'
import { SessionAuthGuard } from '../common/session-auth.guard'
import { JobsController } from './jobs.controller'
import { JobsService } from './jobs.service'

@Module({
  imports: [ProvidersModule, AuthModule],
  controllers: [JobsController],
  providers: [JobsService, SessionAuthGuard],
})
export class JobsModule {}
```

- [ ] **Step 4: Wire `JobsModule` into `app.module.ts`**

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { JobsModule } from './jobs/jobs.module'
import { PlaylistsModule } from './playlists/playlists.module'
import { ProvidersModule } from './providers/providers.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ProvidersModule,
    AuthModule,
    PlaylistsModule,
    JobsModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 5: Test SSE with curl (after authenticating in browser)**

```bash
# Start a job with one playlist ID
curl -s -X POST http://localhost:3000/api/jobs \
  -H "Cookie: connect.sid=YOUR_COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"ids":["PLxxxxxxx"]}' 
# → {"jobId":"abc12345"}

# Stream progress (keep connection open)
curl -N http://localhost:3000/api/jobs/abc12345/progress \
  -H "Cookie: connect.sid=YOUR_COOKIE"
# → data: {"done":1,"total":1,"current":"PLxxxxxxx"}
# → data: {"done":1,"total":1,"complete":true}
```

- [ ] **Step 6: Commit**

```bash
git add web/src/jobs/ web/src/app.module.ts
git commit -m "feat(web): JobsModule with in-process deletion queue and SSE progress stream"
```

---

### Task 8 🤖 — Vite + React scaffold: auth, routing, nav, design system

**Files:** All in `web/client/`

- [ ] **Step 1: Create `web/client/package.json`**

```json
{
  "name": "youtube-playlist-manager-client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.7.3",
    "vite": "^5.4.11"
  }
}
```

- [ ] **Step 2: Install deps**

```bash
cd web/client && npm install
```

- [ ] **Step 3: Create `web/client/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022","DOM","DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `web/client/vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/auth': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  build: { outDir: '../dist-client' },
})
```

- [ ] **Step 5: Create `web/client/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Playlist Manager</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `web/client/src/styles/reset.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-ui); background: var(--bg); color: var(--ink); }
a { color: inherit; text-decoration: none; }
button { cursor: pointer; font-family: inherit; }
ul, ol { list-style: none; }
```

- [ ] **Step 7: Create `web/client/src/styles/tokens.css`**

```css
:root {
  --bg:       #F5F0E8;
  --ink:      #0A0A0A;
  --pink:     #FF2D55;
  --yellow:   #FFE600;
  --blue:     #0057FF;
  --green:    #00D084;
  --surface:  #FFFFFF;
  --border:   2px solid var(--ink);
  --shadow:   4px 4px 0 var(--ink);
  --shadow-lg:6px 6px 0 var(--ink);
  --font-display: 'Syne', sans-serif;
  --font-ui:      'Space Grotesk', sans-serif;
}
```

- [ ] **Step 8: Create `web/client/src/styles/neo-brutal.css`**

```css
/* Buttons */
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 20px; font-family: var(--font-ui); font-weight: 700;
  font-size: 14px; border: var(--border); box-shadow: var(--shadow);
  transition: transform 80ms, box-shadow 80ms; background: var(--surface);
}
.btn:active { transform: translate(4px,4px); box-shadow: none; }

.btn-primary   { background: var(--pink);   color: #fff; }
.btn-secondary { background: var(--yellow); color: var(--ink); }
.btn-danger    { background: #FF3333;       color: #fff; }
.btn-ghost     { background: transparent; box-shadow: none; border-color: transparent; }
.btn-ghost:active { transform: none; }

/* Cards */
.card {
  background: var(--surface); border: var(--border);
  box-shadow: var(--shadow); padding: 16px;
  transition: transform 100ms, box-shadow 100ms;
}
.card:hover { transform: translate(-2px,-2px); box-shadow: var(--shadow-lg); }

/* Playlist row */
.playlist-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-bottom: 1px solid var(--ink);
  background: var(--surface); transition: background 80ms;
}
.playlist-row.selected {
  border-left: 4px solid var(--yellow);
  background: rgba(255,230,0,0.12);
}
.playlist-row:last-child { border-bottom: none; }

/* Checkbox */
.checkbox {
  width: 24px; height: 24px; flex-shrink: 0;
  border: 3px solid var(--ink); background: var(--surface);
  display: grid; place-items: center; cursor: pointer;
  transition: background 80ms;
}
.checkbox.checked { background: var(--yellow); }
.checkbox.checked::after { content: '✓'; font-weight: 900; font-size: 14px; }

/* Input */
.input {
  padding: 10px 14px; border: var(--border); background: var(--surface);
  font-family: var(--font-ui); font-size: 14px; width: 100%;
  outline: none; box-shadow: var(--shadow);
}
.input:focus { box-shadow: var(--shadow-lg); }

/* Badge / chip */
.chip {
  display: inline-flex; align-items: center;
  padding: 2px 8px; border: 1px solid var(--ink);
  font-family: var(--font-display); font-size: 11px; font-weight: 700;
  letter-spacing: 0.05em; text-transform: uppercase;
}
.chip-yt    { background: var(--pink);   color: #fff; }
.chip-count { background: var(--ink);    color: var(--bg); }

/* Progress bar */
.progress-track {
  height: 20px; border: var(--border); background: var(--surface);
  overflow: hidden;
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

/* Bulk action bar */
.bulk-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: var(--ink); color: var(--bg);
  padding: 16px 24px; display: flex; align-items: center; gap: 16px;
  font-family: var(--font-ui); font-weight: 600;
  transform: translateY(100%); transition: transform 200ms ease;
  z-index: 100;
}
.bulk-bar.visible { transform: translateY(0); }
.bulk-bar .btn-danger { border-color: #fff; box-shadow: 4px 4px 0 #555; }

/* Page layout */
.page { max-width: 960px; margin: 0 auto; padding: 24px 16px 120px; }
.page-title {
  font-family: var(--font-display); font-size: 32px; font-weight: 800;
  margin-bottom: 24px;
}

/* Tag for recommended */
.tag-recommended {
  display: inline-block; padding: 1px 6px;
  background: var(--yellow); border: 1px solid var(--ink);
  font-size: 11px; font-weight: 700; margin-left: 8px;
}
```

- [ ] **Step 9: Create `web/client/src/api.ts`** (typed fetch helpers)

```typescript
export interface Playlist {
  id: string; title: string; description: string
  itemCount: number; publishedAt: string; provider: string
}

export interface DuplicateGroup {
  name: string; playlists: Playlist[]; keepIndex: number
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { credentials: 'include', ...init })
  if (res.status === 401) { window.location.href = '/login'; throw new Error('unauthenticated') }
  if (!res.ok) throw new Error(`API ${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  playlists: {
    list: (params?: { search?: string; days?: number }) => {
      const q = new URLSearchParams()
      if (params?.search) q.set('search', params.search)
      if (params?.days)   q.set('days',   String(params.days))
      return apiFetch<Playlist[]>(`/api/playlists?${q}`)
    },
    duplicates: () => apiFetch<DuplicateGroup[]>('/api/playlists/duplicates'),
    tagCandidates: () => apiFetch<Playlist[]>('/api/playlists/tag-candidates'),
    rename: (id: string, title: string, description: string) =>
      apiFetch<void>(`/api/playlists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      }),
  },
  jobs: {
    start: (ids: string[]) =>
      apiFetch<{ jobId: string }>('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      }),
  },
}
```

- [ ] **Step 10: Create `web/client/src/components/Nav.tsx`**

```tsx
import { NavLink } from 'react-router-dom'
import './Nav.css'

export function Nav() {
  return (
    <nav className="nav">
      <div className="nav-brand">
        <span className="chip chip-yt">YT</span>
        <span className="nav-title">Playlist Manager</span>
      </div>
      <div className="nav-links">
        <NavLink to="/"           className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>All</NavLink>
        <NavLink to="/duplicates" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Duplicates</NavLink>
        <NavLink to="/tag"        className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>[SPO]</NavLink>
        <NavLink to="/recent"     className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Recent</NavLink>
      </div>
      <a href="/auth/logout" className="btn btn-ghost" style={{fontSize:13}}>Log out</a>
    </nav>
  )
}
```

- [ ] **Step 11: Create `web/client/src/components/Nav.css`**

```css
.nav {
  position: sticky; top: 0; z-index: 50;
  display: flex; align-items: center; gap: 24px;
  padding: 12px 24px; background: var(--surface);
  border-bottom: var(--border); box-shadow: 0 2px 0 var(--ink);
}
.nav-brand { display: flex; align-items: center; gap: 10px; }
.nav-title { font-family: var(--font-display); font-weight: 800; font-size: 18px; }
.nav-links { display: flex; gap: 4px; flex: 1; }
.nav-link {
  padding: 6px 14px; font-weight: 600; font-size: 14px;
  border: 2px solid transparent;
}
.nav-link:hover { border-color: var(--ink); }
.nav-link.active { border-color: var(--ink); background: var(--yellow); }
```

- [ ] **Step 12: Create `web/client/src/pages/LoginPage.tsx`**

```tsx
import '../styles/tokens.css'
import '../styles/reset.css'
import '../styles/neo-brutal.css'

export function LoginPage() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap: 32, background:'var(--bg)' }}>
      <div style={{ textAlign:'center' }}>
        <div className="chip chip-yt" style={{fontSize:14, marginBottom:16}}>YT</div>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:48, fontWeight:800, lineHeight:1 }}>
          Playlist<br />Manager
        </h1>
        <p style={{ marginTop:16, fontWeight:600, color:'#555' }}>
          Clean up your YouTube playlists.
        </p>
      </div>
      <a href="/auth/login" className="btn btn-primary" style={{fontSize:16, padding:'14px 32px'}}>
        Connect YouTube →
      </a>
    </div>
  )
}
```

- [ ] **Step 13: Create `web/client/src/App.tsx`**

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Nav } from './components/Nav'
import { DuplicatesPage } from './pages/DuplicatesPage'
import { LoginPage } from './pages/LoginPage'
import { PlaylistsPage } from './pages/PlaylistsPage'
import { RecentPage } from './pages/RecentPage'
import { TagPage } from './pages/TagPage'
import './styles/reset.css'
import './styles/tokens.css'
import './styles/neo-brutal.css'

function Layout() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/"           element={<PlaylistsPage />} />
        <Route path="/duplicates" element={<DuplicatesPage />} />
        <Route path="/tag"        element={<TagPage />} />
        <Route path="/recent"     element={<RecentPage />} />
        <Route path="*"           element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*"      element={<Layout />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 14: Create `web/client/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 15: Create placeholder pages** (will be replaced in Tasks 9–10)

Create `web/client/src/pages/PlaylistsPage.tsx`:
```tsx
export function PlaylistsPage() { return <div className="page"><h1 className="page-title">All Playlists</h1></div> }
```

Create `web/client/src/pages/DuplicatesPage.tsx`:
```tsx
export function DuplicatesPage() { return <div className="page"><h1 className="page-title">Duplicates</h1></div> }
```

Create `web/client/src/pages/TagPage.tsx`:
```tsx
export function TagPage() { return <div className="page"><h1 className="page-title">Tag with [SPO]</h1></div> }
```

Create `web/client/src/pages/RecentPage.tsx`:
```tsx
export function RecentPage() { return <div className="page"><h1 className="page-title">Delete Recent</h1></div> }
```

- [ ] **Step 16: Verify frontend runs**

```bash
cd web/client && npm run dev
```

Open `http://localhost:5173` — should show the Login page (white screen + button).
Clicking "Connect YouTube →" should redirect through `/auth/login` → Google → back to `http://localhost:5173` landing on All Playlists (blank for now).

- [ ] **Step 17: Commit**

```bash
git add web/client/
git commit -m "feat(web): Vite + React scaffold with neo-brutal design system + auth routing"
```

---

### Task 9 🤖 — PlaylistsPage: list, search, date filter, infinite scroll, bulk delete

**Files:**
- Replace: `web/client/src/pages/PlaylistsPage.tsx`
- Create: `web/client/src/components/FilterBar.tsx`
- Create: `web/client/src/components/FilterBar.css`
- Create: `web/client/src/components/PlaylistCard.tsx`
- Create: `web/client/src/components/PlaylistCard.css`
- Create: `web/client/src/components/BulkActionBar.tsx`
- Create: `web/client/src/components/ProgressDrawer.tsx`
- Create: `web/client/src/components/ProgressDrawer.css`

- [ ] **Step 1: Create `web/client/src/components/FilterBar.tsx`**

```tsx
import { useState } from 'react'
import './FilterBar.css'

interface Props {
  onFilter: (params: { search: string; days: number | undefined }) => void
}

const DAY_OPTIONS = [
  { label: 'All time', value: undefined },
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
]

export function FilterBar({ onFilter }: Props) {
  const [search, setSearch] = useState('')
  const [days, setDays] = useState<number | undefined>(undefined)

  function apply(s: string, d: number | undefined) {
    setSearch(s); setDays(d); onFilter({ search: s, days: d })
  }

  return (
    <div className="filter-bar">
      <input
        className="input filter-search"
        placeholder="Search playlists..."
        value={search}
        onChange={e => apply(e.target.value, days)}
      />
      <div className="filter-days">
        {DAY_OPTIONS.map(opt => (
          <button
            key={opt.label}
            className={`btn ${days === opt.value ? 'btn-secondary' : ''}`}
            style={days !== opt.value ? {boxShadow:'none',borderColor:'transparent'} : {}}
            onClick={() => apply(search, opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `web/client/src/components/FilterBar.css`**

```css
.filter-bar { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
.filter-search { max-width: 400px; }
.filter-days { display: flex; flex-wrap: wrap; gap: 8px; }
```

- [ ] **Step 3: Create `web/client/src/components/PlaylistCard.tsx`**

```tsx
import { Playlist } from '../api'
import './PlaylistCard.css'

interface Props {
  playlist: Playlist
  selected: boolean
  onToggle: () => void
}

export function PlaylistCard({ playlist, selected, onToggle }: Props) {
  const date = playlist.publishedAt.slice(0, 10)
  const tracks = `${playlist.itemCount} track${playlist.itemCount !== 1 ? 's' : ''}`

  return (
    <div className={`playlist-row ${selected ? 'selected' : ''}`}>
      <div
        className={`checkbox ${selected ? 'checked' : ''}`}
        onClick={onToggle}
        role="checkbox"
        aria-checked={selected}
        tabIndex={0}
        onKeyDown={e => e.key === ' ' && onToggle()}
      />
      <div className="playlist-row-body" onClick={onToggle}>
        <span className="playlist-title">{playlist.title}</span>
        <span className="playlist-meta">{date} · {tracks}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `web/client/src/components/PlaylistCard.css`**

```css
.playlist-row-body { display: flex; flex-direction: column; gap: 2px; flex: 1; cursor: pointer; }
.playlist-title { font-weight: 600; font-size: 15px; }
.playlist-meta  { font-size: 12px; color: #666; }
```

- [ ] **Step 5: Create `web/client/src/components/ProgressDrawer.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import './ProgressDrawer.css'

interface ProgressEvent {
  done: number; total: number; complete?: boolean; error?: string; current?: string
}

interface Props {
  jobId: string | null
  onDone: () => void
}

export function ProgressDrawer({ jobId, onDone }: Props) {
  const [progress, setProgress] = useState<ProgressEvent | null>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!jobId) { setProgress(null); return }

    const es = new EventSource(`/api/jobs/${jobId}/progress`, { withCredentials: true })
    esRef.current = es

    es.onmessage = (e: MessageEvent<string>) => {
      const data = JSON.parse(e.data) as ProgressEvent
      setProgress(data)
      if (data.complete || data.error === 'quotaExceeded') {
        es.close()
        if (data.complete) setTimeout(onDone, 1200)
      }
    }
    es.onerror = () => es.close()
    return () => { es.close() }
  }, [jobId, onDone])

  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0
  const visible = !!jobId

  return (
    <div className={`progress-drawer ${visible ? 'visible' : ''}`}>
      {progress?.error === 'quotaExceeded' ? (
        <div className="progress-quota-msg">
          ⚠ Quota exceeded — deleted {progress.done}/{progress.total}.
          Quota resets at midnight Pacific Time.
        </div>
      ) : (
        <>
          <div className="progress-label">
            Deleting {progress?.done ?? 0}/{progress?.total ?? 0}…
          </div>
          <div className="progress-track" style={{flex:1}}>
            <div className="progress-fill" style={{width:`${pct}%`}} />
          </div>
          <div className="progress-pct">{pct}%</div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create `web/client/src/components/ProgressDrawer.css`**

```css
.progress-drawer {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: var(--ink); color: var(--bg);
  padding: 16px 24px; display: flex; align-items: center; gap: 16px;
  transform: translateY(100%); transition: transform 250ms ease;
  z-index: 90; font-weight: 600;
}
.progress-drawer.visible { transform: translateY(0); }
.progress-label { white-space: nowrap; font-size: 14px; }
.progress-pct   { white-space: nowrap; font-size: 14px; min-width: 40px; text-align: right; }
.progress-quota-msg { font-size: 14px; color: #FFB3C1; }
```

- [ ] **Step 7: Create `web/client/src/components/BulkActionBar.tsx`**

```tsx
import './BulkActionBar.css'

interface Props {
  count: number
  onDelete: () => void
  onClear: () => void
}

export function BulkActionBar({ count, onDelete, onClear }: Props) {
  return (
    <div className={`bulk-bar ${count > 0 ? 'visible' : ''}`}>
      <span>{count} selected</span>
      <button className="btn btn-danger" onClick={onDelete}>
        Delete {count}
      </button>
      <button className="btn btn-ghost" style={{color:'#aaa'}} onClick={onClear}>
        Clear
      </button>
    </div>
  )
}
```

- [ ] **Step 8: Create `web/client/src/components/BulkActionBar.css`**

```css
/* inherits .bulk-bar from neo-brutal.css */
```

- [ ] **Step 9: Replace `web/client/src/pages/PlaylistsPage.tsx`**

```tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { api, Playlist } from '../api'
import { BulkActionBar } from '../components/BulkActionBar'
import { FilterBar } from '../components/FilterBar'
import { PlaylistCard } from '../components/PlaylistCard'
import { ProgressDrawer } from '../components/ProgressDrawer'

const PAGE_SIZE = 30

export function PlaylistsPage() {
  const [all, setAll] = useState<Playlist[]>([])
  const [visible, setVisible] = useState<Playlist[]>([])
  const [selected, setSelected] = useState(new Set<string>())
  const [jobId, setJobId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef(1)

  const load = useCallback(async (params?: { search?: string; days?: number }) => {
    setLoading(true)
    pageRef.current = 1
    const playlists = await api.playlists.list(params)
    setAll(playlists)
    setVisible(playlists.slice(0, PAGE_SIZE))
    setSelected(new Set())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && visible.length < all.length) {
        const next = pageRef.current + 1
        pageRef.current = next
        setVisible(all.slice(0, next * PAGE_SIZE))
      }
    }, { threshold: 0.1 })
    const el = sentinelRef.current
    if (el) observer.observe(el)
    return () => { if (el) observer.unobserve(el) }
  }, [all, visible.length])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function deleteSelected() {
    const ids = [...selected]
    const { jobId: jid } = await api.jobs.start(ids)
    setJobId(jid)
  }

  function onDone() {
    setJobId(null)
    load()
  }

  return (
    <>
      <div className="page">
        <h1 className="page-title">All Playlists</h1>
        <FilterBar onFilter={load} />
        {loading && <p style={{fontWeight:600}}>Loading…</p>}
        <div className="card" style={{padding:0, overflow:'hidden'}}>
          {visible.map(p => (
            <PlaylistCard
              key={p.id}
              playlist={p}
              selected={selected.has(p.id)}
              onToggle={() => toggle(p.id)}
            />
          ))}
          {visible.length < all.length && (
            <div ref={sentinelRef} style={{padding:16,textAlign:'center',color:'#999',fontSize:13}}>
              Loading more…
            </div>
          )}
          {!loading && all.length === 0 && (
            <div style={{padding:32,textAlign:'center',color:'#999'}}>No playlists found.</div>
          )}
        </div>
      </div>
      <BulkActionBar count={selected.size} onDelete={deleteSelected} onClear={() => setSelected(new Set())} />
      <ProgressDrawer jobId={jobId} onDone={onDone} />
    </>
  )
}
```

- [ ] **Step 10: Verify PlaylistsPage**

```bash
cd web/client && npm run dev
```

Log in via `http://localhost:5173/login`. Navigate to `/` — playlists should load.
Select a few, bulk action bar slides up. (Don't actually delete — quota is precious.)

- [ ] **Step 11: Commit**

```bash
git add web/client/src/
git commit -m "feat(web): PlaylistsPage with filter, infinite scroll, bulk select + ProgressDrawer"
```

---

### Task 10 🤖 — Mode pages: Duplicates, Tag, Recent + ProgressDrawer wired

**Files:**
- Replace: `web/client/src/pages/DuplicatesPage.tsx`
- Replace: `web/client/src/pages/TagPage.tsx`
- Replace: `web/client/src/pages/RecentPage.tsx`
- Create: `web/client/src/components/DuplicateGroup.tsx`
- Create: `web/client/src/components/DuplicateGroup.css`

- [ ] **Step 1: Create `web/client/src/components/DuplicateGroup.tsx`**

```tsx
import { DuplicateGroup as DGType } from '../api'
import './DuplicateGroup.css'

interface Props {
  group: DGType
  keepIndex: number
  onFlipKeep: () => void
}

export function DuplicateGroupCard({ group, keepIndex, onFlipKeep }: Props) {
  return (
    <div className="card dg-card">
      <div className="dg-header" onClick={onFlipKeep} title="Click to flip keeper">
        <strong>{group.name}</strong>
        <span className="chip chip-count">{group.playlists.length} copies</span>
      </div>
      {group.playlists.map((p, i) => (
        <div key={p.id} className={`dg-row ${i === keepIndex ? 'keep' : 'delete'}`}>
          <span className="dg-badge">{i === keepIndex ? '✓ KEEP' : '✗ DEL'}</span>
          <span className="dg-title">{p.title}</span>
          <span className="dg-meta">{p.itemCount} tracks · {p.publishedAt.slice(0,10)}</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create `web/client/src/components/DuplicateGroup.css`**

```css
.dg-card { padding: 0; overflow: hidden; margin-bottom: 16px; }
.dg-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: var(--bg); border-bottom: var(--border);
  cursor: pointer; font-family: var(--font-display); font-size: 15px;
}
.dg-header:hover { background: var(--yellow); }
.dg-row { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-bottom: 1px solid #eee; }
.dg-row.keep   { background: rgba(0,208,132,0.08); }
.dg-row.delete { background: rgba(255,45,85,0.06); }
.dg-badge { font-size: 11px; font-weight: 800; font-family: var(--font-display); min-width: 58px; }
.dg-row.keep   .dg-badge { color: var(--green); }
.dg-row.delete .dg-badge { color: var(--pink); }
.dg-title { flex: 1; font-weight: 600; font-size: 14px; }
.dg-meta  { font-size: 12px; color: #888; }
```

- [ ] **Step 3: Replace `web/client/src/pages/DuplicatesPage.tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react'
import { api, DuplicateGroup } from '../api'
import { DuplicateGroupCard } from '../components/DuplicateGroup'
import { ProgressDrawer } from '../components/ProgressDrawer'

export function DuplicatesPage() {
  const [groups, setGroups] = useState<(DuplicateGroup & { keepIndex: number })[]>([])
  const [jobId, setJobId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const g = await api.playlists.duplicates()
    setGroups(g.map(x => ({ ...x })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function flipKeep(i: number) {
    setGroups(prev => prev.map((g, idx) =>
      idx === i ? { ...g, keepIndex: (g.keepIndex + 1) % g.playlists.length } : g
    ))
  }

  async function deleteAll() {
    const ids = groups.flatMap(g => g.playlists.filter((_, i) => i !== g.keepIndex).map(p => p.id))
    if (ids.length === 0) return
    const { jobId: jid } = await api.jobs.start(ids)
    setJobId(jid)
  }

  const toDelete = groups.reduce((n, g) => n + g.playlists.length - 1, 0)

  return (
    <>
      <div className="page">
        <div style={{display:'flex',alignItems:'baseline',gap:16,marginBottom:24}}>
          <h1 className="page-title" style={{margin:0}}>Duplicates</h1>
          {!loading && groups.length > 0 && (
            <button className="btn btn-danger" onClick={deleteAll}>
              Delete {toDelete} duplicates
            </button>
          )}
        </div>
        {loading && <p style={{fontWeight:600}}>Scanning…</p>}
        {!loading && groups.length === 0 && (
          <div className="card" style={{padding:32,textAlign:'center',color:'#999'}}>
            No duplicates found. 
          </div>
        )}
        {groups.map((g, i) => (
          <DuplicateGroupCard key={g.name} group={g} keepIndex={g.keepIndex} onFlipKeep={() => flipKeep(i)} />
        ))}
      </div>
      <ProgressDrawer jobId={jobId} onDone={() => { setJobId(null); load() }} />
    </>
  )
}
```

- [ ] **Step 4: Replace `web/client/src/pages/TagPage.tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react'
import { api, Playlist } from '../api'
import { BulkActionBar } from '../components/BulkActionBar'
import { PlaylistCard } from '../components/PlaylistCard'
import { ProgressDrawer } from '../components/ProgressDrawer'

const SPO = '[SPO] '

export function TagPage() {
  const [candidates, setCandidates] = useState<Playlist[]>([])
  const [selected, setSelected] = useState(new Set<string>())
  const [loading, setLoading] = useState(true)

  const THIRTY_DAYS = 30 * 86_400_000

  const load = useCallback(async () => {
    setLoading(true)
    const list = await api.playlists.tagCandidates()
    setCandidates(list)
    // Pre-select playlists < 30 days old (matching CLI recommendation logic)
    const now = Date.now()
    setSelected(new Set(list.filter(p => now - new Date(p.publishedAt).getTime() < THIRTY_DAYS).map(p => p.id)))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function toggle(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  async function renameSelected() {
    const toRename = candidates.filter(p => selected.has(p.id))
    for (const p of toRename) {
      await api.playlists.rename(p.id, SPO + p.title, p.description)
    }
    load()
  }

  const now = Date.now()

  return (
    <>
      <div className="page">
        <h1 className="page-title">Tag with [SPO]</h1>
        <p style={{marginBottom:16,color:'#555',fontWeight:600}}>
          Playlists younger than 30 days are pre-selected <span className="tag-recommended">★ new</span>
        </p>
        {loading && <p style={{fontWeight:600}}>Loading…</p>}
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          {candidates.map(p => {
            const isNew = now - new Date(p.publishedAt).getTime() < THIRTY_DAYS
            return (
              <div key={p.id} style={{position:'relative'}}>
                <PlaylistCard playlist={p} selected={selected.has(p.id)} onToggle={() => toggle(p.id)} />
                {isNew && <span className="tag-recommended" style={{position:'absolute',top:14,right:16}}>★ new</span>}
              </div>
            )
          })}
        </div>
      </div>
      <BulkActionBar
        count={selected.size}
        onDelete={renameSelected}
        onClear={() => setSelected(new Set())}
      />
      <ProgressDrawer jobId={jobId} onDone={() => { setJobId(null); load() }} />
    </>
  )
}
```

Note: Tag mode renames playlists directly (no job queue needed — renames are quick).
The `BulkActionBar` "Delete" label repurposed to "Rename" visually via a quick override:

Add to `TagPage.tsx` after the import block:
```tsx
// Override bulk bar label for rename action
const RenameBulkBar = ({ count, onRename, onClear }: { count: number; onRename: () => void; onClear: () => void }) => (
  <div className={`bulk-bar ${count > 0 ? 'visible' : ''}`}>
    <span>{count} selected</span>
    <button className="btn btn-secondary" onClick={onRename}>Add [SPO] to {count}</button>
    <button className="btn btn-ghost" style={{color:'#aaa'}} onClick={onClear}>Clear</button>
  </div>
)
```

Replace the `<BulkActionBar>` usage in the return with:
```tsx
<RenameBulkBar count={selected.size} onRename={renameSelected} onClear={() => setSelected(new Set())} />
```

- [ ] **Step 5: Replace `web/client/src/pages/RecentPage.tsx`**

```tsx
import { useState } from 'react'
import { api, Playlist } from '../api'
import { BulkActionBar } from '../components/BulkActionBar'
import { PlaylistCard } from '../components/PlaylistCard'
import { ProgressDrawer } from '../components/ProgressDrawer'

// Matches same unit strings as CLI src/time.ts
function parseMs(input: string): number | null {
  const m = input.trim().toLowerCase().match(/^(\d+)\s*(h|hour|hours|d|day|days|w|week|weeks|mo|month|months)$/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  if (n <= 0) return null
  const units: Record<string, number> = {
    h:3_600_000,hour:3_600_000,hours:3_600_000,
    d:86_400_000,day:86_400_000,days:86_400_000,
    w:7*86_400_000,week:7*86_400_000,weeks:7*86_400_000,
    mo:30*86_400_000,month:30*86_400_000,months:30*86_400_000,
  }
  return (units[m[2]] ?? null) && n * units[m[2]]
}

export function RecentPage() {
  const [rangeInput, setRangeInput] = useState('')
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selected, setSelected] = useState(new Set<string>())
  const [jobId, setJobId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  async function search() {
    const ms = parseMs(rangeInput)
    if (!ms) { setError('Try: 6 hours, 3 days, 2 weeks, 1 month'); return }
    setError('')
    const days = ms / 86_400_000
    const list = await api.playlists.list({ days })
    setPlaylists(list)
    setSelected(new Set(list.map(p => p.id)))
    setSearched(true)
  }

  function toggle(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  async function deleteSelected() {
    const { jobId: jid } = await api.jobs.start([...selected])
    setJobId(jid)
  }

  return (
    <>
      <div className="page">
        <h1 className="page-title">Delete Recent</h1>
        <p style={{marginBottom:16,color:'#555',fontWeight:600}}>
          Find playlists created within a time range, then bulk delete.
        </p>
        <div style={{display:'flex',gap:12,marginBottom:8,alignItems:'flex-end'}}>
          <div style={{flex:1,maxWidth:320}}>
            <label style={{display:'block',fontWeight:700,marginBottom:6}}>
              Newer than
            </label>
            <input
              className="input"
              placeholder="e.g. 2 weeks, 30 days, 6 hours"
              value={rangeInput}
              onChange={e => setRangeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
            />
          </div>
          <button className="btn btn-secondary" onClick={search}>Find</button>
        </div>
        {error && <p style={{color:' var(--pink)',fontWeight:700,marginBottom:16}}>{error}</p>}

        {searched && playlists.length === 0 && (
          <div className="card" style={{padding:32,textAlign:'center',color:'#999'}}>
            No playlists found in that range.
          </div>
        )}
        {playlists.length > 0 && (
          <div className="card" style={{padding:0,overflow:'hidden',marginTop:16}}>
            {playlists.map(p => (
              <PlaylistCard key={p.id} playlist={p} selected={selected.has(p.id)} onToggle={() => toggle(p.id)} />
            ))}
          </div>
        )}
      </div>
      <BulkActionBar count={selected.size} onDelete={deleteSelected} onClear={() => setSelected(new Set())} />
      <ProgressDrawer jobId={jobId} onDone={() => { setJobId(null); setPlaylists([]); setSelected(new Set()); setSearched(false) }} />
    </>
  )
}
```

- [ ] **Step 6: Verify all four pages load**

```bash
cd web/client && npm run dev
```

Navigate between `/`, `/duplicates`, `/tag`, `/recent` — all should render without errors.

- [ ] **Step 7: Commit**

```bash
git add web/client/src/
git commit -m "feat(web): DuplicatesPage, TagPage, RecentPage with SSE progress"
```

---

### Task 11 🤖 — Production build: NestJS serves React bundle

**Files:**
- Modify: `web/package.json`
- Modify: `web/src/main.ts`
- Modify: `web/src/app.module.ts`

**Interfaces:**
- Produces: `cd web && npm start` serves the full app (no separate Vite needed)

- [ ] **Step 1: Add `@nestjs/serve-static` to `web/package.json` deps**

```bash
cd web && npm install @nestjs/serve-static
```

- [ ] **Step 2: Add build scripts to `web/package.json`**

```json
"scripts": {
  "build": "npm run build:client && nest build",
  "build:client": "cd client && npm run build",
  "start": "node dist/main",
  "start:dev": "nest start --watch"
}
```

- [ ] **Step 3: Update `web/src/app.module.ts` to serve static files in production**

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'path'
import { AuthModule } from './auth/auth.module'
import { JobsModule } from './jobs/jobs.module'
import { PlaylistsModule } from './playlists/playlists.module'
import { ProvidersModule } from './providers/providers.module'

const isProd = process.env.NODE_ENV === 'production'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ...(isProd
      ? [ServeStaticModule.forRoot({ rootPath: join(__dirname, '..', 'dist-client'), exclude: ['/api*', '/auth*'] })]
      : []),
    ProvidersModule,
    AuthModule,
    PlaylistsModule,
    JobsModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 4: Update `web/client/vite.config.ts`** — redirect unknown routes to `index.html` for client-side routing

No change needed — NestJS `ServeStaticModule` already handles this with `renderPath: '/'` default.

- [ ] **Step 5: Build and run**

```bash
cd web && NODE_ENV=production npm run build && NODE_ENV=production npm start
```

Open `http://localhost:3000` — should serve the React app. Navigate to `/duplicates` etc — all routes work (React Router handles them client-side).

- [ ] **Step 6: Commit**

```bash
git add web/
git commit -m "feat(web): production build — NestJS serves React bundle via ServeStaticModule"
```

---

## Running the app (dev mode)

```bash
# Terminal 1
cd web && npm run start:dev

# Terminal 2
cd web/client && npm run dev
```

Open `http://localhost:5173`. Log in, explore all four modes.

## Running the app (production)

```bash
cd web && NODE_ENV=production npm run build && NODE_ENV=production npm start
```

Open `http://localhost:3000`.
