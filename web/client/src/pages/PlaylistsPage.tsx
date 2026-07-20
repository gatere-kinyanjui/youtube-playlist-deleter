import { useCallback, useEffect, useRef, useState } from 'react'
import { api, Playlist } from '../api'
import { BulkActionBar } from '../components/BulkActionBar'
import { FilterBar } from '../components/FilterBar'
import { PlaylistCard } from '../components/PlaylistCard'
import { ProgressDrawer } from '../components/ProgressDrawer'

const PAGE_SIZE = 30

export function PlaylistsPage() {
  const [all, setAll] = useState<Playlist[]>([])
  const [visible, setVisible] = useState<Playlist[]>([])
  const [selected, setSelected] = useState(new Set<string>())
  const [jobId, setJobId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef(1)

  const load = useCallback(async (params?: { search?: string; days?: number }) => {
    setLoading(true)
    pageRef.current = 1
    const playlists = await api.playlists.list(params)
    setAll(playlists)
    setVisible(playlists.slice(0, PAGE_SIZE))
    setSelected(new Set())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && visible.length < all.length) {
        const next = pageRef.current + 1
        pageRef.current = next
        setVisible(all.slice(0, next * PAGE_SIZE))
      }
    }, { threshold: 0.1 })
    const el = sentinelRef.current
    if (el) observer.observe(el)
    return () => { if (el) observer.unobserve(el) }
  }, [all, visible.length])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function deleteSelected() {
    const ids = [...selected]
    const { jobId: jid } = await api.jobs.start(ids)
    setJobId(jid)
  }

  function onDone() {
    setJobId(null)
    load()
  }

  return (
    <>
      <div className="page">
        <h1 className="page-title">All Playlists</h1>
        <FilterBar onFilter={load} />
        {loading && <p style={{fontWeight:600}}>Loading…</p>}
        <div className="card" style={{padding:0, overflow:'hidden'}}>
          {visible.map(p => (
            <PlaylistCard
              key={p.id}
              playlist={p}
              selected={selected.has(p.id)}
              onToggle={() => toggle(p.id)}
            />
          ))}
          {visible.length < all.length && (
            <div ref={sentinelRef} style={{padding:16,textAlign:'center',color:'#999',fontSize:13}}>
              Loading more…
            </div>
          )}
          {!loading && all.length === 0 && (
            <div style={{padding:32,textAlign:'center',color:'#999'}}>No playlists found.</div>
          )}
        </div>
      </div>
      <BulkActionBar count={selected.size} onDelete={deleteSelected} onClear={() => setSelected(new Set())} />
      <ProgressDrawer jobId={jobId} onDone={onDone} />
    </>
  )
}
