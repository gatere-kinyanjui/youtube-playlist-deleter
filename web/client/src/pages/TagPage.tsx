import { useCallback, useEffect, useState } from 'react'
import { api, Playlist } from '../api'
import { PlaylistCard } from '../components/PlaylistCard'

const SPO = '[SPO] '
const THIRTY_DAYS = 30 * 86_400_000

// Rename-specific bulk bar (no delete semantics needed here)
const RenameBulkBar = ({ count, onRename, onClear }: { count: number; onRename: () => void; onClear: () => void }) => (
  <div className={`bulk-bar ${count > 0 ? 'visible' : ''}`}>
    <span>{count} selected</span>
    <button className="btn btn-secondary" onClick={onRename}>Add [SPO] to {count}</button>
    <button className="btn btn-ghost" style={{color:'#aaa'}} onClick={onClear}>Clear</button>
  </div>
)

export function TagPage() {
  const [candidates, setCandidates] = useState<Playlist[]>([])
  const [selected, setSelected] = useState(new Set<string>())
  const [loading, setLoading] = useState(true)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const list = await api.playlists.tagCandidates()
    setCandidates(list)
    // Pre-select playlists < 30 days old (matching CLI recommendation logic)
    const now = Date.now()
    setSelected(new Set(list.filter(p => now - new Date(p.publishedAt).getTime() < THIRTY_DAYS).map(p => p.id)))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function toggle(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  async function renameSelected() {
    const toRename = candidates.filter(p => selected.has(p.id))
    setRenaming(true)
    setRenameError(null)
    let renamed = 0
    try {
      for (const p of toRename) {
        await api.playlists.rename(p.id, SPO + p.title, p.description)
        renamed++
      }
    } catch (err: unknown) {
      setRenameError(`Tagged ${renamed}/${toRename.length} — ${(err as Error).message}`)
    } finally {
      setRenaming(false)
      load()
    }
  }

  const now = Date.now()

  return (
    <>
      <div className="page">
        <h1 className="page-title">Tag with [SPO]</h1>
        <p style={{marginBottom:16,color:'#555',fontWeight:600}}>
          Playlists younger than 30 days are pre-selected <span className="tag-recommended">★ new</span>
        </p>
        {loading && <p style={{fontWeight:600}}>Loading…</p>}
        {renaming && <p style={{fontWeight:600}}>Tagging…</p>}
        {renameError && <p style={{color:'var(--pink)',fontWeight:700}}>{renameError}</p>}
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          {candidates.map(p => {
            const isNew = now - new Date(p.publishedAt).getTime() < THIRTY_DAYS
            return (
              <div key={p.id} style={{position:'relative'}}>
                <PlaylistCard playlist={p} selected={selected.has(p.id)} onToggle={() => toggle(p.id)} />
                {isNew && <span className="tag-recommended" style={{position:'absolute',top:14,right:16}}>★ new</span>}
              </div>
            )
          })}
        </div>
      </div>
      <RenameBulkBar count={selected.size} onRename={renameSelected} onClear={() => setSelected(new Set())} />
    </>
  )
}
