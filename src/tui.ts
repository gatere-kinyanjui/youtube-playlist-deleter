import * as readline from 'readline'
import { DuplicateGroup, Playlist } from '@yt/shared'
import { PlaylistRename, MenuChoice } from './types'
import { parseTimeRange } from './time'

// ANSI helpers
const bold  = (s: string) => `\x1b[1m${s}\x1b[0m`
const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const red   = (s: string) => `\x1b[31m${s}\x1b[0m`
const dim   = (s: string) => `\x1b[2m${s}\x1b[0m`
const cyan  = (s: string) => `\x1b[36m${s}\x1b[0m`
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve))
}

function makeRl(): readline.Interface {
  return readline.createInterface({ input: process.stdin, output: process.stdout })
}

// ─── Main Menu ──────────────────────────────────────────────────────────────

export async function showMainMenu(): Promise<MenuChoice> {
  const rl = makeRl()
  while (true) {
    console.clear()
    console.log(bold('\n YouTube Playlist Manager\n'))
    console.log(`  ${cyan('1')}  Find and delete duplicate playlists`)
    console.log(`  ${cyan('2')}  Tag Spotify-imported playlists with [SPO] prefix`)
    console.log(`  ${cyan('3')}  Search and delete playlists`)
    console.log(`  ${cyan('4')}  Delete recent playlists`)
    console.log(`  ${cyan('5')}  Exit\n`)
    const input = (await prompt(rl, '> ')).trim()
    if (input === '1') { rl.close(); return 'deduplicate' }
    if (input === '2') { rl.close(); return 'tag' }
    if (input === '3') { rl.close(); return 'search' }
    if (input === '4') { rl.close(); return 'delete-recent' }
    if (input === '5' || input === 'q') { rl.close(); return 'exit' }
  }
}

// ─── Delete Recent mode ──────────────────────────────────────────────────────

export async function promptTimeRange(): Promise<{ ms: number; label: string }> {
  const rl = makeRl()
  while (true) {
    console.clear()
    console.log(bold('\n Delete Recent Playlists\n'))
    const raw = (await prompt(rl, `  Newer than (e.g. 2 weeks, 30 days, 6 hours, 1 month): `)).trim()
    const ms = parseTimeRange(raw)
    if (ms !== null) {
      rl.close()
      return { ms, label: raw.toLowerCase() }
    }
    console.log(dim('\n  Invalid range. Try: 6 hours, 3 days, 2 weeks, 1 month\n'))
    await prompt(rl, dim('  Press Enter to try again...'))
  }
}

function renderRecentPage(
  playlists: Playlist[],
  selected: boolean[],
  page: number,
  pageSize: number,
  label: string,
): void {
  const start = page * pageSize
  const end = Math.min(start + pageSize, playlists.length)
  const totalPages = Math.ceil(playlists.length / pageSize)
  const selectedCount = selected.filter(Boolean).length

  console.clear()
  console.log(bold(`\n Delete playlists newer than ${label}\n`))
  console.log(dim(`  Page ${page + 1}/${totalPages} · ${playlists.length} found · ${selectedCount} selected`))
  console.log(dim('  [number] toggle  [a] select all  [n] next  [p] prev  [d] done\n'))

  for (let i = start; i < end; i++) {
    const p = playlists[i]
    const localIdx = i - start + 1
    const check = selected[i] ? green('[✓]') : dim('[ ]')
    const date = p.publishedAt.slice(0, 10)
    const tracks = `${p.itemCount} track${p.itemCount !== 1 ? 's' : ''}`
    console.log(`  ${check} ${cyan(String(localIdx).padStart(2))}. ${p.title}`)
    console.log(`         ${dim(date)}  ${dim(tracks)}`)
    console.log()
  }
}

export async function reviewRecentDeletions(playlists: Playlist[], label: string): Promise<Playlist[]> {
  const PAGE_SIZE = 10
  const selected = playlists.map(() => true)
  let page = 0
  const totalPages = Math.ceil(playlists.length / PAGE_SIZE)
  const rl = makeRl()

  while (true) {
    renderRecentPage(playlists, selected, page, PAGE_SIZE, label)
    const input = (await prompt(rl, cyan('> '))).trim().toLowerCase()

    if (input === 'd') break
    if (input === 'n' && page < totalPages - 1) { page++; continue }
    if (input === 'p' && page > 0) { page--; continue }
    if (input === 'a') { selected.fill(true); continue }

    const num = parseInt(input, 10)
    const pageCount = Math.min(PAGE_SIZE, playlists.length - page * PAGE_SIZE)
    if (!isNaN(num) && num >= 1 && num <= pageCount) {
      selected[page * PAGE_SIZE + num - 1] = !selected[page * PAGE_SIZE + num - 1]
    }
  }

  rl.close()
  return playlists.filter((_, i) => selected[i])
}

