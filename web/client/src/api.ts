export interface Playlist {
  id: string; title: string; description: string
  itemCount: number; publishedAt: string; provider: string
}

export interface DuplicateGroup {
  name: string; playlists: Playlist[]; keepIndex: number
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const mergedInit: RequestInit = { credentials: 'include', ...init }
  if (mergedInit.method && !['GET', 'HEAD', 'OPTIONS'].includes(mergedInit.method)) {
    mergedInit.headers = {
      'X-Requested-By': 'yt-manager',
      ...(init?.headers as Record<string, string> ?? {}),
    }
  }
  const res = await fetch(path, mergedInit)
  if (res.status === 401) { window.location.href = '/login'; throw new Error('unauthenticated') }
  if (!res.ok) {
    let message = `API error ${res.status}`
    try {
      const body = await res.json() as { message?: string }
      if (body.message) message = body.message
    } catch { /* ignore parse errors */ }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  playlists: {
    list: (params?: { search?: string; days?: number }) => {
      const q = new URLSearchParams()
      if (params?.search) q.set('search', params.search)
      if (params?.days)   q.set('days',   String(params.days))
      return apiFetch<Playlist[]>(`/api/playlists?${q}`)
    },
    duplicates: () => apiFetch<DuplicateGroup[]>('/api/playlists/duplicates'),
    tagCandidates: () => apiFetch<Playlist[]>('/api/playlists/tag-candidates'),
    rename: (id: string, title: string, description: string) =>
      apiFetch<void>(`/api/playlists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      }),
  },
  jobs: {
    start: (ids: string[]) =>
      apiFetch<{ jobId: string }>('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      }),
  },
}
