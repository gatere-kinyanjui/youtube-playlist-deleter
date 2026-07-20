export interface Playlist {
  id: string
  title: string
  description: string    // preserved on rename — required by YouTube API update
  itemCount: number      // from contentDetails.itemCount
  publishedAt: string    // ISO 8601 creation date
}

export interface DuplicateGroup {
  name: string
  playlists: Playlist[]  // sorted: most tracks first, oldest first on tie
  keepIndex: number      // index of the selected keeper in playlists[]
}

export interface PlaylistRename {
  playlist: Playlist
  newTitle: string       // computed: "[SPO] " + playlist.title
  selected: boolean      // whether this rename will be applied
  recommended: boolean   // true if playlist is < 30 days old (app's suggestion)
}

export interface TokenData {
  access_token: string
  refresh_token: string
  expiry_date: number    // ms since epoch
}

export interface Credentials {
  client_id: string
  client_secret: string
}

export type MenuChoice = 'deduplicate' | 'tag' | 'search' | 'delete-recent' | 'exit'
