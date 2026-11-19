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
    void joinLobby(gameCode, user.uid)
      .then((code) => navigate(`/games/${code}`, { replace: true }))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Impossibile entrare nella partita.'))
  }, [gameCode, navigate, user])

  if (error) return <section className="lobby-page"><p className="message error">{error}</p><Link className="button secondary inline-button" to="/lobby/join">Inserisci un altro codice</Link></section>
  return <section className="lobby-page" aria-busy="true"><p className="eyebrow">Invito partita</p><h1>Ingresso nella lobby…</h1><p className="lead">Stai entrando come Giocatore 2.</p></section>
}
