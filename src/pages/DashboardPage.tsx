import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatMatchTime } from '../models/matchActivity'
import { useMatchClock } from '../features/useMatchClock'
import { useAuth } from '../features/auth/useAuth'
import { watchResumableMatches, type ResumableMatch } from '../services/lobbyService'

const matchLabels = { WAITING: 'In attesa di un giocatore', SETUP: 'Preparazione', ACTIVE: 'In corso', FINISHED: 'Conclusa' }

export function DashboardPage() {
  const { user } = useAuth()
  const playerId = user?.uid
  const [result, setResult] = useState<{ playerId: string; matches: ResumableMatch[] } | null>(null)
  const [failedFor, setFailedFor] = useState<string | null>(null)
  useEffect(() => {
    if (!playerId) return
    return watchResumableMatches(playerId, matches => {
      setResult({ playerId, matches })
      setFailedFor(null)
    }, () => setFailedFor(playerId))
  }, [playerId])
  const matches = result?.playerId === playerId ? result?.matches : undefined

  const deadlines = useMemo(() => (matches ?? []).flatMap(match =>
    match.expiresAt === null ? [] : [match.expiresAt]).sort((a, b) => a - b), [matches])
  const now = useMatchClock(deadlines)
  const visibleMatches = matches?.filter(match => match.expiresAt === null || now < match.expiresAt)

  return <>
    <p className="eyebrow">Dashboard</p>
    <h1>Pronto per la prossima partita, {user?.displayName?.split(' ')[0] || 'pilota'}.</h1>
    <div className="dashboard-grid">
      <section className="panel"><h2>Partite multiplayer</h2><p className="lead">Crea una lobby o entra con il codice ricevuto dal tuo avversario.</p><div className="action-row"><Link className="button" to="/lobby/create">Crea partita</Link><Link className="button secondary" to="/lobby/join">Entra con un codice</Link></div></section>
      <section className="panel" aria-labelledby="rejoin-title">
        <h2 id="rejoin-title">Riprendi partita</h2>
        {failedFor === playerId ? <p className="message error" role="alert">Impossibile caricare le tue partite.</p>
          : !visibleMatches ? <p role="status">Caricamento delle partite…</p>
          : visibleMatches.length === 0 ? <p className="lead">Non hai partite da riprendere.</p>
          : <ul className="resume-matches">{visibleMatches.map(match => <li key={match.code}>
              <div><strong>{match.code} · {match.matchSize}</strong>
                <span>{matchLabels[match.status]}{match.opponent && ` · ${match.opponent}`}</span>
                {match.status === 'ACTIVE' && <span>{match.lastMoveAt === null ? 'Nessuna mossa registrata' : <>Ultima mossa <time dateTime={new Date(match.lastMoveAt).toISOString()}>{formatMatchTime(match.lastMoveAt)}</time></>}</span>}
              </div>
              <Link className="button secondary" to={`/games/${match.code}`} aria-label={`Riprendi partita ${match.code}`}>Riprendi</Link>
            </li>)}</ul>}
      </section>
      <aside className="panel"><h2>Roadmap</h2><ol className="milestones"><li><span className="milestone-number">1</span><span>Account e dashboard completati</span></li><li><span className="milestone-number">2</span><span>Lobby e inviti condivisibili</span></li><li><span className="milestone-number">3</span><span>Timeline e sincronizzazione</span></li></ol></aside>
    </div>
  </>
}
