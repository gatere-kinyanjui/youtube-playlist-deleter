import { useCallback, useEffect, useState } from 'react'
import { api, Playlist } from '../api'
import { PlaylistCard } from '../components/PlaylistCard'
import { Spinner } from '../components/Spinner'

const SPO = '[SPO] '
const THIRTY_DAYS = 30 * 86_400_000

const RenameBulkBar = ({ count, total, onRename, onSelectAll, onClear, renaming }: {
  count: number; total: number; onRename: () => void
  onSelectAll: () => void; onClear: () => void; renaming: boolean
}) => {
  const allSelected = count === total && total > 0
  return (
    <div className={`bulk-bar ${count > 0 ? 'visible' : ''}`}>
      <span>{count} selected</span>
      <button className="btn btn-secondary" onClick={onRename} disabled={renaming}>
        {renaming ? 'Tagging…' : `Add [SPO] to ${count}`}
      </button>
      <button className="btn btn-ghost" style={{color:'#aaa'}} onClick={allSelected ? onClear : onSelectAll}>
        {allSelected ? 'Deselect all' : `Select all ${total}`}
      </button>
      <button className="btn btn-ghost" style={{color:'#aaa'}} onClick={onClear}>Clear</button>
    </div>
  )
}

export function TagPage() {
  const [candidates, setCandidates] = useState<Playlist[]>([])
  const [selected, setSelected] = useState(new Set<string>())
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [renameError, setRenameError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const list = await api.playlists.tagCandidates()
      setCandidates(list)
      const now = Date.now()
      setSelected(new Set(list.filter(p => now - new Date(p.publishedAt).getTime() < THIRTY_DAYS).map(p => p.id)))
    } catch (err: unknown) {
      setLoadError((err as Error).message)
    } finally {
      setLoading(false)
    }
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
        {loading && <Spinner label="Finding candidates…" />}
        {loadError && <p className="msg-error">{loadError}</p>}
        {renameError && <p className="msg-error">{renameError}</p>}
        {!loading && candidates.length > 0 && (
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
        )}
        {!loading && candidates.length === 0 && (
          <div className="card" style={{padding:32,textAlign:'center',color:'#999'}}>
            <p style={{fontWeight:700,fontSize:18,marginBottom:4}}>No candidates found</p>
            <p style={{fontSize:13}}>All playlists already have [SPO] or none need it.</p>
          </div>
        )}
      </div>
      <RenameBulkBar
        count={selected.size}
        total={candidates.length}
        onRename={renameSelected}
        onSelectAll={() => setSelected(new Set(candidates.map(p => p.id)))}
        onClear={() => setSelected(new Set())}
        renaming={renaming}
      />
    </>
  )
}
