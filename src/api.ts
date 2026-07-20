import { Playlist } from './types'

const BASE = 'https://www.googleapis.com/youtube/v3'

interface ApiError {
  status: number
  reason?: string
  message: string
}

function makeApiError(status: number, reason: string | undefined, message: string): ApiError {
  return { status, reason, message }
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options)
    } catch (err) {
      if (attempt === retries) throw err
      await new Promise(r => setTimeout(r, 2000))
    }
  }
  throw new Error('unreachable')
}

async function parseErrorResponse(res: Response): Promise<ApiError> {
  try {
    const body = await res.json() as { error?: { errors?: { reason?: string }[] } }
    const reason = body.error?.errors?.[0]?.reason
    return makeApiError(res.status, reason, `API error ${res.status} (${reason ?? 'unknown'})`)
  } catch {
    return makeApiError(res.status, undefined, `API error ${res.status}`)
  }
}

function throwIfQuotaOrAuth(err: ApiError): never {
  const meta = { status: err.status, reason: err.reason }
  if (err.status === 401) throw Object.assign(new Error('Unauthorized'), meta)
  if (err.status === 403 && err.reason === 'quotaExceeded') {
    throw Object.assign(
      new Error('YouTube API quota exceeded for today.\nQuota resets at midnight Pacific Time.\nCheck usage: console.cloud.google.com → APIs & Services → YouTube Data API v3 → Quotas'),
      meta,
    )
  }
  throw Object.assign(new Error(err.message), meta)
}

export function parsePlaylistItem(item: {
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
  }
}

export async function listAllPlaylists(token: string): Promise<Playlist[]> {
  const playlists: Playlist[] = []
  let pageToken: string | undefined

  process.stdout.write('Fetching playlists')

  do {
    const params = new URLSearchParams({
      part: 'snippet,contentDetails',
      mine: 'true',
      maxResults: '50',
      ...(pageToken ? { pageToken } : {}),
    })

    const res = await fetchWithRetry(`${BASE}/playlists?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) throwIfQuotaOrAuth(await parseErrorResponse(res))

    const data = await res.json() as { items?: unknown[]; nextPageToken?: string }
    for (const item of data.items ?? []) {
      playlists.push(parsePlaylistItem(item as Parameters<typeof parsePlaylistItem>[0]))
    }
    pageToken = data.nextPageToken
    process.stdout.write('.')
  } while (pageToken)

  process.stdout.write(` done (${playlists.length} playlists)\n`)
  return playlists
}

export async function deletePlaylist(token: string, playlistId: string): Promise<void> {
  const params = new URLSearchParams({ id: playlistId })
  const res = await fetchWithRetry(`${BASE}/playlists?${params}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (res.status === 204 || res.status === 200 || res.status === 404) return
  throwIfQuotaOrAuth(await parseErrorResponse(res))
}

export async function renamePlaylist(
  token: string,
  playlistId: string,
  newTitle: string,
  description: string
): Promise<void> {
  const res = await fetchWithRetry(`${BASE}/playlists?part=snippet`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: playlistId,
      snippet: { title: newTitle, description },
    }),
  })

  if (res.ok) return
  throwIfQuotaOrAuth(await parseErrorResponse(res))
}
