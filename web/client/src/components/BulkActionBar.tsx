import './BulkActionBar.css'

interface Props {
  count: number
  total: number
  onDelete: () => void
  onSelectAll: () => void
  onClear: () => void
}

export function BulkActionBar({ count, total, onDelete, onSelectAll, onClear }: Props) {
  const allSelected = count === total && total > 0
  return (
    <div className={`bulk-bar ${count > 0 ? 'visible' : ''}`}>
      <span>{count} selected</span>
      <button className="btn btn-secondary" onClick={allSelected ? onClear : onSelectAll}>
        {allSelected ? 'Deselect all' : `Select all ${total}`}
      </button>
      <button className="btn btn-danger" onClick={onDelete}>Delete {count}</button>
      <button className="btn btn-ghost" style={{color:'#aaa'}} onClick={onClear}>Clear</button>
    </div>
  )
}
