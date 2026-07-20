import { Injectable } from '@nestjs/common'
import { MusicProvider, Playlist } from '../music-provider.interface'

const BASE = 'https://www.googleapis.com/youtube/v3'

@Injectable()
export class YoutubeProvider implements MusicProvider {
  readonly name = 'youtube'

  async listPlaylists(accessToken: string): Promise<Playlist[]> {
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
        const reason = body.error?.errors?.[0]?.reason
        const err = new Error(`YouTube API ${res.status} (${reason ?? 'unknown'})`) as Error & { status: number; reason?: string }
        err.status = res.status
        err.reason = reason
        throw err
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

    return playlists
  }

  async deletePlaylist(accessToken: string, id: string): Promise<void> {
    const res = await fetch(`${BASE}/playlists?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (res.status === 204 || res.status === 200 || res.status === 404) return
    const body = await res.json() as { error?: { errors?: { reason?: string }[] } }
    const reason = body.error?.errors?.[0]?.reason
    const err = new Error(`YouTube API ${res.status} (${reason ?? 'unknown'})`) as Error & { status: number; reason?: string }
    err.status = res.status
    err.reason = reason
    throw err
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
    if (res.ok) return
    const body = await res.json() as { error?: { errors?: { reason?: string }[] } }
    const reason = body.error?.errors?.[0]?.reason
    const err = new Error(`YouTube API ${res.status} (${reason ?? 'unknown'})`) as Error & { status: number; reason?: string }
    err.status = res.status
    err.reason = reason
    throw err
  }
}
