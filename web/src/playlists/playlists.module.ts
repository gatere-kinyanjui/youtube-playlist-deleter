import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ProvidersModule } from '../providers/providers.module'
import { SessionAuthGuard } from '../common/session-auth.guard'
import { PlaylistsController } from './playlists.controller'
import { PlaylistsService } from './playlists.service'

@Module({
  imports: [ProvidersModule, AuthModule],
  controllers: [PlaylistsController],
  providers: [PlaylistsService, SessionAuthGuard],
})
export class PlaylistsModule {}
