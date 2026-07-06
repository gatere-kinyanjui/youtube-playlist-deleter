import { ensureAuth, refreshToken } from './auth'
import { listAllPlaylists, deletePlaylist, renamePlaylist } from './api'
import { findDuplicates } from './dedup'
import {
  showMainMenu,
  reviewGroups,
  reviewRenames,
  searchAndSelect,
  confirmDeletion,
  confirmRenames,
  showProgress,
  showSummary,
} from './tui'
import { Playlist, PlaylistRename } from './types'

const SPO_PREFIX = '[SPO] '
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function withTokenRefresh<T>(
  token: string,
  fn: (t: string) => Promise<T>
): Promise<{ result: T; token: string }> {
  try {
    return { result: await fn(token), token }
  } catch (err: unknown) {
    const e = err as { status?: number }
    if (e.status === 401) {
      process.stderr.write('\nAccess token expired. Refreshing...\n')
      const newToken = await refreshToken()
      return { result: await fn(newToken), token: newToken }
    }
    throw err
  }
}

function isQuotaError(err: unknown): boolean {
  const e = err as { status?: number; reason?: string }
  return e.status === 403 && e.reason === 'quotaExceeded'
}

// ─── Delete flow (shared by deduplicate and search modes) ────────────────────

async function runDeletions(
  token: string,
  toDelete: Playlist[]
): Promise<{ deleted: number; deletedIds: Set<string>; token: string }> {
  let deletedCount = 0
  const deletedIds = new Set<string>()

  for (const playlist of toDelete) {
    try {
      const { token: t } = await withTokenRefresh(token, t => deletePlaylist(t, playlist.id))
      token = t
      deletedCount++
      deletedIds.add(playlist.id)
      showProgress(deletedCount, toDelete.length, 'Deleting')
    } catch (err: unknown) {
      if (isQuotaError(err)) {
        process.stderr.write(`\n\nAPI quota exceeded. Deleted ${deletedCount}/${toDelete.length} playlists today.\n`)
        process.stderr.write('Re-run tomorrow — already-deleted playlists are gone for good.\n\n')
        break
      }
      process.stderr.write(`\nError deleting "${playlist.title}": ${(err as Error).message}\n`)
    }
  }

  return { deleted: deletedCount, deletedIds, token }
}

// ─── Mode: deduplicate ────────────────────────────────────────────────────────

async function runDeduplicate(token: string, playlists: Playlist[]): Promise<void> {
  const groups = findDuplicates(playlists)

  if (groups.length === 0) {
    console.log('\n  No duplicate playlists found.\n')
    return
  }

  console.log(`\n  Found ${groups.length} duplicate group${groups.length !== 1 ? 's' : ''}.\n`)

  const reviewed = await reviewGroups(groups)
  const toDelete = reviewed.flatMap(g => g.playlists.filter((_, i) => i !== g.keepIndex))

  if (toDelete.length === 0) {
    console.log('\n  No playlists marked for deletion.\n')
    return
  }

  const confirmed = await confirmDeletion(toDelete)
  if (!confirmed) { console.log('\n  Cancelled.\n'); return }

  console.log()
  const { deleted, deletedIds } = await runDeletions(token, toDelete)

  const cleanedGroups = reviewed.filter(g =>
    g.playlists.every((p, i) => i === g.keepIndex || deletedIds.has(p.id))
  ).length

  showSummary(deleted, `playlist${deleted !== 1 ? 's' : ''} deleted across ${cleanedGroups} group${cleanedGroups !== 1 ? 's' : ''}`)
}

// ─── Mode: tag with [SPO] ────────────────────────────────────────────────────

async function runTag(token: string, playlists: Playlist[]): Promise<void> {
  const now = Date.now()
  const untagged = playlists.filter(p => !p.title.startsWith(SPO_PREFIX))

  if (untagged.length === 0) {
    console.log('\n  All playlists already have the [SPO] prefix.\n')
    return
  }

  const renames: PlaylistRename[] = untagged.map(p => ({
    playlist: p,
    newTitle: SPO_PREFIX + p.title,
    recommended: now - new Date(p.publishedAt).getTime() < THIRTY_DAYS_MS,
    selected: now - new Date(p.publishedAt).getTime() < THIRTY_DAYS_MS,
  }))

  const reviewed = await reviewRenames(renames)
  const toRename = reviewed.filter(r => r.selected)

  if (toRename.length === 0) {
    console.log('\n  No playlists selected for renaming.\n')
    return
  }

  const confirmed = await confirmRenames(reviewed)
  if (!confirmed) { console.log('\n  Cancelled.\n'); return }

  console.log()
  let renamedCount = 0
  for (const r of toRename) {
    try {
      await withTokenRefresh(token, t => renamePlaylist(t, r.playlist.id, r.newTitle, r.playlist.description))
      renamedCount++
      showProgress(renamedCount, toRename.length, 'Renaming')
    } catch (err: unknown) {
      if (isQuotaError(err)) {
        process.stderr.write(`\n\nAPI quota exceeded. Renamed ${renamedCount}/${toRename.length} playlists today.\n`)
        process.stderr.write('Re-run tomorrow to continue.\n\n')
        break
      }
      process.stderr.write(`\nError renaming "${r.playlist.title}": ${(err as Error).message}\n`)
    }
  }

  showSummary(renamedCount, `playlist${renamedCount !== 1 ? 's' : ''} tagged with ${SPO_PREFIX}`)
}

// ─── Mode: search and delete ─────────────────────────────────────────────────

async function runSearch(token: string, playlists: Playlist[]): Promise<void> {
  const selected = await searchAndSelect(playlists)
  if (selected.length === 0) return

  const confirmed = await confirmDeletion(selected)
  if (!confirmed) { console.log('\n  Cancelled.\n'); return }

  console.log()
  const { deleted } = await runDeletions(token, selected)
  showSummary(deleted, `playlist${deleted !== 1 ? 's' : ''} deleted`)
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  let token = await ensureAuth()
  let playlists = await listAllPlaylists(token)

  while (true) {
    const choice = await showMainMenu()
    if (choice === 'exit') break

    try {
      if (choice === 'deduplicate') await runDeduplicate(token, playlists)
      if (choice === 'tag')         await runTag(token, playlists)
      if (choice === 'search')      await runSearch(token, playlists)
    } catch (err: unknown) {
      process.stderr.write(`\nError: ${(err as Error).message}\n`)
    }

    // Refresh the playlist list after any mutation so next mode sees current state
    try {
      const { result, token: t } = await withTokenRefresh(token, t => listAllPlaylists(t))
      playlists = result
      token = t
    } catch {
      // Non-fatal — user can re-run if the list is stale
    }
  }

  console.log('\n  Goodbye!\n')
}

run().catch(err => {
  process.stderr.write(`\nFatal: ${(err as Error).message}\n`)
  process.exit(1)
})
