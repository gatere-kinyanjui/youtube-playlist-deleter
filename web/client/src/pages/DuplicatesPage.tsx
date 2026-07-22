import { useCallback, useEffect, useState } from 'react'
import { api, DuplicateGroup } from '../api'
import { DuplicateGroupCard } from '../components/DuplicateGroup'
import { ProgressDrawer } from '../components/ProgressDrawer'

export function DuplicatesPage() {
  const [groups, setGroups] = useState<(DuplicateGroup & { keepIndex: number })[]>([])
  const [jobId, setJobId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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
  const onDone = useCallback(() => { setJobId(null); load() }, [load])

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
        {loading && <p style={{fontWeight:600}}>Scanning…</p>}
        {loadError && <p style={{color:'var(--pink)',fontWeight:700}}>{loadError}</p>}
        {deleteError && <p style={{color:'var(--pink)',fontWeight:700}}>{deleteError}</p>}
        {!loading && groups.length === 0 && (
          <div className="card" style={{padding:32,textAlign:'center',color:'#999'}}>
            No duplicates found.
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
