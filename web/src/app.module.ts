import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ProvidersModule } from './providers/providers.module'
import { PlaylistsModule } from './playlists/playlists.module'
import { AuthModule } from './auth/auth.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ProvidersModule,
    AuthModule,
    PlaylistsModule,
  ],
})
export class AppModule {}
