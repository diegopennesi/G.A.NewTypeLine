import '../pages/OperationsPages.css'
import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { watchAvatar } from '../services/accountService'
import { SiteTopBar } from './SiteTopBar'

export function AppLayout() {
  const { user, signOut } = useAuth()
  const uid = user?.uid
  const [profile, setProfile] = useState<{ uid: string; avatar: string | null } | null>(null)
  useEffect(() => {
    if (!uid) return
    return watchAvatar(uid, avatar => setProfile({ uid, avatar }), () => setProfile(null))
  }, [uid])
  const avatar = profile?.uid === uid ? profile?.avatar : null
  return <div className="app-shell">
    <SiteTopBar>
      <div className="user-menu">
        <Link className="button secondary account-link" to="/account">
          {avatar && <img src={avatar} alt="" />}Account
        </Link>
        <button className="button secondary" type="button" onClick={() => void signOut()}>Esci</button>
      </div>
    </SiteTopBar>
    <main className="page"><Outlet /></main>
  </div>
}
