import { Inject, Injectable } from '@nestjs/common'
import { DuplicateGroup, MusicProvider, MUSIC_PROVIDER, Playlist } from '../providers/music-provider.interface'
import { TokenData } from '../auth/token-data.interface'

const SPO_PREFIX = '[SPO] '

interface ListFilters {
  search?: string
  days?: number
}

@Injectable()
export class PlaylistsService {
  constructor(@Inject(MUSIC_PROVIDER) private readonly provider: MusicProvider) {}

  async listPlaylists(token: TokenData, filters: ListFilters = {}): Promise<Playlist[]> {
    const playlists = await this.provider.listPlaylists(token.access_token)
    let result = playlists

    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(p => p.title.toLowerCase().includes(q))
    }
    if (filters.days) {
      const cutoff = Date.now() - filters.days * 86_400_000
      result = result.filter(p => new Date(p.publishedAt).getTime() > cutoff)
    }
    return result
  }

  async findDuplicates(token: TokenData): Promise<DuplicateGroup[]> {
    const playlists = await this.provider.listPlaylists(token.access_token)
    const byName = new Map<string, Playlist[]>()
    for (const p of playlists) {
      const group = byName.get(p.title) ?? []
      group.push(p)
      byName.set(p.title, group)
    }
    const groups: DuplicateGroup[] = []
    for (const [name, members] of byName) {
      if (members.length < 2) continue
      const sorted = [...members].sort((a, b) =>
        b.itemCount !== a.itemCount
          ? b.itemCount - a.itemCount
          : a.publishedAt.localeCompare(b.publishedAt),
      )
      groups.push({ name, playlists: sorted, keepIndex: 0 })
    }
    return groups
  }

  async tagCandidates(token: TokenData): Promise<Playlist[]> {
    const playlists = await this.provider.listPlaylists(token.access_token)
    return playlists.filter(p => !p.title.startsWith(SPO_PREFIX))
  }
}
