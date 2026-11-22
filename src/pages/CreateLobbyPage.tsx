import './GameLobbyPage.css'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'
import { createLobby } from '../services/lobbyService'
import type { MatchSize } from '../models/game'

export function CreateLobbyPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [format, setFormat] = useState<MatchSize>('3v3')
  const [randomized, setRandomized] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || pending) return
    setPending(true)
    setError(null)
    try {
      const name = user.displayName || user.email?.split('@')[0] || 'Giocatore 1'
      navigate(`/games/${await createLobby(user.uid, name, format, randomized)}`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossibile creare la partita.')
    } finally {
      setPending(false)
    }
  }

  return <section className="lobby-page operations-page">
    <Link className="operations-back" to="/">← Le tue partite</Link>
    <h1>Nuova partita</h1>
    <p className="lead">Scegli il formato e condividi il codice o il QR dalla lobby.</p>
    <form className="operation-panel" onSubmit={create} aria-busy={pending}>
      <fieldset disabled={pending}>
        <legend>Formato</legend>
        <div className="format-options">
          {(['3v3', '5v5'] as const).map(size => <label className="format-option" key={size}>
            <input type="radio" name="format" value={size} checked={format === size}
              onChange={() => setFormat(size)} />
            <strong>{size}</strong>
            <span>{size[0]} MS per giocatore</span>
          </label>)}
        </div>
      </fieldset>
      <label className="operation-setting">
        <input type="checkbox" checked={randomized} disabled={pending}
          onChange={event => setRandomized(event.target.checked)} />
        <span><strong>Randomizza carte</strong><small>Pesca 3 carte all’inizio e altre 3 quando tutti i tuoi MS raggiungono la Fase 2.</small></span>
      </label>
      {error && <p className="message error" role="alert">{error}</p>}
      <button className="button" disabled={pending}>{pending ? 'Creazione…' : `Crea ${format}`}</button>
    </form>
  </section>
}