// ─── Deduplicate mode ────────────────────────────────────────────────────────

function renderDedupPage(groups: DuplicateGroup[], page: number, pageSize: number): void {
  const start = page * pageSize
  const end = Math.min(start + pageSize, groups.length)
  const totalPages = Math.ceil(groups.length / pageSize)

  console.clear()
  console.log(bold('\n Duplicate Playlists\n'))
  console.log(dim(`  Page ${page + 1}/${totalPages} · ${groups.length} duplicate groups`))
  console.log(dim('  [number] flip keeper  [n] next page  [p] prev page  [d] done\n'))

  for (let i = start; i < end; i++) {
    const g = groups[i]
    const localIdx = i - start + 1
    console.log(bold(`  ${localIdx}. "${g.name}"`) + dim(` (${g.playlists.length} copies)`))
    for (let j = 0; j < g.playlists.length; j++) {
      const p = g.playlists[j]
      const isKeeper = j === g.keepIndex
      const label = isKeeper ? green('  ✓ KEEP  ') : red('  ✗ DELETE')
      const tracks = `${p.itemCount} track${p.itemCount !== 1 ? 's' : ''}`
      const date = p.publishedAt.slice(0, 10)
      console.log(`     ${label}  ${dim(tracks)}  ${dim(date)}  ${dim('id:' + p.id)}`)
    }
    console.log()
  }
}

export async function reviewGroups(groups: DuplicateGroup[]): Promise<DuplicateGroup[]> {
  const PAGE_SIZE = 10
  const result = groups.map(g => ({ ...g, playlists: [...g.playlists] }))
  let page = 0
  const totalPages = Math.ceil(result.length / PAGE_SIZE)
  const rl = makeRl()

  while (true) {
    renderDedupPage(result, page, PAGE_SIZE)
    const input = (await prompt(rl, cyan('> '))).trim().toLowerCase()

    if (input === 'd') break
    if (input === 'n' && page < totalPages - 1) { page++; continue }
    if (input === 'p' && page > 0) { page--; continue }

    const num = parseInt(input, 10)
    const pageCount = Math.min(PAGE_SIZE, result.length - page * PAGE_SIZE)
    if (!isNaN(num) && num >= 1 && num <= pageCount) {
      const g = result[page * PAGE_SIZE + num - 1]
      g.keepIndex = (g.keepIndex + 1) % g.playlists.length
    }
  }

  rl.close()
  return result
}

// ─── Tag / rename mode ───────────────────────────────────────────────────────

function renderRenamePage(renames: PlaylistRename[], page: number, pageSize: number): void {
  const start = page * pageSize
  const end = Math.min(start + pageSize, renames.length)
  const totalPages = Math.ceil(renames.length / pageSize)
  const selectedCount = renames.filter(r => r.selected).length

  console.clear()
  console.log(bold('\n Tag Spotify Playlists with [SPO]\n'))
  console.log(dim(`  Page ${page + 1}/${totalPages} · ${renames.length} playlists · ${selectedCount} selected`))
  console.log(dim('  [number] toggle  [a] auto-confirm recommendations  [n] next  [p] prev  [d] done\n'))
  console.log(dim('  ' + yellow('★') + ' = recommended (created < 30 days ago)\n'))

  for (let i = start; i < end; i++) {
    const r = renames[i]
    const localIdx = i - start + 1
    const star = r.recommended ? yellow('★') : ' '
    const check = r.selected ? green('[✓]') : dim('[ ]')
    const date = r.playlist.publishedAt.slice(0, 10)
    const tracks = `${r.playlist.itemCount} track${r.playlist.itemCount !== 1 ? 's' : ''}`
    console.log(`  ${check} ${star} ${cyan(String(localIdx).padStart(2))}. ${r.playlist.title}`)
    console.log(`         ${dim('→ ' + r.newTitle)}  ${dim(date)}  ${dim(tracks)}`)
    console.log()
  }
}

