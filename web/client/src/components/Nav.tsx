import { NavLink } from 'react-router-dom'
import './Nav.css'

export function Nav() {
  return (
    <nav className="nav">
      <div className="nav-brand">
        <span className="chip chip-yt">YT</span>
        <span className="nav-title">Playlist Manager</span>
      </div>
      <div className="nav-links">
        <NavLink to="/"           className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>All</NavLink>
        <NavLink to="/duplicates" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Duplicates</NavLink>
        <NavLink to="/tag"        className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>[SPO]</NavLink>
        <NavLink to="/recent"     className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Recent</NavLink>
      </div>
      <a href="/auth/logout" className="btn btn-ghost" style={{fontSize:13}}>Log out</a>
    </nav>
  )
}
