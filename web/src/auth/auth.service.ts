import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SessionToken } from './session-token.interface'
import { decryptRefreshToken } from './refresh-cookie'

@Injectable()
export class AuthService {
  constructor(private readonly config: ConfigService) {}

  async getValidAccessToken(token: SessionToken, encryptedRefreshToken: string | null): Promise<string> {
    if (Date.now() < token.expiry_date - 60_000) {
      return token.access_token
    }
    if (!encryptedRefreshToken) {
      throw new Error('No refresh token available — sign out and back in.')
    }

    const refreshToken = decryptRefreshToken(encryptedRefreshToken, this.config.getOrThrow('SESSION_SECRET'))

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.getOrThrow('GOOGLE_CLIENT_ID'),
        client_secret: this.config.getOrThrow('GOOGLE_CLIENT_SECRET'),
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    if (!res.ok) {
      throw new Error(`Token refresh failed: ${res.status}`)
    }
    const data = await res.json() as { access_token: string; expires_in: number }
    token.access_token = data.access_token
    token.expiry_date = Date.now() + data.expires_in * 1000
    return token.access_token
  }
}
