import { useCallback, useState } from 'react'
import { api, Playlist } from '../api'
import { BulkActionBar } from '../components/BulkActionBar'
import { PlaylistCard } from '../components/PlaylistCard'
import { ProgressDrawer } from '../components/ProgressDrawer'

// Matches same unit strings as CLI src/time.ts
function parseMs(input: string): number | null {
  const m = input.trim().toLowerCase().match(/^(\d+)\s*(h|hour|hours|d|day|days|w|week|weeks|mo|month|months)$/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  if (n <= 0) return null
  const units: Record<string, number> = {
    h:3_600_000,hour:3_600_000,hours:3_600_000,
    d:86_400_000,day:86_400_000,days:86_400_000,
    w:7*86_400_000,week:7*86_400_000,weeks:7*86_400_000,
    mo:30*86_400_000,month:30*86_400_000,months:30*86_400_000,
  }
  return n * units[m[2]]
}

export function RecentPage() {
  const [rangeInput, setRangeInput] = useState('')
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [selected, setSelected] = useState(new Set<string>())
  const [jobId, setJobId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const onDeleteDone = useCallback(() => { setJobId(null); setPlaylists([]); setSelected(new Set()); setSearched(false) }, [])

  async function search() {
    const ms = parseMs(rangeInput)
    if (!ms) { setError('Try: 6 hours, 3 days, 2 weeks, 1 month'); return }
    setError('')
    const days = ms / 86_400_000
    try {
      const list = await api.playlists.list({ days })
      setPlaylists(list)
      setSelected(new Set(list.map(p => p.id)))
      setSearched(true)
    } catch (err: unknown) {
      setError((err as Error).message)
    }
  }

  function toggle(id: string) {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  async function deleteSelected() {
    const ids = [...selected]
    setSelected(new Set())
    setError('')
    try {
      const { jobId: jid } = await api.jobs.start(ids)
      setJobId(jid)
    } catch (err: unknown) {
      setSelected(new Set(ids))
      setError((err as Error).message)
    }
  }

  return (
    <>
      <div className="page">
        <h1 className="page-title">Delete Recent</h1>
        <p style={{marginBottom:16,color:'#555',fontWeight:600}}>
          Find playlists created within a time range, then bulk delete.
        </p>
        <div style={{display:'flex',gap:12,marginBottom:8,alignItems:'flex-end'}}>
          <div style={{flex:1,maxWidth:320}}>
            <label style={{display:'block',fontWeight:700,marginBottom:6}}>
              Newer than
            </label>
            <input
              className="input"
              placeholder="e.g. 2 weeks, 30 days, 6 hours"
              value={rangeInput}
              onChange={e => setRangeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
            />
          </div>
          <button className="btn btn-secondary" onClick={search}>Find</button>
        </div>
        {error && <p style={{color:'var(--pink)',fontWeight:700,marginBottom:16}}>{error}</p>}

        {searched && playlists.length === 0 && (
          <div className="card" style={{padding:32,textAlign:'center',color:'#999'}}>
            No playlists found in that range.
          </div>
        )}
        {playlists.length > 0 && (
          <div className="card" style={{padding:0,overflow:'hidden',marginTop:16}}>
            {playlists.map(p => (
              <PlaylistCard key={p.id} playlist={p} selected={selected.has(p.id)} onToggle={() => toggle(p.id)} />
            ))}
          </div>
        )}
      </div>
      <BulkActionBar
        count={selected.size}
        total={playlists.length}
        onDelete={deleteSelected}
        onSelectAll={() => setSelected(new Set(playlists.map(p => p.id)))}
        onClear={() => setSelected(new Set())}
      />
      <ProgressDrawer jobId={jobId} onDone={onDeleteDone} />
    </>
  )
}
