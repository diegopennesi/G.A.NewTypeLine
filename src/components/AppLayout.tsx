import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
export function AppLayout() { const { user, signOut } = useAuth(); return <div className="app-shell"><header className="topbar"><Link className="brand" to="/">G.A.<span>NewTypeLine</span></Link><div className="user-menu"><span>{user?.displayName || user?.email}</span><button className="button secondary" type="button" onClick={() => void signOut()}>Esci</button></div></header><main className="page"><Outlet /></main></div> }
