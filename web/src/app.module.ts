import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ProvidersModule } from './providers/providers.module'
import { PlaylistsModule } from './playlists/playlists.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ProvidersModule,
    PlaylistsModule,
  ],
})
export class AppModule {}
