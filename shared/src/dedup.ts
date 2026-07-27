import { Playlist, DuplicateGroup } from './providers/music-provider.interface'

export function findDuplicates(playlists: Playlist[]): DuplicateGroup[] {
  const byName = new Map<string, Playlist[]>()
  for (const p of playlists) {
    const group = byName.get(p.title) ?? []
    group.push(p)
    byName.set(p.title, group)
  }

  const groups: DuplicateGroup[] = []
  for (const [name, members] of byName) {
    if (members.length < 2) continue
    const sorted = [...members].sort((a, b) => {
      if (b.itemCount !== a.itemCount) return b.itemCount - a.itemCount
      return a.publishedAt.localeCompare(b.publishedAt)
    })
    groups.push({ name, playlists: sorted, keepIndex: 0 })
  }
  return groups
}
