import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Request } from 'express'
import { getEncryptedRefreshToken } from '../auth/refresh-cookie'

@Injectable()
export class SessionAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>()
    if (!req.session?.token) {
      throw new UnauthorizedException('Not authenticated')
    }
    if (!getEncryptedRefreshToken(req.headers.cookie)) {
      throw new UnauthorizedException('Session expired — sign in again')
    }
    return true
  }
}
