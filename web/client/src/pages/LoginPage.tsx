import '../styles/tokens.css'
import '../styles/reset.css'
import '../styles/neo-brutal.css'

export function LoginPage() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap: 32, background:'var(--bg)' }}>
      <div style={{ textAlign:'center' }}>
        <div className="chip chip-yt" style={{fontSize:14, marginBottom:16}}>YT</div>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(32px, 10vw, 48px)', fontWeight:800, lineHeight:1 }}>
          Playlist<br />Manager
        </h1>
        <p style={{ marginTop:16, fontWeight:600, color:'#555' }}>
          Clean up your YouTube playlists.
        </p>
      </div>
      <a href="/auth/login" className="btn btn-primary" style={{fontSize:16, padding:'14px 32px'}}>
        Connect YouTube &rarr;
      </a>
    </div>
  )
}
