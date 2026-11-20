import { Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { SiteTopBar } from './SiteTopBar'

export function AppLayout() {
  const { user, signOut } = useAuth()
  return <div className="app-shell">
    <SiteTopBar>
      <div className="user-menu">
        <span>{user?.displayName || user?.email}</span>
        <button className="button secondary" type="button" onClick={() => void signOut()}>Esci</button>
      </div>
    </SiteTopBar>
    <main className="page"><Outlet /></main>
  </div>
}
