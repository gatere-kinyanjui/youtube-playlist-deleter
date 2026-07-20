import { Module } from '@nestjs/common'
import { YoutubeProvider } from './youtube.provider'
import { MUSIC_PROVIDER } from '../music-provider.interface'

@Module({
  providers: [{ provide: MUSIC_PROVIDER, useClass: YoutubeProvider }],
  exports: [{ provide: MUSIC_PROVIDER, useClass: YoutubeProvider }],
})
export class YoutubeModule {}
