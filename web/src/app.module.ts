import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { JobsModule } from './jobs/jobs.module'
import { PlaylistsModule } from './playlists/playlists.module'
import { ProvidersModule } from './providers/providers.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ProvidersModule,
    AuthModule,
    PlaylistsModule,
    JobsModule,
  ],
})
export class AppModule {}
