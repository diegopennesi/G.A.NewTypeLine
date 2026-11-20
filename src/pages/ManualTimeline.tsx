import { useEffect, useState } from 'react'
import { unitCards } from '../data/unitCards'
import { tacticsCards } from '../data/tacticsCards'
import { initialActivation, nextActivation, roundPhase, roundSlot, type TimelineAction } from '../models/activation'
import type { Game } from '../models/game'
import { changeActivation } from '../services/activationService'
import { playTacticsCard, revertTacticsCard, watchTacticsPlays, type TacticsPlays } from '../services/tacticsService'

const slots = Array.from({ length: 10 }, (_, index) => index + 1)

export function ManualTimeline({ game, playerId, deck }: { game: Game; playerId: string; deck: string[] }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [delta, setDelta] = useState('')
  const [effectDelta, setEffectDelta] = useState('')
  const [targetKey, setTargetKey] = useState('')
  const [selectedTactic, setSelectedTactic] = useState<string | null>(null)
  const [shownMarker, setShownMarker] = useState<string | null>(null)
  const [viewPhase, setViewPhase] = useState<number | null>(null)
  const [playsByPlayer, setPlaysByPlayer] = useState<Record<string, TacticsPlays>>({})
  useEffect(() => {
    const stop = [game.playerOneId, game.playerTwoId].flatMap(uid => uid ? [
      watchTacticsPlays(game.code, uid, plays => {
        setPlaysByPlayer(previous => ({ ...previous, [uid]: plays ?? { order: [], slots: {} } }))
      }, () => setError('Impossibile caricare le Tactics Card giocate.'))
    ] : [])
    return () => stop.forEach(unsubscribe => unsubscribe())
  }, [game.code, game.playerOneId, game.playerTwoId])

  const state = game.activation ?? initialActivation(game)
  const next = nextActivation(state)
  const current = state.current
  const seat = game.playerOneId === playerId ? 'one' : 'two'
  const activeUnit = state.units.find(unit => unit.key === current?.key)
  const ownTurn = activeUnit?.seat === seat
  const completed = !current && next.time > 20
  const round = current?.time ?? next.time
  const phase = viewPhase ?? (completed ? 2 : roundPhase(round))
  const team = (side: 'one' | 'two') => side === 'one' ? game.playerOneTeam : game.playerTwoTeam
  const label = (id?: string) => unitCards.find(card => card.id === id)?.name ?? 'MS'
  const target = state.units.find(unit => unit.key === targetKey)
  const ownPlays = playsByPlayer[playerId]
  const lastPlay = ownPlays?.order.at(-1)
  const playedThisTurn = !!current && Object.values(ownPlays?.activationIds ?? {}).includes(current.id)
  const availableCards = tacticsCards.filter(card => deck.includes(card.id) && !ownPlays?.order.includes(card.id))
  const tactic = availableCards.find(card => card.id === selectedTactic)
  const markers = [game.playerOneId, game.playerTwoId].flatMap((uid, index) => {
    const plays = uid ? playsByPlayer[uid] : undefined
    return plays?.order.flatMap(id => {
      const card = tacticsCards.find(candidate => candidate.id === id)
      return card ? [{ ...card, key: `${uid}/${id}`, team: team(index === 0 ? 'one' : 'two'),
        slot: plays.slots[id], phase: plays.phases?.[id] ?? 1 }] : []
    }) ?? []
  })
  const revealed = markers.find(marker => marker.key === shownMarker)
  const effectAmount = Number(effectDelta)
  const canApplyEffect = target && Number.isInteger(effectAmount) && effectAmount !== 0 &&
    Math.abs(effectAmount) <= 20 && target.time + effectAmount >= round &&
    !(target.key === current?.key && current.paid && target.time + effectAmount <= round)

  async function run(action: () => Promise<unknown>, message: string) {
    if (saving) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await action()
      setNotice(message)
      setSelectedTactic(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossibile aggiornare la Timeline.')
    } finally {
      setSaving(false)
    }
  }

  function update(action: TimelineAction, message: string) {
    void run(() => changeActivation(game.code, playerId, state.version, action), message)
  }

  function rollInitiative() {
    const roll = () => 1 + Math.floor(Math.random() * 10)
    const one = roll()
    let two = roll()
    while (two === one) two = roll()
    update({ kind: 'initiative', one, two }, `Spareggio: ${game.playerOneName} ${one} · ${game.playerTwoName} ${two}.`)
  }

  return <section className="manual-timeline" aria-labelledby="manual-timeline-title">
    <h2 id="manual-timeline-title">Timeline</h2>
    <div className="timeline-instructions">
      <p aria-live="polite">{saving ? 'Salvataggio…' : completed ? 'Fasi concluse.' : current
        ? `In attivazione: ${label(activeUnit?.id)} · Fase ${roundPhase(round)}, TL ${roundSlot(round)}`
        : next.tie ? `Spareggio a TL ${roundSlot(round)}`
        : `Prossimo MS: ${label(next.unit?.id)} · Fase ${roundPhase(round)}, TL ${roundSlot(round)}`}</p>
      {!current && next.tie && !completed && <button type="button" disabled={saving} onClick={rollInitiative}>Tira i dadi</button>}
      <label>Vista <select value={viewPhase ?? ''} onChange={event => setViewPhase(event.target.value ? Number(event.target.value) : null)}>
        <option value="">Fase corrente</option><option value={1}>Fase 1</option><option value={2}>Fase 2</option>
      </select></label>
    </div>
    {notice && <p role="status">{notice}</p>}
    {error && <p className="message error" role="alert">{error}</p>}
    <div className="timeline-scroll" role="region" aria-label={`Caselle Timeline · fase ${phase}`} tabIndex={0}>
      <ol className="timeline-grid">
        {slots.map(slot => {
          const time = (phase - 1) * 10 + slot
          const slotMarkers = markers.filter(marker => marker.phase === phase && marker.slot === slot)
          return <li className="timeline-slot" key={slot} aria-current={time === round ? 'step' : undefined}>
            <span className="timeline-slot-number">{slot}</span>
            {slotMarkers.length > 0 && <div className="tactics-markers">
              {slotMarkers.map(marker => <button key={marker.key} type="button"
                className={`tactics-marker timeline-unit-${marker.team === 'RED' ? 'red' : 'blue'}`}
                aria-label={`Leggi ${marker.name}, TL ${slot}`} aria-pressed={shownMarker === marker.key}
                onClick={() => setShownMarker(shownMarker === marker.key ? null : marker.key)} />)}
            </div>}
            {state.units.filter(unit => unit.time === time).map(unit => {
              const className = `timeline-unit timeline-unit-${team(unit.seat) === 'RED' ? 'red' : 'blue'}`
              return !current && !completed && next.unit?.key === unit.key && unit.seat === seat
                ? <button className={className} type="button" key={unit.key} disabled={saving}
                    onClick={() => { setDelta(''); update({ kind: 'start', key: unit.key }, 'Attivazione iniziata.') }}>
                    {label(unit.id)}<small>Attiva</small>
                  </button>
                : <span className={className} key={unit.key}>{label(unit.id)}</span>
            })}
          </li>
        })}
      </ol>
    </div>
    {ownTurn && current && <div className="timeline-action-controls">
      {current.paid ? <button className="button" type="button" disabled={saving}
        onClick={() => update({ kind: 'end' }, 'Attivazione conclusa.')}>Termina attivazione</button>
        : <form onSubmit={event => { event.preventDefault(); update({ kind: 'pay', delta: Number(delta) }, 'Costo TL applicato.') }}>
          <label>Costo azione in TL <input type="number" min={1} max={20} required value={delta} onChange={event => setDelta(event.target.value)} /></label>
          <button className="button" type="submit" disabled={saving || !delta}>Paga TL</button>
        </form>}
    </div>}
    {!completed && <details className="timeline-action-controls">
      <summary>Effetti sulla Timeline</summary>
      <label>MS bersaglio <select value={targetKey} onChange={event => setTargetKey(event.target.value)}>
        <option value="">Scegli un MS</option>
        {state.units.map(unit => <option key={unit.key} value={unit.key}>
          {label(unit.id)} · {team(unit.seat) === 'RED' ? 'Rosso' : 'Blu'} · Fase {roundPhase(unit.time)}, TL {roundSlot(unit.time)}
        </option>)}
      </select></label>
      {target && <>
        <button className="button secondary" type="button" disabled={saving || target.reserve}
          onClick={() => update({ kind: 'defeat', key: target.key }, 'MS distrutto · +2 TL.')}>Distrutto (+2 TL)</button>
        <form onSubmit={event => { event.preventDefault(); update({ kind: 'effect', key: target.key, delta: effectAmount }, 'Spostamento da effetto applicato.') }}>
          <label>Spostamento in TL <input type="number" min={-20} max={20} required value={effectDelta} onChange={event => setEffectDelta(event.target.value)} /></label>
          <button className="button secondary" type="submit" disabled={saving || !canApplyEffect}>Applica effetto</button>
        </form>
      </>}
    </details>}
    {revealed && <div className="tactics-revealed" aria-live="polite">
      <strong>{revealed.name} · Fase {revealed.phase}, TL {revealed.slot}</strong>
      <p>{revealed.text}</p>
    </div>}
    {deck.length > 0 && <section className="tactics-hand" aria-labelledby="tactics-hand-title">
      <h3 id="tactics-hand-title">Il tuo mazzo tattico · {availableCards.length}/{deck.length}</h3>
      <div className="tactics-controls">
        {availableCards.map(card => <button key={card.id} type="button" className="button secondary"
          aria-pressed={selectedTactic === card.id} disabled={saving || !ownPlays || !current || playedThisTurn || (!ownTurn && !card.response)}
          onClick={() => setSelectedTactic(selectedTactic === card.id ? null : card.id)}>
          {card.name}{card.response ? ' · Response' : ''}
        </button>)}
        <button type="button" className="button revert-button" disabled={saving || !lastPlay}
          aria-label="Revert, annulla l’ultima Tactics Card giocata"
          onClick={() => lastPlay && void run(() => revertTacticsCard(game.code, playerId, lastPlay), 'Ultima Tactics Card rimessa nel mazzo.')}>
          Revert
        </button>
      </div>
      {tactic && current && !playedThisTurn && (ownTurn || tactic.response) && <div className="tactics-revealed">
        <p>{tactic.text}</p>
        <button className="button" type="button" disabled={saving}
          onClick={() => void run(() => playTacticsCard(game.code, playerId, tactic.id, roundSlot(current.time), current.id), 'Tactics Card giocata.')}>
          {tactic.response ? 'Conferma innesco e gioca' : 'Gioca'} · TL {roundSlot(current.time)}
        </button>
      </div>}
    </section>}
  </section>
}
