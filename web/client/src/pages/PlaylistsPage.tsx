import { useCallback, useEffect, useState } from 'react'
import { api, Playlist } from '../api'
import { BulkActionBar } from '../components/BulkActionBar'
import { FilterBar } from '../components/FilterBar'
import { PlaylistCard } from '../components/PlaylistCard'
import { ProgressDrawer } from '../components/ProgressDrawer'
import { Spinner } from '../components/Spinner'
import { useToast } from '../components/Toast'

export function PlaylistsPage() {
  const [all, setAll] = useState<Playlist[]>([])
  const [selected, setSelected] = useState(new Set<string>())
  const [removing, setRemoving] = useState(new Set<string>())
  const [jobId, setJobId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const { addToast } = useToast()

  const load = useCallback(async (params?: { search?: string; days?: number }) => {
    setLoading(true)
    setLoadError(null)
    try {
      const playlists = await api.playlists.list(params)
      setAll(playlists)
      setSelected(new Set())
    } catch (err: unknown) {
      setLoadError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function deleteSelected() {
    const ids = [...selected]
    setSelected(new Set())
    setDeleteError(null)
    try {
      const { jobId: jid } = await api.jobs.start(ids)
      setJobId(jid)
    } catch {
      setDeleteError('Failed to start delete job — check the server.')
      setSelected(new Set(ids))
    }
  }

  const onDone = useCallback((status: { done: number; total: number; failed?: number; deletedIds?: string[]; error?: string; quotaExceeded?: boolean }) => {
    if (status.deletedIds?.length) {
      setRemoving(new Set(status.deletedIds))
      setTimeout(() => {
        setRemoving(new Set())
        setJobId(null)
        load()
      }, 400)
      if (!status.error) {
        addToast('success', `Deleted ${status.done} playlist${status.done !== 1 ? 's' : ''}`)
      } else if (status.quotaExceeded) {
        addToast('warning', `Quota exceeded — ${status.done}/${status.total} deleted`)
      } else {
        addToast('error', status.error)
      }
    } else {
      setJobId(null)
      load()
      if (status.error) addToast('error', status.error)
    }
  }, [load, addToast])

  return (
    <>
      <div className="page">
        <h1 className="page-title">All Playlists</h1>
        <FilterBar onFilter={load} />
        {loading && <Spinner label="Loading playlists…" />}
        {loadError && <p className="msg-error">{loadError}</p>}
        {deleteError && <p className="msg-error">{deleteError}</p>}
        {!loading && all.length > 0 && (
          <div className="card" style={{padding:0, overflow:'hidden'}}>
            {all.map(p => (
              <PlaylistCard
                key={p.id}
                playlist={p}
                selected={selected.has(p.id)}
                removing={removing.has(p.id)}
                onToggle={() => toggle(p.id)}
              />
            ))}
          </div>
        )}
        {!loading && all.length === 0 && (
          <div className="card" style={{padding:32,textAlign:'center',color:'#999'}}>
            <p style={{fontWeight:700,fontSize:18,marginBottom:4}}>No playlists found</p>
            <p style={{fontSize:13}}>Try adjusting your search or time filter.</p>
          </div>
        )}
      </div>
      <BulkActionBar
        count={selected.size}
        total={all.length}
        onDelete={deleteSelected}
        onSelectAll={() => setSelected(new Set(all.map(p => p.id)))}
        onClear={() => setSelected(new Set())}
        onSelectN={n => setSelected(new Set(all.slice(0, n).map(p => p.id)))}
      />
      <ProgressDrawer jobId={jobId} onDone={onDone} />
    </>
  )
}
