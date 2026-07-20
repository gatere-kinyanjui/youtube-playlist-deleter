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
    res.redirect('/')
  }

  @Get('logout')
  logout(@Req() req: Request, @Res() res: Response): void {
    req.session.destroy(() => res.redirect('/'))
  }
}
