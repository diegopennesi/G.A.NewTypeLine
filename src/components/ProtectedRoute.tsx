import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
export function ProtectedRoute() { const { user, loading } = useAuth(); if (loading) return <div className="auth-page">Caricamento sessione…</div>; return user ? <Outlet /> : <Navigate to="/auth" replace /> }
