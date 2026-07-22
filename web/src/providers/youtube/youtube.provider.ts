import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { MusicProvider, Playlist } from '../music-provider.interface'

const BASE = 'https://www.googleapis.com/youtube/v3'
const CACHE_TTL = 5 * 60 * 1000

function youtubeError(status: number, reason: string | undefined): HttpException {
  if (reason === 'quotaExceeded') {
    return new HttpException(
      'YouTube API quota exceeded — resets at midnight Pacific Time.',
      HttpStatus.TOO_MANY_REQUESTS,
    )
  }
  if (status === 401 || status === 403) {
    return new HttpException('YouTube access denied — try signing out and back in.', HttpStatus.UNAUTHORIZED)
  }
  return new HttpException(`YouTube API error ${status} (${reason ?? 'unknown'})`, HttpStatus.BAD_GATEWAY)
}

@Injectable()
export class YoutubeProvider implements MusicProvider {
  readonly name = 'youtube'
  private readonly cache = new Map<string, { playlists: Playlist[]; expiresAt: number }>()

  async listPlaylists(accessToken: string): Promise<Playlist[]> {
    const cached = this.cache.get(accessToken)
    if (cached && cached.expiresAt > Date.now()) return cached.playlists

    const playlists: Playlist[] = []
    let pageToken: string | undefined

    do {
      const params = new URLSearchParams({
        part: 'snippet,contentDetails',
        mine: 'true',
        maxResults: '50',
        ...(pageToken ? { pageToken } : {}),
      })
      const res = await fetch(`${BASE}/playlists?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) {
        const body = await res.json() as { error?: { errors?: { reason?: string }[] } }
        throw youtubeError(res.status, body.error?.errors?.[0]?.reason)
      }
      const data = await res.json() as {
        items?: {
          id: string
          snippet: { title: string; description: string; publishedAt: string }
          contentDetails: { itemCount?: number }
        }[]
        nextPageToken?: string
      }
      for (const item of data.items ?? []) {
        playlists.push({
          id: item.id,
          title: item.snippet.title,
          description: item.snippet.description ?? '',
          itemCount: item.contentDetails.itemCount ?? 0,
          publishedAt: item.snippet.publishedAt,
          provider: 'youtube',
        })
      }
      pageToken = data.nextPageToken
    } while (pageToken)

    this.cache.set(accessToken, { playlists, expiresAt: Date.now() + CACHE_TTL })
    // Evict expired entries so the cache doesn't grow with every token rotation
    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) this.cache.delete(key)
    }
    return playlists
  }

  async deletePlaylist(accessToken: string, id: string): Promise<void> {
    const res = await fetch(`${BASE}/playlists?${new URLSearchParams({ id })}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (res.status === 204 || res.status === 200 || res.status === 404) { this.cache.delete(accessToken); return }
    const body = await res.json() as { error?: { errors?: { reason?: string }[] } }
    throw youtubeError(res.status, body.error?.errors?.[0]?.reason)
  }

  async renamePlaylist(accessToken: string, id: string, title: string, description: string): Promise<void> {
    const res = await fetch(`${BASE}/playlists?part=snippet`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, snippet: { title, description } }),
    })
    if (res.ok) { this.cache.delete(accessToken); return }
    const body = await res.json() as { error?: { errors?: { reason?: string }[] } }
    throw youtubeError(res.status, body.error?.errors?.[0]?.reason)
  }
}
