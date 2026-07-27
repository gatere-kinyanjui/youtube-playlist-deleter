import { Playlist, DuplicateGroup } from '@yt/shared'
export { Playlist, DuplicateGroup }

export interface PlaylistRename {
  playlist: Playlist
  newTitle: string
  selected: boolean
  recommended: boolean
}

export type MenuChoice = 'deduplicate' | 'tag' | 'search' | 'delete-recent' | 'exit'
