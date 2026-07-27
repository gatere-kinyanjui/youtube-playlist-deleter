import { useEffect, useRef, useState } from 'react'
import './FilterBar.css'
import { Spinner } from './Spinner'

interface Props {
  onFilter: (params: { search: string; days: number | undefined }) => void
}

const DAY_OPTIONS = [
  { label: 'All time', value: undefined },
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
]

export function FilterBar({ onFilter }: Props) {
  const [search, setSearch] = useState('')
  const [days, setDays] = useState<number | undefined>(undefined)
  const [searching, setSearching] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function apply(s: string, d: number | undefined, immediate?: boolean) {
    setSearch(s)
    setDays(d)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (immediate) {
      setSearching(true)
      onFilter({ search: s, days: d })
    } else {
      setSearching(true)
      timerRef.current = setTimeout(() => {
        onFilter({ search: s, days: d })
      }, 300)
    }
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  useEffect(() => {
    if (!searching) return
    const t = setTimeout(() => setSearching(false), 400)
    return () => clearTimeout(t)
  }, [searching])

  return (
    <div className="filter-bar">
      <div className="filter-search-wrap">
        <input
          className="input filter-search"
          placeholder="Search playlists..."
          value={search}
          onChange={e => apply(e.target.value, days)}
        />
        {search && searching && <Spinner inline label="Searching…" />}
      </div>
      <div className="filter-days">
        {DAY_OPTIONS.map(opt => (
          <button
            key={opt.label}
            className={`btn ${days === opt.value ? 'btn-secondary' : ''}`}
            style={days !== opt.value ? {boxShadow:'none',borderColor:'transparent'} : {}}
            onClick={() => apply(search, opt.value, true)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
