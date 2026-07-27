import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import './Nav.css'

const links = [
  { to: '/', label: 'All' },
  { to: '/duplicates', label: 'Duplicates' },
  { to: '/tag', label: '[SPO]' },
  { to: '/recent', label: 'Recent' },
]

export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false)

  function closeMenu() { setMenuOpen(false) }

  async function logout() {
    await fetch('/auth/logout', { credentials: 'include' })
    window.location.href = '/login'
  }

  return (
    <nav className="nav">
      <div className="nav-brand">
        <span className="chip chip-yt">YT</span>
        <span className="nav-title">Playlist Manager</span>
      </div>

      <div className="nav-links-desktop">
        {links.map(l => (
          <NavLink key={l.to} to={l.to} end className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
            {l.label}
          </NavLink>
        ))}
        <button className="btn btn-ghost nav-logout" onClick={logout}>Log out</button>
      </div>

      <button
        className={`hamburger ${menuOpen ? 'hamburger--open' : ''}`}
        onClick={() => setMenuOpen(o => !o)}
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
      >
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>

      {menuOpen && <div className="menu-overlay" onClick={closeMenu} />}

      <div className={`menu-drawer ${menuOpen ? 'menu-drawer--open' : ''}`}>
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end
            className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}
            onClick={closeMenu}
          >
            {l.label}
          </NavLink>
        ))}
        <button className="btn btn-ghost nav-logout" onClick={logout}>Log out</button>
      </div>
    </nav>
  )
}
