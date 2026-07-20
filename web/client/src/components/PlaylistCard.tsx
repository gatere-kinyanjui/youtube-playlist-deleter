import { Playlist } from '../api'
import './PlaylistCard.css'

interface Props {
  playlist: Playlist
  selected: boolean
  onToggle: () => void
}

export function PlaylistCard({ playlist, selected, onToggle }: Props) {
  const date = playlist.publishedAt.slice(0, 10)
  const tracks = `${playlist.itemCount} track${playlist.itemCount !== 1 ? 's' : ''}`

  return (
    <div className={`playlist-row ${selected ? 'selected' : ''}`}>
      <div
        className={`checkbox ${selected ? 'checked' : ''}`}
        onClick={onToggle}
        role="checkbox"
        aria-checked={selected}
        tabIndex={0}
        onKeyDown={e => e.key === ' ' && onToggle()}
      />
      <div className="playlist-row-body" onClick={onToggle}>
        <span className="playlist-title">{playlist.title}</span>
        <span className="playlist-meta">{date} · {tracks}</span>
      </div>
    </div>
  )
}
