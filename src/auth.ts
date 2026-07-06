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
  fs.writeFileSync(TOKENS_PATH, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 })
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
