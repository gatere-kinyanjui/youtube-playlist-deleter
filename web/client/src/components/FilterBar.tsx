import { useState } from 'react'
import './FilterBar.css'

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

  function apply(s: string, d: number | undefined) {
    setSearch(s); setDays(d); onFilter({ search: s, days: d })
  }

  return (
    <div className="filter-bar">
      <input
        className="input filter-search"
        placeholder="Search playlists..."
        value={search}
        onChange={e => apply(e.target.value, days)}
      />
      <div className="filter-days">
        {DAY_OPTIONS.map(opt => (
          <button
            key={opt.label}
            className={`btn ${days === opt.value ? 'btn-secondary' : ''}`}
            style={days !== opt.value ? {boxShadow:'none',borderColor:'transparent'} : {}}
            onClick={() => apply(search, opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
