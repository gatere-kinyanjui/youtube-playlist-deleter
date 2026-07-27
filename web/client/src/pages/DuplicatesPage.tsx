import { useCallback, useEffect, useState } from 'react'
import { api, DuplicateGroup } from '../api'
import { DuplicateGroupCard } from '../components/DuplicateGroup'
import { ProgressDrawer } from '../components/ProgressDrawer'
import { Spinner } from '../components/Spinner'
import { useToast } from '../components/Toast'

export function DuplicatesPage() {
  const [groups, setGroups] = useState<(DuplicateGroup & { keepIndex: number })[]>([])
  const [jobId, setJobId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const { addToast } = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const g = await api.playlists.duplicates()
      setGroups(g.map(x => ({ ...x })))
    } catch (err: unknown) {
      setLoadError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function flipKeep(i: number) {
    setGroups(prev => prev.map((g, idx) =>
      idx === i ? { ...g, keepIndex: (g.keepIndex + 1) % g.playlists.length } : g
    ))
  }

  async function deleteAll() {
    const ids = groups.flatMap(g => g.playlists.filter((_, i) => i !== g.keepIndex).map(p => p.id))
    if (ids.length === 0) return
    setDeleteError(null)
    try {
      const { jobId: jid } = await api.jobs.start(ids)
      setJobId(jid)
    } catch (err: unknown) {
      setDeleteError((err as Error).message)
    }
  }

  const toDelete = groups.reduce((n, g) => n + g.playlists.length - 1, 0)
  const onDone = useCallback((status: { done: number; failed?: number; error?: string; quotaExceeded?: boolean }) => {
    setJobId(null)
    load()
    if (status.error && status.quotaExceeded) {
      addToast('warning', `Quota exceeded — ${status.done} duplicate${status.done !== 1 ? 's' : ''} deleted`)
    } else if (status.error) {
      addToast('error', status.error)
    } else {
      addToast('success', `Deleted ${status.done} duplicate${status.done !== 1 ? 's' : ''}`)
    }
  }, [load, addToast])

  return (
    <>
      <div className="page">
        <div style={{display:'flex',alignItems:'baseline',gap:16,marginBottom:24}}>
          <h1 className="page-title" style={{margin:0}}>Duplicates</h1>
          {!loading && groups.length > 0 && (
            <button className="btn btn-danger" onClick={deleteAll}>
              Delete {toDelete} duplicates
            </button>
          )}
        </div>
        {loading && <Spinner label="Scanning for duplicates…" />}
        {loadError && <p className="msg-error">{loadError}</p>}
        {deleteError && <p className="msg-error">{deleteError}</p>}
        {!loading && groups.length === 0 && (
          <div className="card" style={{padding:32,textAlign:'center',color:'#999'}}>
            <p style={{fontWeight:700,fontSize:18,marginBottom:4}}>No duplicates found</p>
            <p style={{fontSize:13}}>Your playlists are all unique!</p>
          </div>
        )}
        {groups.map((g, i) => (
          <DuplicateGroupCard key={g.name} group={g} keepIndex={g.keepIndex} onFlipKeep={() => flipKeep(i)} />
        ))}
      </div>
      <ProgressDrawer jobId={jobId} onDone={onDone} />
    </>
  )
}
