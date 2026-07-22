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
      callbackURL: config.get('OAUTH_CALLBACK_URL') ?? 'http://localhost:3001/auth/callback',
      scope: ['https://www.googleapis.com/auth/youtube'],
      passReqToCallback: true,
    })
  }

  override authorizationParams(): Record<string, string> {
    return { access_type: 'offline', prompt: 'consent' }
  }

  // We only need tokens, not the user profile — skip the UserInfo API call
  // (the default implementation calls UserInfo which requires profile/openid scope)
  override userProfile(_accessToken: string, done: (err: Error | null, profile?: object) => void): void {
    done(null, {})
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