export async function reviewRenames(renames: PlaylistRename[]): Promise<PlaylistRename[]> {
  const PAGE_SIZE = 10
  const result = renames.map(r => ({ ...r }))
  let page = 0
  const totalPages = Math.ceil(result.length / PAGE_SIZE)
  const rl = makeRl()

  while (true) {
    renderRenamePage(result, page, PAGE_SIZE)
    const input = (await prompt(rl, cyan('> '))).trim().toLowerCase()

    if (input === 'd') break
    if (input === 'n' && page < totalPages - 1) { page++; continue }
    if (input === 'p' && page > 0) { page--; continue }

    if (input === 'a') {
      // Auto-confirm: select exactly the recommended ones
      for (const r of result) r.selected = r.recommended
      break
    }

    const num = parseInt(input, 10)
    const pageCount = Math.min(PAGE_SIZE, result.length - page * PAGE_SIZE)
    if (!isNaN(num) && num >= 1 && num <= pageCount) {
      const r = result[page * PAGE_SIZE + num - 1]
      r.selected = !r.selected
    }
  }

  rl.close()
  return result
}

// ─── Search and delete mode ──────────────────────────────────────────────────

export async function searchAndSelect(playlists: Playlist[]): Promise<Playlist[]> {
  const rl = makeRl()

  while (true) {
    console.clear()
    console.log(bold('\n Search and Delete Playlists\n'))
    const query = (await prompt(rl, `  Search query (or ${cyan('q')} to go back): `)).trim()

    if (query.toLowerCase() === 'q') { rl.close(); return [] }
    if (!query) continue

    const matches = playlists.filter(p =>
      p.title.toLowerCase().includes(query.toLowerCase())
    )

    if (matches.length === 0) {
      console.log(dim(`\n  No playlists matching "${query}"\n`))
      await prompt(rl, dim('  Press Enter to search again...'))
      continue
    }

    console.clear()
    console.log(bold(`\n Results for "${query}" (${matches.length} found)\n`))
    console.log(dim('  [numbers comma-separated] select  [all] select all  [q] new search\n'))

    for (let i = 0; i < matches.length; i++) {
      const p = matches[i]
      const date = p.publishedAt.slice(0, 10)
      const tracks = `${p.itemCount} track${p.itemCount !== 1 ? 's' : ''}`
      console.log(`  ${cyan(String(i + 1).padStart(3))}. ${p.title}`)
      console.log(`       ${dim(date + '  ' + tracks)}`)
    }
    console.log()

    const sel = (await prompt(rl, cyan('> '))).trim().toLowerCase()

    if (sel === 'q') continue
    if (sel === '') continue

    let selected: Playlist[] = []
    if (sel === 'all') {
      selected = matches
    } else {
      const nums = [...new Set(sel.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= matches.length))]
      selected = nums.map(n => matches[n - 1])
    }

    if (selected.length === 0) continue

    rl.close()
    return selected
  }
}

// ─── Confirmation and progress ───────────────────────────────────────────────

export async function confirmDeletion(toDelete: Playlist[]): Promise<boolean> {
  const rl = makeRl()
  console.log()
  console.log(bold('  About to delete:'))
  for (const p of toDelete) {
    console.log(`    ${red('✗')} ${p.title}  ${dim('(' + p.itemCount + ' tracks)')}`)
  }
  console.log()
  console.log(red(`  ${toDelete.length} playlist${toDelete.length !== 1 ? 's' : ''} will be permanently deleted.`))
  console.log()
  const answer = await prompt(rl, `  Type ${bold('yes')} to confirm, or press Enter to cancel: `)
  rl.close()
  return answer.trim().toLowerCase() === 'yes'
}

export async function confirmRenames(renames: PlaylistRename[]): Promise<boolean> {
  const selected = renames.filter(r => r.selected)
  const rl = makeRl()
  console.log()
  console.log(bold('  About to rename:'))
  for (const r of selected) {
    console.log(`    ${green('→')} ${r.playlist.title}`)
    console.log(`       ${dim(r.newTitle)}`)
  }
  console.log()
  console.log(yellow(`  ${selected.length} playlist${selected.length !== 1 ? 's' : ''} will be renamed.`))
  console.log()
  const answer = await prompt(rl, `  Type ${bold('yes')} to confirm, or press Enter to cancel: `)
  rl.close()
  return answer.trim().toLowerCase() === 'yes'
}

export function showProgress(current: number, total: number, action = 'Processing'): void {
  process.stdout.write(`\r  ${action}... ${current}/${total}`)
  if (current === total) process.stdout.write('\n')
}

export function showSummary(count: number, label: string): void {
  console.log()
  console.log(green(bold('  Done!')) + ` ${count} ${label}.`)
  console.log()
}
