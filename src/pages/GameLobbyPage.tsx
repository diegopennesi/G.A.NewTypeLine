import { MatchPlayers } from './MatchPlayers'
import { DefeatLog } from './DefeatLog'
import { VictoryBoard } from './VictoryBoard'
import { unitSelectionRows } from '../data/cardSelectionRows'
import { LobbyPresetPicker } from './LobbyPresetPicker'
import { CardSelectionList } from '../components/CardSelectionList'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { initialActivation, nextActivation, roundPhase } from '../models/activation'
import { matchResultLabels, type Game } from '../models/game'
import { formatMatchTime, matchActivity } from '../models/matchActivity'
import { useMatchClock } from '../features/useMatchClock'
import { useAuth } from '../features/auth/useAuth'
import { leaveLobby, setReady, subscribeToLobby } from '../services/lobbyService'
import { useNavigate } from 'react-router-dom'
import { ManualTimeline } from './ManualTimeline'
import { TacticsDeckPicker } from './TacticsDeckPicker'
import { tacticsDeckSize } from '../data/tacticsCards'
import { saveTacticsDeck, watchTacticsDeck, type TacticsDeck } from '../services/tacticsService'
import './GameLobbyPage.css'

export function GameLobbyPage() {
  const { gameCode = '' } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [preparation, setPreparation] = useState<'preset' | 'manual'>('preset')
  const [appliedPreset, setAppliedPreset] = useState(0)
  const [presetNotice, setPresetNotice] = useState('')
  const [phaseView, setPhaseView] = useState<{ code: string; phase: number } | null>(null)
  const [game, setGame] = useState<Game | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [ready, setReadyState] = useState(false)
  const [presetIds, setPresetIds] = useState<{ squad: string; deck: string }>()
  const [selection, setSelection] = useState<string[]>([])

  useEffect(() => {
    let previousStatus: Game['status'] | undefined
    return subscribeToLobby(gameCode, next => {
      setGame(next)
      if (!next) { setError('Questa lobby non esiste più.'); return }
      const one = next.playerOneId === user?.uid
      if (one ? next.playerOneReady : next.playerTwoReady) {
        setSelection((one ? next.playerOneSquad : next.playerTwoSquad) ?? [])
      }
      if (previousStatus === 'SETUP' && next.status === 'WAITING') {
        setSelection([])
        setPresetIds(undefined)
        setPresetNotice('')
        setReadyState(false)
      }
      previousStatus = next.status
    }, reason => setError(reason.message))
  }, [gameCode, user?.uid])

  const activity = game ? matchActivity(game) : null
  const deadline = activity?.expiresAt ?? null
  const now = useMatchClock(deadline)
  const expired = deadline !== null && now >= deadline

  const playerId = user?.uid
  const participant = game && (game.playerOneId === playerId || game.playerTwoId === playerId)
  const deckKey = !expired && participant && playerId && game.code === gameCode ? `${gameCode}/${playerId}` : null
  const [savedDeck, setSavedDeck] = useState<{ key: string; deck: TacticsDeck } | null>(null)
  useEffect(() => {
    if (!deckKey || !playerId) return
    return watchTacticsDeck(gameCode, playerId,
      deck => setSavedDeck({ key: deckKey, deck }),
      () => setError('Impossibile caricare il mazzo tattico.'))
  }, [deckKey, gameCode, playerId])
  const deck = savedDeck?.key === deckKey ? savedDeck?.deck : undefined

  if (error && !game) return <p className="message error">{error} <Link to="/">Dashboard</Link></p>
  if (!game) return <p>Caricamento della lobby…</p>
  const belongsToPlayer = user && (game.playerOneId === user.uid || game.playerTwoId === user.uid)
  if (game.status === 'FINISHED') return <section className="lobby-page">
    <h1>{belongsToPlayer && game.result ? 'Partita conclusa' : 'Partita chiusa'}</h1>
    {belongsToPlayer && game.result && <section className="operation-panel" aria-labelledby="match-result-title">
      <h2 id="match-result-title">{matchResultLabels[game.result]}</h2>
      <p>Partita {game.code} · {game.matchSize}</p>
      <DefeatLog game={game} />
      {game.victory && <VictoryBoard game={game} playerId={user.uid} readOnly />}
      {game.finishedAt && <p>Conclusa il {formatMatchTime(game.finishedAt.toMillis())}</p>}
    </section>}
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
  const activation = game.status === 'ACTIVE' ? game.activation ?? initialActivation(game) : null
  const currentPhase = activation ? Math.min(2, roundPhase(activation.current?.time ?? nextActivation(activation).time)) : 1
  const phase = phaseView?.code === game.code ? phaseView.phase : currentPhase

  if (!isParticipant) return <section className={game.status === 'ACTIVE' ? 'lobby-page lobby-page-active' : 'lobby-page'}><p className="eyebrow">Lobby privata</p><h1>Inserisci il codice per entrare.</h1><p className="lead">Per partecipare devi usare il codice della lobby o il suo QR di invito.</p><Link className="button secondary inline-button" to="/lobby/join">Inserisci un codice</Link></section>

  return <section className={game.status === 'ACTIVE' ? 'lobby-page lobby-page-active' : 'lobby-page'}>
    {error && <p className="message error" role="alert">{error}</p>}
    <header className="operation-heading">
    <h1>{waitingForPlayer ? 'In attesa del Giocatore 2' : game.status === 'ACTIVE' ? 'Partita avviata' : 'Preparate le vostre squadre'}</h1>
    <div className="match-header">
      <div className="share-code"><span>Codice partita</span><strong>{game.code}</strong></div>
      {user && <MatchPlayers game={game} playerId={user.uid} />}
      {activation && <div className="phase-card" role="group" aria-label="Fase Timeline">
        {[1, 2].map(option => <button key={option} type="button" aria-pressed={option === phase}
          onClick={() => setPhaseView(option === currentPhase ? null : { code: game.code, phase: option })}>
          Fase {option}{option === currentPhase && <small>Corrente</small>}
        </button>)}
      </div>}
      {activation && user && <VictoryBoard game={game} playerId={user.uid} />}
    </div>
    </header>
    {activation && <DefeatLog game={game} />}
    {waitingForPlayer ? <p className="lead">Condividi il codice o fai scansionare il QR. La lobby si aggiornerà automaticamente quando l’altro giocatore entrerà.</p> : game.status !== 'ACTIVE' && <p className="lead">Formato {game.matchSize}. I colori sono assegnati casualmente. Scegli le unità e conferma la tua squadra.</p>}
    {isPlayerOne && waitingForPlayer && <section className="invite-card" aria-labelledby="invite-title">
      <div><h2 id="invite-title">Invita il Giocatore 2</h2><p>Può scansionare questo QR dal cellulare oppure aprire il link condivisibile.</p><a className="invite-link" href={inviteUrl}>{inviteUrl}</a></div>
      <div className="qr-code"><QRCodeSVG value={inviteUrl} size={176} level="M" includeMargin title={`QR per entrare nella partita ${game.code}`} /></div>
    </section>}
    {game.status !== 'ACTIVE' && !myReady && user && <div className="lobby-setup-options">
      <div className="tactics-controls" role="group" aria-label="Preparazione partita">
        <button type="button" className="button secondary" aria-pressed={preparation === 'preset'}
          disabled={ready} onClick={() => setPreparation('preset')}>Seleziona un preset</button>
        <button type="button" className="button secondary" aria-pressed={preparation === 'manual'}
          disabled={ready} onClick={() => setPreparation('manual')}>Componi manualmente</button>
      </div>
      {preparation === 'preset' && <LobbyPresetPicker key={deckKey} code={game.code} playerId={user.uid} size={squadSize} busy={ready || !deck}
        onUse={(squad, savedCards) => {
          setError(null)
          setReadyState(true)
          setPresetNotice('')
          void saveTacticsDeck(game.code, user.uid, savedCards.cards, deck?.randomized)
            .then(() => { setSelection(squad.cards); setPresetIds({ squad: squad.id, deck: savedCards.id }); setAppliedPreset(value => value + 1); setPresetNotice('Squadra e mazzo applicati.') })
            .catch(() => setError('Impossibile applicare il preset. Riprova.'))
            .finally(() => setReadyState(false))
        }} />}
      {presetNotice && <p role="status">{presetNotice}</p>}
    </div>}
    {game.status !== 'ACTIVE' && <div className="lobby-preparation" hidden={preparation === 'preset' || myReady}>
    <section className="squad-picker">
      <h2>Componi la tua squadra · {selection.length}/{squadSize}</h2>
      <CardSelectionList label="Cerca Unit Card"
        rows={unitSelectionRows}
        selected={selection} limit={squadSize} disabled={myReady || ready}
        onToggle={id => setSelection(current => current.includes(id)
          ? current.filter(cardId => cardId !== id) : current.length < squadSize ? [...current, id] : current)} />
    </section>
    {(waitingForPlayer || game.status === 'SETUP') && user && deck && <TacticsDeckPicker key={`${deckKey}/${appliedPreset}`} code={game.code} playerId={user.uid} deck={deck} locked={myReady || ready} />}
    </div>}
    {!waitingForPlayer && game.status !== 'ACTIVE' && <button className="button" disabled={ready || (!myReady && deck?.cards.length !== tacticsDeckSize) || (myReady && !game.playerOneReady) || (myReady && !game.playerTwoReady) || selection.length !== squadSize} onClick={() => { if (!user) return; setError(null); setReadyState(true); void setReady(game.code, user.uid, isPlayerOne, selection, presetIds).then(() => setReadyState(false)).catch((reason) => { setReadyState(false); setError(reason instanceof Error ? reason.message : 'Impossibile confermare.') }) }}>{ready ? 'Conferma…' : myReady ? (game.playerOneReady && game.playerTwoReady ? 'Avvia partita' : 'Pronto · in attesa') : selection.length !== squadSize ? `Scegli ${squadSize} Unit Card` : deck?.cards.length !== tacticsDeckSize ? 'Salva il mazzo tattico' : 'Sono pronto'}</button>}
    {game.status === 'ACTIVE' && user && <ManualTimeline key={game.code} game={game} playerId={user.uid} deck={deck ?? { cards: [], randomized: false }} phase={phase} />}
    {game.status !== 'ACTIVE' && <button className="button secondary" disabled={leaving} onClick={() => { if (!user) return; setLeaving(true); void leaveLobby(game.code, user.uid).then(() => navigate('/', { replace: true })).catch(() => { setLeaving(false); setError('Impossibile uscire dalla lobby.') }) }}>{leaving ? 'Uscita…' : 'Esci dalla partita'}</button>}
    {game.status === 'ACTIVE' && <Link className="button secondary" to="/">Dashboard</Link>}
  </section>
}
