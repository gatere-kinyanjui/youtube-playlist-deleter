import { Inject, Injectable } from '@nestjs/common'
import { AuthService } from '../auth/auth.service'
import { SessionToken } from '../auth/session-token.interface'
import { DuplicateGroup, MusicProvider, MUSIC_PROVIDER, Playlist } from '@yt/shared'

const SPO_PREFIX = '[SPO] '

interface ListFilters {
  search?: string
  days?: number
}

@Injectable()
export class PlaylistsService {
  constructor(
    @Inject(MUSIC_PROVIDER) private readonly provider: MusicProvider,
    private readonly authService: AuthService,
  ) {}

  async listPlaylists(token: SessionToken, encryptedRefreshToken: string | null, filters: ListFilters = {}): Promise<Playlist[]> {
    const accessToken = await this.authService.getValidAccessToken(token, encryptedRefreshToken)
    const playlists = await this.provider.listPlaylists(accessToken)
    let result = playlists

    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(p => p.title.toLowerCase().includes(q))
    }
    if (filters.days !== undefined) {
      const cutoff = Date.now() - filters.days * 86_400_000
      result = result.filter(p => new Date(p.publishedAt).getTime() > cutoff)
    }
    return result
  }

  async findDuplicates(token: SessionToken, encryptedRefreshToken: string | null): Promise<DuplicateGroup[]> {
    const accessToken = await this.authService.getValidAccessToken(token, encryptedRefreshToken)
    const playlists = await this.provider.listPlaylists(accessToken)
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

  async tagCandidates(token: SessionToken, encryptedRefreshToken: string | null): Promise<Playlist[]> {
    const accessToken = await this.authService.getValidAccessToken(token, encryptedRefreshToken)
    const playlists = await this.provider.listPlaylists(accessToken)
    return playlists.filter(p => !p.title.startsWith(SPO_PREFIX))
  }

  async renameOne(token: SessionToken, encryptedRefreshToken: string | null, id: string, title: string, description: string): Promise<void> {
    const accessToken = await this.authService.getValidAccessToken(token, encryptedRefreshToken)
    await this.provider.renamePlaylist(accessToken, id, title, description)
  }
}
