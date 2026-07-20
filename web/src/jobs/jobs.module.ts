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
