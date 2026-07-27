export interface Playlist {
  id: string
  title: string
  description: string
  itemCount: number
  publishedAt: string
  provider: string
}

export interface DuplicateGroup {
  name: string
  playlists: Playlist[]
  keepIndex: number
}

export interface MusicProvider {
  readonly name: string
  listPlaylists(accessToken: string): Promise<Playlist[]>
  deletePlaylist(accessToken: string, id: string): Promise<void>
  renamePlaylist(accessToken: string, id: string, title: string, description: string): Promise<void>
}

export const MUSIC_PROVIDER = Symbol('MUSIC_PROVIDER')
