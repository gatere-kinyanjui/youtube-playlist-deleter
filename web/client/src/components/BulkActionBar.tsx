import { useState } from 'react'
import './BulkActionBar.css'

interface Props {
  count: number
  total: number
  onDelete: () => void
  onSelectAll: () => void
  onClear: () => void
  onSelectN?: (n: number) => void
}

export function BulkActionBar({ count, total, onDelete, onSelectAll, onClear, onSelectN }: Props) {
  const [nVal, setNVal] = useState('')
  const allSelected = count === total && total > 0

  function handleSelectN() {
    const n = parseInt(nVal, 10)
    if (n > 0 && n <= total) {
      onSelectN?.(n)
      setNVal('')
    }
  }

  return (
    <div className={`bulk-bar ${count > 0 || nVal ? 'visible' : ''}`}>
      <span>{count} selected</span>
      <button className="btn btn-secondary" onClick={allSelected ? onClear : onSelectAll}>
        {allSelected ? 'Deselect all' : `Select all ${total}`}
      </button>
      {onSelectN && (
        <span className="bulk-select-n">
          <input
            className="bulk-n-input"
            type="number"
            min={1}
            max={total}
            placeholder="N"
            value={nVal}
            onChange={e => setNVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSelectN()}
          />
          <button className="btn btn-ghost bulk-n-go" onClick={handleSelectN} disabled={!nVal}>
            Select
          </button>
        </span>
      )}
      <button className="btn btn-danger" onClick={onDelete} disabled={count === 0}>Delete {count}</button>
      <button className="btn btn-ghost" onClick={onClear}>Clear</button>
    </div>
  )
}
