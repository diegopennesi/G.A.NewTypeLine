import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../../services/firebase'
import { listenToAuthState, signInWithEmail, signInWithGoogle, signOutUser, signUpWithEmail } from '../../services/authService'
import { AuthContext } from './context'
export function AuthProvider({ children }: { children: ReactNode }) { const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(Boolean(auth)); useEffect(() => { if (!auth) return; return listenToAuthState(setUser, () => setLoading(false)) }, []); const value = useMemo(() => ({ user, loading, configured: isFirebaseConfigured, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut: signOutUser }), [user, loading]); return <AuthContext.Provider value={value}>{children}</AuthContext.Provider> }
