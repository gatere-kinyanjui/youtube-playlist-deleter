import '../styles/tokens.css'
import '../styles/reset.css'
import '../styles/neo-brutal.css'

export function LoginPage() {
  return (
    <div className="login-wrap">
      <div className="login-hero">
        <div className="chip chip-yt login-chip">YT</div>
        <h1 className="login-title">Playlist<br />Manager</h1>
        <p className="login-sub">Bulk-delete your YouTube playlists.<br />No mercy.</p>
      </div>
      <a href="/auth/login" className="btn btn-primary login-cta">Connect YouTube &rarr;</a>
      <p className="login-fine">Requires YouTube Data API permission</p>
    </div>
  )
}
