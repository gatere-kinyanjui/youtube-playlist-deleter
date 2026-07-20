import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Nav } from './components/Nav'
import { DuplicatesPage } from './pages/DuplicatesPage'
import { LoginPage } from './pages/LoginPage'
import { PlaylistsPage } from './pages/PlaylistsPage'
import { RecentPage } from './pages/RecentPage'
import { TagPage } from './pages/TagPage'
import './styles/reset.css'
import './styles/tokens.css'
import './styles/neo-brutal.css'

function Layout() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/"           element={<PlaylistsPage />} />
        <Route path="/duplicates" element={<DuplicatesPage />} />
        <Route path="/tag"        element={<TagPage />} />
        <Route path="/recent"     element={<RecentPage />} />
        <Route path="*"           element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*"      element={<Layout />} />
      </Routes>
    </BrowserRouter>
  )
}
