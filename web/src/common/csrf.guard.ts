import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Request } from 'express'

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>()
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true
    return req.headers['x-requested-by'] === 'yt-manager'
  }
}
