import { Module } from '@nestjs/common'
import { YoutubeProvider } from './youtube.provider'
import { MUSIC_PROVIDER } from '@yt/shared'

@Module({
  providers: [{ provide: MUSIC_PROVIDER, useClass: YoutubeProvider }],
  exports: [MUSIC_PROVIDER],
})
export class YoutubeModule {}
