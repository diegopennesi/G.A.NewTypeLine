import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { AuthPage } from '../pages/AuthPage'
import { DashboardPage } from '../pages/DashboardPage'
import { CreateLobbyPage } from '../pages/CreateLobbyPage'
import { GameLobbyPage } from '../pages/GameLobbyPage'
import { JoinLobbyPage } from '../pages/JoinLobbyPage'
export const router = createBrowserRouter([{ path: '/auth', element: <AuthPage /> }, { element: <ProtectedRoute />, children: [{ element: <AppLayout />, children: [{ path: '/', element: <DashboardPage /> }, { path: '/lobby/create', element: <CreateLobbyPage /> }, { path: '/lobby/join', element: <JoinLobbyPage /> }, { path: '/games/:gameCode', element: <GameLobbyPage /> }] }] }, { path: '*', element: <Navigate to="/" replace /> }])
