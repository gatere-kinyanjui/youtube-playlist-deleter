import { DuplicateGroup as DGType } from '../api'
import './DuplicateGroup.css'

interface Props {
  group: DGType
  keepIndex: number
  onFlipKeep: () => void
}

export function DuplicateGroupCard({ group, keepIndex, onFlipKeep }: Props) {
  return (
    <div className="card dg-card">
      <div className="dg-header" onClick={onFlipKeep} title="Click to flip keeper">
        <strong>{group.name}</strong>
        <span className="chip chip-count">{group.playlists.length} copies</span>
      </div>
      {group.playlists.map((p, i) => (
        <div key={p.id} className={`dg-row ${i === keepIndex ? 'keep' : 'delete'}`}>
          <span className="dg-badge">{i === keepIndex ? '✓ KEEP' : '✗ DEL'}</span>
          <span className="dg-title">{p.title}</span>
          <span className="dg-meta">{p.itemCount} tracks · {p.publishedAt.slice(0,10)}</span>
        </div>
      ))}
    </div>
  )
}
