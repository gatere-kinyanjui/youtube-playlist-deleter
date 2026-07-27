import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
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
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    ...(isProd
      ? [ServeStaticModule.forRoot({ rootPath: join(__dirname, '..', 'client', 'dist'), exclude: ['/api*', '/auth*'] })]
      : []),
    ProvidersModule,
    AuthModule,
    PlaylistsModule,
    JobsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
