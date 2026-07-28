import { Injectable } from '@nestjs/common'
import { HttpException, HttpStatus } from '@nestjs/common'
import { YoutubeProvider as BaseYoutubeProvider, YouTubeApiError, Playlist } from '@yt/shared'

@Injectable()
export class YoutubeProvider extends BaseYoutubeProvider {
  private cache: { playlists: Playlist[]; expiresAt: number } | null = null

  async listPlaylists(accessToken: string): Promise<Playlist[]> {
    if (this.cache && this.cache.expiresAt > Date.now()) return this.cache.playlists
    try {
      const playlists = await super.listPlaylists(accessToken)
      this.cache = { playlists, expiresAt: Date.now() + 5 * 60 * 1000 }
      return playlists
    } catch (err) {
      throw this.toHttpException(err)
    }
  }

  async deletePlaylist(accessToken: string, id: string): Promise<void> {
    this.cache = null
    try {
      return await super.deletePlaylist(accessToken, id)
    } catch (err) {
      throw this.toHttpException(err)
    }
  }

  async renamePlaylist(accessToken: string, id: string, title: string, description: string): Promise<void> {
    this.cache = null
    try {
      return await super.renamePlaylist(accessToken, id, title, description)
    } catch (err) {
      throw this.toHttpException(err)
    }
  }

  private toHttpException(err: unknown): HttpException {
    if (err instanceof YouTubeApiError) {
      if (err.reason === 'quotaExceeded') {
        return new HttpException(
          'YouTube API quota exceeded — resets at midnight Pacific Time.',
          HttpStatus.TOO_MANY_REQUESTS,
        )
      }
      if (err.status === 401 || err.status === 403) {
        return new HttpException('YouTube access denied — try signing out and back in.', HttpStatus.UNAUTHORIZED)
      }
      return new HttpException(`YouTube API error ${err.status} (${err.reason ?? 'unknown'})`, HttpStatus.BAD_GATEWAY)
    }
    return new HttpException('Unexpected YouTube API error', HttpStatus.INTERNAL_SERVER_ERROR)
  }
}
