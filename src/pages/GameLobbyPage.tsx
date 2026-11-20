import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import type { Game } from '../models/game'
import { formatMatchTime, matchActivity } from '../models/matchActivity'
import { useMatchClock } from '../features/useMatchClock'
import { useAuth } from '../features/auth/useAuth'
import { leaveLobby, setReady, subscribeToLobby } from '../services/lobbyService'
import { useNavigate } from 'react-router-dom'
import { unitCards } from '../data/unitCards'
import { ManualTimeline } from './ManualTimeline'
import { TacticsDeckPicker } from './TacticsDeckPicker'
import { tacticsDeckSize } from '../data/tacticsCards'
import { watchTacticsDeck } from '../services/tacticsService'
import './GameLobbyPage.css'

export function GameLobbyPage() {
  const { gameCode = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [game, setGame] = useState<Game | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [ready, setReadyState] = useState(false)
  const [selection, setSelection] = useState<string[]>([])

  useEffect(() => subscribeToLobby(gameCode, next => {
    setGame(next)
    if (!next) { setError('Questa lobby non esiste più.'); return }
    const one = next.playerOneId === user?.uid
    if (one ? next.playerOneReady : next.playerTwoReady) {
      setSelection((one ? next.playerOneSquad : next.playerTwoSquad) ?? [])
    }
    if (next.status === 'WAITING') { setSelection([]); setReadyState(false) }
  }, (reason) => setError(reason.message)), [gameCode, user?.uid])

  const activity = game ? matchActivity(game) : null
  const deadline = activity?.expiresAt ?? null
  const now = useMatchClock(deadline)
  const expired = deadline !== null && now >= deadline

  const playerId = user?.uid
  const participant = game && (game.playerOneId === playerId || game.playerTwoId === playerId)
  const deckKey = !expired && participant && playerId && game.code === gameCode ? `${gameCode}/${playerId}` : null
  const [savedDeck, setSavedDeck] = useState<{ key: string; cards: string[] } | null>(null)
  useEffect(() => {
    if (!deckKey || !playerId) return
    return watchTacticsDeck(gameCode, playerId,
      cards => setSavedDeck({ key: deckKey, cards }),
      () => setError('Impossibile caricare il mazzo tattico.'))
  }, [deckKey, gameCode, playerId])
  const deck = savedDeck?.key === deckKey ? savedDeck?.cards : undefined

  if (error && !game) return <p className="message error">{error} <Link to="/">Dashboard</Link></p>
  if (!game) return <p>Caricamento della lobby…</p>
  if (game.status === 'FINISHED') return <section className="lobby-page">
    <h1>Partita chiusa</h1>
    <Link className="button secondary inline-button" to="/">Torna alla dashboard</Link>
  </section>
  if (expired) return <section className="lobby-page">
    <h1>Partita scaduta</h1>
    <p className="lead">È trascorsa un’ora dall’ultima attività.</p>
    {activity?.lastMoveAt != null && <p>Ultima mossa {formatMatchTime(activity.lastMoveAt)}</p>}
    <Link className="button secondary inline-button" to="/">Torna alla dashboard</Link>
  </section>

  const isPlayerOne = game.playerOneId === user?.uid
  const isPlayerTwo = game.playerTwoId === user?.uid
  const isParticipant = isPlayerOne || isPlayerTwo
  const inviteUrl = new URL(`/join/${game.code}`, window.location.origin).toString()
  const waitingForPlayer = game.status === 'WAITING'
  const myReady = isPlayerOne ? game.playerOneReady : game.playerTwoReady
  const squadSize = game.matchSize === '3v3' ? 3 : 5

  if (!isParticipant) return <section className={game.status === 'ACTIVE' ? 'lobby-page lobby-page-active' : 'lobby-page'}><p className="eyebrow">Lobby privata</p><h1>Inserisci il codice per entrare.</h1><p className="lead">Per partecipare devi usare il codice della lobby o il suo QR di invito.</p><Link className="button secondary inline-button" to="/lobby/join">Inserisci un codice</Link></section>

  return <section className={game.status === 'ACTIVE' ? 'lobby-page lobby-page-active' : 'lobby-page'}>
    {error && <p className="message error" role="alert">{error}</p>}
    <p className="eyebrow">Lobby partita</p>
    <h1>{waitingForPlayer ? 'In attesa del Giocatore 2' : game.status === 'ACTIVE' ? 'Partita avviata' : 'Preparate le vostre squadre'}</h1>
    <div className="share-code"><span>Codice partita</span><strong>{game.code}</strong></div>
    {waitingForPlayer ? <p className="lead">Condividi il codice o fai scansionare il QR. La lobby si aggiornerà automaticamente quando l’altro giocatore entrerà.</p> : game.status !== 'ACTIVE' && <p className="lead">Formato {game.matchSize}. I colori sono assegnati casualmente. Scegli le unità e conferma la tua squadra.</p>}
    {isPlayerOne && waitingForPlayer && <section className="invite-card" aria-labelledby="invite-title">
      <div><h2 id="invite-title">Invita il Giocatore 2</h2><p>Può scansionare questo QR dal cellulare oppure aprire il link condivisibile.</p><a className="invite-link" href={inviteUrl}>{inviteUrl}</a></div>
      <div className="qr-code"><QRCodeSVG value={inviteUrl} size={176} level="M" includeMargin title={`QR per entrare nella partita ${game.code}`} /></div>
    </section>}
    <div className="player-list"><p><b>Giocatore 1</b> {isPlayerOne ? 'Tu' : game.playerOneName} {game.playerOneTeam && `— ${game.playerOneTeam === 'RED' ? 'Rosso' : 'Blu'} ${game.playerOneReady ? '✓' : ''}`}</p><p><b>Giocatore 2</b> {game.playerTwoId ? `${isPlayerTwo ? 'Tu' : game.playerTwoName} — ${game.playerTwoTeam === 'RED' ? 'Rosso' : 'Blu'} ${game.playerTwoReady ? '✓' : ''}` : 'In attesa…'}</p></div>
    {game.status === 'SETUP' && <section className="squad-picker"><h2>Componi la tua squadra · {selection.length}/{squadSize}</h2><p className="lead">Unit Card dello Starter Set e segnaposto.</p><div className="unit-grid">{unitCards.map((unit) => <button type="button" className={`unit-card ${selection.includes(unit.id) ? 'selected' : ''}`} key={unit.id} disabled={myReady || ready || game.status === 'ACTIVE'} onClick={() => setSelection((current) => current.includes(unit.id) ? current.filter((id) => id !== unit.id) : current.length < squadSize ? [...current, unit.id] : current)}><b>{unit.name}</b><span>{unit.faction}</span><span>{unit.stats ? 'TL iniziale' : 'TL provv.'} {unit.startingTimeline}</span>{unit.stats && <span>HP {unit.stats.hp} · VP {unit.stats.vp}</span>}</button>)}</div></section>}
    {(waitingForPlayer || game.status === 'SETUP') && user && deck && <TacticsDeckPicker key={deckKey} code={game.code} playerId={user.uid} deck={deck} locked={myReady || ready} />}
    {!waitingForPlayer && game.status !== 'ACTIVE' && <button className="button" disabled={ready || (!myReady && deck?.length !== tacticsDeckSize) || (myReady && !game.playerOneReady) || (myReady && !game.playerTwoReady) || selection.length !== squadSize} onClick={() => { if (!user) return; setError(null); setReadyState(true); void setReady(game.code, user.uid, isPlayerOne, selection).then(() => setReadyState(false)).catch((reason) => { setReadyState(false); setError(reason instanceof Error ? reason.message : 'Impossibile confermare.') }) }}>{ready ? 'Conferma…' : myReady ? (game.playerOneReady && game.playerTwoReady ? 'Avvia partita' : 'Pronto · in attesa') : selection.length !== squadSize ? `Scegli ${squadSize} Unit Card` : deck?.length !== tacticsDeckSize ? 'Salva il mazzo tattico' : 'Sono pronto'}</button>}
    {game.status === 'ACTIVE' && user && <ManualTimeline key={game.code} game={game} playerId={user.uid} deck={deck ?? []} />}
    {game.status !== 'ACTIVE' && <button className="button secondary" disabled={leaving} onClick={() => { if (!user) return; setLeaving(true); void leaveLobby(game.code, user.uid).then(() => navigate('/', { replace: true })).catch(() => { setLeaving(false); setError('Impossibile uscire dalla lobby.') }) }}>{leaving ? 'Uscita…' : 'Esci dalla partita'}</button>}
    {game.status === 'ACTIVE' && <Link className="button secondary" to="/">Dashboard</Link>}
  </section>
}
