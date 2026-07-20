import './BulkActionBar.css'

interface Props {
  count: number
  onDelete: () => void
  onClear: () => void
}

export function BulkActionBar({ count, onDelete, onClear }: Props) {
  return (
    <div className={`bulk-bar ${count > 0 ? 'visible' : ''}`}>
      <span>{count} selected</span>
      <button className="btn btn-danger" onClick={onDelete}>
        Delete {count}
      </button>
      <button className="btn btn-ghost" style={{color:'#aaa'}} onClick={onClear}>
        Clear
      </button>
    </div>
  )
}
