import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import type { Game } from '../models/game'
import { useAuth } from '../features/auth/useAuth'
import { subscribeToLobby } from '../services/lobbyService'
import './GameLobbyPage.css'

export function GameLobbyPage() {
  const { gameCode = '' } = useParams()
  const { user } = useAuth()
  const [game, setGame] = useState<Game | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => subscribeToLobby(gameCode, setGame, (reason) => setError(reason.message)), [gameCode])

  if (error) return <p className="message error">{error}</p>
  if (!game) return <p>Caricamento della lobby…</p>

  const isPlayerOne = game.playerOneId === user?.uid
  const isPlayerTwo = game.playerTwoId === user?.uid
  const isParticipant = isPlayerOne || isPlayerTwo
  const inviteUrl = new URL(`/join/${game.code}`, window.location.origin).toString()
  const waitingForPlayer = game.status === 'WAITING'

  if (!isParticipant) return <section className="lobby-page"><p className="eyebrow">Lobby privata</p><h1>Inserisci il codice per entrare.</h1><p className="lead">Per partecipare devi usare il codice della lobby o il suo QR di invito.</p><Link className="button secondary inline-button" to="/lobby/join">Inserisci un codice</Link></section>

  return <section className="lobby-page">
    <p className="eyebrow">Lobby partita</p>
    <h1>{waitingForPlayer ? 'In attesa del Giocatore 2' : 'I due giocatori sono pronti.'}</h1>
    <div className="share-code"><span>Codice partita</span><strong>{game.code}</strong></div>
    {waitingForPlayer ? <p className="lead">Condividi il codice o fai scansionare il QR. La lobby si aggiornerà automaticamente quando l’altro giocatore entrerà.</p> : <p className="lead">I due giocatori sono connessi. La selezione delle Mobile Suit arriverà nello Sprint 3.</p>}
    {isPlayerOne && waitingForPlayer && <section className="invite-card" aria-labelledby="invite-title">
      <div><h2 id="invite-title">Invita il Giocatore 2</h2><p>Può scansionare questo QR dal cellulare oppure aprire il link condivisibile.</p><a className="invite-link" href={inviteUrl}>{inviteUrl}</a></div>
      <div className="qr-code"><QRCodeSVG value={inviteUrl} size={176} level="M" includeMargin title={`QR per entrare nella partita ${game.code}`} /></div>
    </section>}
    <div className="player-list"><p><b>Giocatore 1</b> {isPlayerOne ? 'Tu' : 'Giocatore connesso'}</p><p><b>Giocatore 2</b> {game.playerTwoId ? (isPlayerTwo ? 'Tu' : 'Giocatore connesso') : 'In attesa…'}</p></div>
    <Link className="button secondary inline-button" to="/">Torna alla dashboard</Link>
  </section>
}
