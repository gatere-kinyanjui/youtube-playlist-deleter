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

  async function logout() {
    try {
      await fetch('/auth/logout', { credentials: 'include' })
    } finally {
      window.location.href = '/login'
    }
  }

  function close() { setMenuOpen(false) }

  return (
    <nav className="nav">
      <div className="nav-brand">
        <span className="chip chip-yt">YT</span>
        <span className="nav-title">Playlist Manager</span>
      </div>

      <div className="nav-right">
        <div className="nav-links">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
              {l.label}
            </NavLink>
          ))}
        </div>
        <button className="btn btn-ghost nav-logout" onClick={logout}>Log out</button>

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
      </div>

      {menuOpen && <div className="menu-overlay" onClick={close} />}

      <div className={`menu-drawer ${menuOpen ? 'menu-drawer--open' : ''}`}>
        {links.map(l => (
          <NavLink
            key={l.to}
            to={l.to}
            end
            className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}
            onClick={close}
          >
            {l.label}
          </NavLink>
        ))}
        <div className="menu-drawer-footer">
          <button className="btn btn-ghost" onClick={logout}>Log out</button>
        </div>
      </div>
    </nav>
  )
}
