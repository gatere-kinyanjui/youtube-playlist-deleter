import * as crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const COOKIE_NAME = 'yt_refresh'

function deriveKey(secret: string): Buffer {
  return crypto.scryptSync(secret, 'yt-refresh-salt', KEY_LENGTH)
}

export function encryptRefreshToken(token: string, secret: string): string {
  const key = deriveKey(secret)
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(token, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag().toString('hex')
  return iv.toString('hex') + ':' + tag + ':' + encrypted
}

export function decryptRefreshToken(encrypted: string, secret: string): string {
  const key = deriveKey(secret)
  const parts = encrypted.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const tag = Buffer.from(parts[1], 'hex')
  const data = parts.slice(2).join(':')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8')
}

export function getEncryptedRefreshToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const key = part.slice(0, eq).trim()
    if (key === COOKIE_NAME) return part.slice(eq + 1).trim()
  }
  return null
}
