import { MusicProvider, Playlist } from '../music-provider.interface'

const BASE = 'https://www.googleapis.com/youtube/v3'
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

export class YouTubeApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly reason?: string,
  ) {
    super(message)
    this.name = 'YouTubeApiError'
  }
}

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

      const res = await this.rawFetch(`${BASE}/playlists?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) throw await this.parseError(res)

      const data = await res.json() as { items?: unknown[]; nextPageToken?: string }

      for (const item of data.items ?? []) {
        playlists.push(this.parseItem(item as Parameters<typeof this.parseItem>[0]))
      }

      pageToken = data.nextPageToken
    } while (pageToken)

    return playlists
  }

  async deletePlaylist(accessToken: string, id: string): Promise<void> {
    const params = new URLSearchParams({ id })

    try {
      const res = await this.rawFetch(`${BASE}/playlists?${params}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.status === 204 || res.status === 200 || res.status === 404) return
      throw await this.parseError(res)
    } catch (err) {
      if (err instanceof YouTubeApiError) throw err
      throw new YouTubeApiError(`Network error: ${(err as Error).message}`, 0)
    }
  }

  async renamePlaylist(accessToken: string, id: string, title: string, description: string): Promise<void> {
    try {
      const res = await this.rawFetch(`${BASE}/playlists?part=snippet`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, snippet: { title, description } }),
      })
      if (res.ok) return
      throw await this.parseError(res)
    } catch (err) {
      if (err instanceof YouTubeApiError) throw err
      throw new YouTubeApiError(`Network error: ${(err as Error).message}`, 0)
    }
  }

  private async rawFetch(url: string, options: RequestInit): Promise<Response> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(url, options)
        if (res.ok || res.status < 500) return res
        lastError = await this.parseError(res)
      } catch (err) {
        lastError = err instanceof YouTubeApiError ? err : new YouTubeApiError(`Network error: ${(err as Error).message}`, 0)
      }

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 500
        await new Promise(r => setTimeout(r, delay))
      }
    }

    throw lastError!
  }

  private parseItem(item: {
    id: string
    snippet: { title: string; description: string; publishedAt: string }
    contentDetails: { itemCount?: number }
  }): Playlist {
    return {
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description ?? '',
      itemCount: item.contentDetails.itemCount ?? 0,
      publishedAt: item.snippet.publishedAt,
      provider: 'youtube',
    }
  }

  private async parseError(res: Response): Promise<YouTubeApiError> {
    try {
      const body = await res.json() as { error?: { errors?: { reason?: string }[] } }
      const reason = body.error?.errors?.[0]?.reason
      return new YouTubeApiError(
        `YouTube API error ${res.status}${reason ? ` (${reason})` : ''}`,
        res.status,
        reason,
      )
    } catch {
      return new YouTubeApiError(`YouTube API error ${res.status}`, res.status)
    }
  }
}
