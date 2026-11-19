import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'

export function DashboardPage() {
  const { user } = useAuth()
  return <>
    <p className="eyebrow">Dashboard</p>
    <h1>Pronto per la prossima partita, {user?.displayName?.split(' ')[0] || 'pilota'}.</h1>
    <div className="dashboard-grid">
      <section className="panel"><h2>Partite multiplayer</h2><p className="lead">Crea una lobby o entra con il codice ricevuto dal tuo avversario.</p><div className="action-row"><Link className="button" to="/lobby/create">Crea partita</Link><Link className="button secondary" to="/lobby/join">Entra con un codice</Link></div></section>
      <aside className="panel"><h2>Roadmap</h2><ol className="milestones"><li><span className="milestone-number">1</span><span>Account e dashboard completati</span></li><li><span className="milestone-number">2</span><span>Lobby e inviti condivisibili</span></li><li><span className="milestone-number">3</span><span>Timeline e sincronizzazione</span></li></ol></aside>
    </div>
  </>
}
