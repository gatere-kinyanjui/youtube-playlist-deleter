export interface Playlist {
  id: string
  title: string
  description: string
  itemCount: number
  publishedAt: string          // ISO 8601
  provider: 'youtube' | 'spotify' | 'apple'
}

export interface DuplicateGroup {
  name: string
  playlists: Playlist[]        // most tracks first, then oldest on tie
  keepIndex: number
}

export interface MusicProvider {
  readonly name: string
  listPlaylists(accessToken: string): Promise<Playlist[]>
  deletePlaylist(accessToken: string, id: string): Promise<void>
  renamePlaylist(accessToken: string, id: string, title: string, description: string): Promise<void>
}

export const MUSIC_PROVIDER = Symbol('MUSIC_PROVIDER')
