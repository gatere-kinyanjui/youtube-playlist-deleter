import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Request, Response } from 'express'
import { encryptRefreshToken } from './refresh-cookie'

@Controller('auth')
export class AuthController {
  @Get('login')
  @UseGuards(AuthGuard('google'))
  login(): void {}

  @Get('callback')
  @UseGuards(AuthGuard('google'))
  callback(@Req() req: Request, @Res() res: Response): void {
    const { sessionToken, refreshToken } = req.user as { sessionToken: { access_token: string; expiry_date: number }; refreshToken: string }
    req.session.token = sessionToken

    const encrypted = encryptRefreshToken(refreshToken, process.env.SESSION_SECRET!)
    const isProd = process.env.NODE_ENV === 'production'
    res.cookie('yt_refresh', encrypted, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })

    res.redirect(process.env.FRONTEND_URL ?? '/')
  }

  @Get('logout')
  logout(@Req() req: Request, @Res() res: Response): void {
    res.clearCookie('yt_refresh')
    req.session.destroy(() => res.json({ ok: true }))
  }
}
