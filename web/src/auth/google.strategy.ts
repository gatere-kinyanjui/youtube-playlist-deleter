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
      callbackURL: 'http://localhost:6000/auth/callback',
      scope: ['https://www.googleapis.com/auth/youtube'],
      accessType: 'offline',
      prompt: 'consent',
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
