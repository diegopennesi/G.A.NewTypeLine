import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { AuthPage } from '../pages/AuthPage'
import { DashboardPage } from '../pages/DashboardPage'
export const router = createBrowserRouter([{ path: '/auth', element: <AuthPage /> }, { element: <ProtectedRoute />, children: [{ element: <AppLayout />, children: [{ path: '/', element: <DashboardPage /> }] }] }, { path: '*', element: <Navigate to="/" replace /> }])
