import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { joinLobby } from '../services/lobbyService'

export function InviteJoinPage() {
  const { gameCode = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    void joinLobby(gameCode, user.uid, user.displayName || user.email?.split('@')[0] || 'Giocatore 2')
      .then((code) => navigate(`/games/${code}`, { replace: true }))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Impossibile entrare nella partita.'))
  }, [gameCode, navigate, user])

  if (error) return <section className="lobby-page operations-page"><p className="message error">{error}</p><Link className="button secondary inline-button" to="/lobby/join">Inserisci un altro codice</Link></section>
  return <section className="lobby-page operations-page" aria-busy="true"><div className="operation-panel" role="status"><h1>Ingresso nella lobby…</h1></div></section>
}
