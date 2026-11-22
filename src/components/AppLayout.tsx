import { findAvatar, type AvatarId } from '../data/avatars'
import '../pages/OperationsPages.css'
import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { watchAvatar } from '../services/accountService'
import { SiteTopBar } from './SiteTopBar'

export function AppLayout() {
  const { user, signOut } = useAuth()
  const uid = user?.uid
  const [profile, setProfile] = useState<{ uid: string; avatar: AvatarId | null } | null>(null)
  useEffect(() => {
    if (!uid) return
    return watchAvatar(uid, avatar => setProfile({ uid, avatar }), () => setProfile(null))
  }, [uid])
  const avatar = profile && profile.uid === uid ? findAvatar(profile.avatar) : null
  return <div className="app-shell">
    <SiteTopBar>
      <div className="user-menu">
        <Link className="button secondary account-link" to="/account">
          {avatar && ('src' in avatar ? <img src={avatar.src} alt="" /> : <span className="account-mystery" aria-hidden="true">?</span>)}Account
        </Link>
        <button className="button secondary" type="button" onClick={() => void signOut()}>Esci</button>
      </div>
    </SiteTopBar>
    <main className="page"><Outlet /></main>
  </div>
}
