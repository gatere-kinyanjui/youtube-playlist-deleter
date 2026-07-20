import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'path'
import { AuthModule } from './auth/auth.module'
import { JobsModule } from './jobs/jobs.module'
import { PlaylistsModule } from './playlists/playlists.module'
import { ProvidersModule } from './providers/providers.module'

const isProd = process.env.NODE_ENV === 'production'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ...(isProd
      ? [ServeStaticModule.forRoot({ rootPath: join(__dirname, '..', 'client', 'dist'), exclude: ['/api*', '/auth*'] })]
      : []),
    ProvidersModule,
    AuthModule,
    PlaylistsModule,
    JobsModule,
  ],
})
export class AppModule {}
