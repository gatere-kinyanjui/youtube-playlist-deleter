import { Module } from '@nestjs/common'
import { ProvidersModule } from '../providers/providers.module'
import { PlaylistsController } from './playlists.controller'
import { PlaylistsService } from './playlists.service'

@Module({
  imports: [ProvidersModule],      // gives us MUSIC_PROVIDER
  controllers: [PlaylistsController],
  providers: [PlaylistsService],
})
export class PlaylistsModule {}
