import { motion, useReducedMotion } from 'motion/react'
import { CardArtwork } from '../components/CardArtwork'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { findUnitCard } from '../data/unitCards'
import { allTacticsCards, canPlayTacticsCard, reactionTimings, type ReactionTiming, type TacticsCard } from '../data/tacticsCards'
import { activationQueue, initialActivation, nextActivation, roundPhase, roundSlot, type TimelineAction } from '../models/activation'
import { matchResultLabels, type Game, type MatchResult } from '../models/game'
import { changeActivation, finishMatch } from '../services/activationService'
import { drawnTacticsCards, playTacticsCard, type TacticsDeck, revertTacticsCard, watchTacticsPlays, type TacticsPlays } from '../services/tacticsService'

const slots = Array.from({ length: 10 }, (_, index) => index + 1)

export function ManualTimeline({ game, playerId, deck, phase }: { game: Game; playerId: string; deck: TacticsDeck; phase: number }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [delta, setDelta] = useState('')
  const drag = useRef<{ x: number; y: number; id: number } | null>(null)
  const reducedMotion = useReducedMotion()
  const [layout, setLayout] = useState<'grid' | 'wheel'>('grid')
  const [wheelTime, setWheelTime] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<number | null>(null)
  const [reactionTiming, setReactionTiming] = useState<ReactionTiming>('beforeRoll')
  const [effectDelta, setEffectDelta] = useState('')
  const [targetKey, setTargetKey] = useState('')
  const [selectedTactic, setSelectedTactic] = useState<string | null>(null)
  const [shownMarker, setShownMarker] = useState<string | null>(null)
  const [result, setResult] = useState<MatchResult | ''>('')
  const finishDialog = useRef<HTMLDialogElement>(null)
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
  const weapons = findUnitCard(activeUnit?.id)?.stats?.weapons ?? []
  const completed = !current && next.time > 20
  const round = current?.time ?? next.time
  const team = (side: 'one' | 'two') => side === 'one' ? game.playerOneTeam : game.playerTwoTeam
  const label = (id?: string) => {
    const card = findUnitCard(id)
    return card?.name === 'Gundam' ? `Gundam · ${card.id}` : card?.name ?? 'MS'
  }
  const target = state.units.find(unit => unit.key === targetKey)
  const ownPlays = playsByPlayer[playerId]
  const lastPlay = ownPlays?.order.at(-1)
  const playedThisTurn = !!current && Object.values(ownPlays?.activationIds ?? {}).includes(current.id)
  const drawn = drawnTacticsCards(deck, game, playerId)
  const availableCards = allTacticsCards.filter(card => drawn.includes(card.id) && !ownPlays?.order.includes(card.id))
  const playable = (card: TacticsCard) => !!current && !!activeUnit && !playedThisTurn &&
    canPlayTacticsCard(card, ownTurn, current.paid, state.reaction, activeUnit.id,
      seat === 'one' ? game.playerOneSquad : game.playerTwoSquad)
  const tactic = availableCards.find(card => card.id === selectedTactic)
  const markers = [game.playerOneId, game.playerTwoId].flatMap((uid, index) => {
    const plays = uid ? playsByPlayer[uid] : undefined
    return plays?.order.flatMap(id => {
      const card = allTacticsCards.find(candidate => candidate.id === id)
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

  const canPay = ownTurn && !!current && !current.paid && !saving && !state.reaction
  const costTo = (time: number) => time - (activeUnit?.time ?? time)
  const canLand = (time: number) => canPay && costTo(time) >= 1 && costTo(time) <= 20

  function payTo(time: number) {
    if (canLand(time)) update({ kind: 'pay', delta: costTo(time) }, 'Costo TL applicato.')
  }

  function dropTime(event: PointerEvent<HTMLElement>) {
    return Number(document.elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-timeline-time]')?.dataset.timelineTime)
  }

  function startDrag(event: PointerEvent<HTMLElement>) {
    if (!event.isPrimary || event.button !== 0) return
    drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveDrag(event: PointerEvent<HTMLElement>) {
    const start = drag.current
    if (start?.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) < 6) return
    const scroll = event.currentTarget.closest('.timeline-scroll')
    if (scroll) {
      const bounds = scroll.getBoundingClientRect()
      if (event.clientX > bounds.right - 24) scroll.scrollLeft += 16
      if (event.clientX < bounds.left + 24) scroll.scrollLeft -= 16
    }
    const time = dropTime(event)
    setDropTarget(canLand(time) ? time : null)
  }

  function finishDrag(event: PointerEvent<HTMLElement>, commit: boolean) {
    const start = drag.current
    if (start?.id !== event.pointerId) return
    drag.current = null
    setDropTarget(null)
    if (commit && Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 6) payTo(dropTime(event))
  }

  function rollInitiative() {
    const roll = () => 1 + Math.floor(Math.random() * 10)
    const one = roll()
    let two = roll()
    while (two === one) two = roll()
    update({ kind: 'initiative', one, two }, `Spareggio: ${game.playerOneName} ${one} · ${game.playerTwoName} ${two}.`)
  }

  const phaseSlots = slots.map(slot => {
    const time = (phase - 1) * 10 + slot
    return {
      slot, time, slotUnits: state.units.filter(unit => unit.time === time),
      slotMarkers: markers.filter(marker => marker.phase === phase && marker.slot === slot),
    }
  })
  const wheelSlot = phaseSlots.find(item => item.time === wheelTime) ??
    phaseSlots.find(item => item.time === round) ?? phaseSlots[0]

  function startUnit(key: string) {
    setDelta('')
    update({ kind: 'start', key }, 'Attivazione iniziata.')
  }

  function renderSlot({ slot, time, slotUnits, slotMarkers }: (typeof phaseSlots)[number]) {
    return <>
    {canLand(time)
      ? <button type="button" className="timeline-destination" aria-label={`Sposta a TL ${slot}, fase ${phase}, +${costTo(time)} TL`}
          onClick={() => payTo(time)}><span>{slot}</span><strong>+{costTo(time)} TL</strong></button>
      : <span className="timeline-slot-number">{slot}</span>}
    {slotMarkers.length > 0 && <div className="tactics-markers">
      {slotMarkers.map(marker => <button key={marker.key} type="button"
        className={`tactics-marker timeline-unit-${marker.team === 'RED' ? 'red' : 'blue'}`}
        aria-label={`Leggi ${marker.name}, TL ${slot}`} aria-pressed={shownMarker === marker.key}
        onClick={() => setShownMarker(shownMarker === marker.key ? null : marker.key)} />)}
    </div>}
    {slotUnits.map(unit => {
      const className = `timeline-unit timeline-unit-${team(unit.seat) === 'RED' ? 'red' : 'blue'}`
      const layoutId = layout === 'grid' && !reducedMotion ? `${game.code}/${phase}/${unit.key}` : undefined
      const transition = { layout: { type: 'spring', stiffness: 430, damping: 35 } } as const
      const text = <><CardArtwork cardId={unit.id} /><span className="timeline-unit-label">{label(unit.id)}{unit.reserve && <small>Riserva</small>}</span></>
      if (canPay && unit.key === current?.key) {
        return <motion.span layoutId={layoutId} transition={transition} className={`${className} timeline-drag-unit`} key={unit.key}
          onPointerDown={startDrag} onPointerMove={moveDrag}
          onPointerUp={event => finishDrag(event, true)}
          onPointerCancel={event => finishDrag(event, false)}
          onLostPointerCapture={event => finishDrag(event, false)}>{text}</motion.span>
      }
      return !current && !completed && next.unit?.key === unit.key && unit.seat === seat
        ? <motion.button layoutId={layoutId} transition={transition} className={className} type="button" key={unit.key} disabled={saving}
            onClick={() => startUnit(unit.key)}>
            {text}<small>{unit.reserve ? 'Schiera e attiva' : 'Attiva'}</small>
          </motion.button>
        : <motion.span layoutId={layoutId} transition={transition} className={className} key={unit.key}>{text}</motion.span>
    })}
    </>
  }

  const turnUnit = current ? activeUnit : next.unit
  const turnTeam = turnUnit ? team(turnUnit.seat) : null
  const turnStatus = completed ? 'Fasi concluse' : current ? 'In attivazione' : next.tie ? 'Spareggio' : 'Prossimo MS'

  return <section className="manual-timeline" aria-labelledby="manual-timeline-title">
    <h2 id="manual-timeline-title">Timeline</h2>
    <div className="timeline-instructions timeline-hud" data-team={turnTeam}>
      <div className="timeline-hud-readout" aria-live="polite">
        {!completed && turnUnit && <CardArtwork key={turnUnit.key} cardId={turnUnit.id} />}
        <div className="timeline-hud-unit" key={`${turnUnit?.key ?? 'no-unit'}/${turnStatus}`}>
          <span className="timeline-hud-status"><i aria-hidden="true" />{turnStatus}</span>
          {turnUnit && !completed && <strong>{label(turnUnit.id)}</strong>}
          {!completed && turnTeam && <span>{turnUnit?.seat === seat ? 'Tuo turno' : 'Turno avversario'} · {turnTeam === 'RED' ? 'Rosso' : 'Blu'}</span>}
        </div>
        {!completed && <div className="timeline-hud-position">
          <span>Fase <b>{roundPhase(round)}</b></span>
          <span>TL <b>{roundSlot(round)}</b></span>
        </div>}
      </div>
      {!current && next.tie && !completed && <button type="button" disabled={saving} onClick={rollInitiative}>Tira i dadi</button>}
      {!current && !completed && turnUnit?.seat === seat && <button type="button" disabled={saving}
        onClick={() => startUnit(turnUnit.key)}>
        {turnUnit.reserve ? 'Schiera e attiva' : 'Attiva'}
      </button>}
      {completed && <button className="button" type="button" onClick={() => finishDialog.current?.showModal()}>Concludi partita</button>}
      {saving && <small role="status">Salvataggio…</small>}
    </div>
    {completed && <dialog ref={finishDialog} className="finish-match-dialog" aria-labelledby="finish-match-title">
      <h3 id="finish-match-title">Concludere la partita?</h3>
      <p>L’esito sarà visibile a entrambi i giocatori.</p>
      <fieldset disabled={saving}>
        <legend>Esito della partita</legend>
        {(Object.keys(matchResultLabels) as MatchResult[]).map(option => <label key={option} className="match-result-option">
          <input type="radio" name="match-result" checked={result === option} onChange={() => setResult(option)} />
          {matchResultLabels[option]}
        </label>)}
      </fieldset>
      <div className="tactics-controls">
        <button type="button" className="button secondary" autoFocus disabled={saving}
          onClick={() => finishDialog.current?.close()}>Annulla</button>
        <button type="button" className="button" disabled={saving || !result}
          onClick={() => result && void run(async () => {
            await finishMatch(game.code, playerId, result)
            finishDialog.current?.close()
          }, 'Partita conclusa.')}>{saving ? 'Salvataggio…' : 'Conferma conclusione'}</button>
      </div>
      {error && <p className="message error" role="alert">{error}</p>}
    </dialog>}
    {notice && <p role="status">{notice}</p>}
    {error && <p className="message error" role="alert">{error}</p>}
    <div className="timeline-layout-switch" role="group" aria-label="Visualizzazione Timeline">
      <button type="button" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}>Griglia</button>
      <button type="button" aria-pressed={layout === 'wheel'} onClick={() => setLayout('wheel')}>Circolare</button>
    </div>
    {layout === 'grid' ? <motion.div layoutScroll className="timeline-scroll" role="region" aria-label={`Caselle Timeline · fase ${phase}`} tabIndex={0}>
      {[phaseSlots.slice(0, 5), phaseSlots.slice(5)].map(row =>
        <ol key={row[0].slot} start={row[0].slot} className="timeline-grid"
          style={{ '--timeline-mobile-columns': row.map(item => item.slotUnits.length > 0
            ? 'minmax(44px, 1fr)' : 'minmax(44px, .42fr)').join(' ') } as CSSProperties}>
          {row.map(item => <li className="timeline-slot" key={item.slot} data-empty={item.slotUnits.length === 0 || undefined}
            data-timeline-time={item.time} data-drop-target={dropTarget === item.time || undefined}
            aria-current={item.time === round ? 'step' : undefined}>{renderSlot(item)}</li>)}
        </ol>)}
    </motion.div> : <div className="timeline-wheel-view">
      <div className="timeline-wheel" role="group" aria-label={`Timeline circolare · fase ${phase}`}>
        {phaseSlots.map(item => {
          const angle = (item.slot - 1) * Math.PI / 5
          const point = (a: number, radius: number) => `${50 + Math.sin(a) * radius}% ${50 - Math.cos(a) * radius}%`
          const wedge = `polygon(50% 50%, ${point(angle - Math.PI / 10, 85)}, ${point(angle + Math.PI / 10, 85)})`
          const red = item.slotUnits.some(unit => team(unit.seat) === 'RED')
          const blue = item.slotUnits.some(unit => team(unit.seat) === 'BLUE')
          return <button type="button" key={item.slot} className="timeline-wheel-sector"
            aria-label={`TL ${item.slot}, ${item.slotUnits.length} MS, ${item.slotMarkers.length} carte giocate`}
            aria-pressed={item.time === wheelSlot.time} aria-current={item.time === round ? 'step' : undefined}
            data-timeline-time={item.time} data-drop-target={dropTarget === item.time || undefined}
            onClick={() => setWheelTime(item.time)}
            style={{ clipPath: wedge, '--sector-x': `${50 + Math.sin(angle) * 35}%`,
              '--sector-y': `${50 - Math.cos(angle) * 35}%` } as CSSProperties}>
            <span className="timeline-wheel-label">{item.slot}
              <small aria-hidden="true">
                {red && <i className="timeline-unit-red" />}
                {blue && <i className="timeline-unit-blue" />}
                {item.slotMarkers.length > 0 && <i className="timeline-wheel-marker" />}
              </small>
            </span>
          </button>
        })}
      </div>
      <div className="timeline-wheel-details timeline-slot" aria-label={`Unità e carte a TL ${wheelSlot.slot}`}>
        {renderSlot(wheelSlot)}
        {wheelSlot.slotUnits.length === 0 && wheelSlot.slotMarkers.length === 0 && !canLand(wheelSlot.time) &&
          <p>Nessuna unità o carta su questa TL.</p>}
      </div>
    </div>}
    {current && <div className="timeline-action-controls">
      {state.reaction ? <>
        <p role="status">Reazione aperta · {reactionTimings[state.reaction]}</p>
        {!ownTurn && <button className="button" type="button" disabled={saving}
          onClick={() => update({ kind: 'closeReaction' }, 'Finestra di reazione chiusa.')}>
          {playedThisTurn ? 'Concludi reazione' : 'Passa'}
        </button>}
      </> : ownTurn && <form onSubmit={event => {
        event.preventDefault()
        update({ kind: 'openReaction', timing: reactionTiming }, 'Finestra di reazione aperta.')
      }}>
        <label>Momento della reazione <select value={reactionTiming}
          onChange={event => setReactionTiming(event.target.value as ReactionTiming)}>
          {Object.entries(reactionTimings).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select></label>
        <button className="button secondary" type="submit" disabled={saving}>Apri reazione</button>
      </form>}
    </div>}
    {ownTurn && current && !state.reaction && <div className="timeline-action-controls">
      {!current.paid && weapons.length > 0 && <div className="tactics-controls" role="group" aria-label="Costo TL delle armi">
        {weapons.map(weapon => <button key={weapon.name} type="button" className="button secondary" disabled={saving}
          onClick={() => setDelta(String(weapon.timelineCost))}>
          {weapon.name} · {weapon.timelineCost} TL
        </button>)}
      </div>}
      {!current.paid && <p>Scegli la TL di destinazione o trascina il MS sulla casella. Puoi cambiare fase accanto al codice partita.</p>}
      {current.paid ? <button className="button" type="button" disabled={saving}
        onClick={() => update({ kind: 'end' }, 'Attivazione conclusa.')}>Termina attivazione</button>
        : <form onSubmit={event => { event.preventDefault(); update({ kind: 'pay', delta: Number(delta) }, 'Costo TL applicato.') }}>
          <label>Costo azione in TL <input type="number" min={1} max={20} required value={delta} onChange={event => setDelta(event.target.value)} /></label>
          <button className="button" type="submit" disabled={saving || !delta}>Paga TL</button>
        </form>}
    </div>}
    {!completed && !state.reaction && <details className="timeline-action-controls">
      <summary>Effetti sulla Timeline</summary>
      <label>MS bersaglio <select value={targetKey} onChange={event => setTargetKey(event.target.value)}>
        <option value="">Scegli un MS</option>
        {activationQueue(state).map(unit => <option key={unit.key} value={unit.key}>
          {label(unit.id)} · {team(unit.seat) === 'RED' ? 'Rosso' : 'Blu'} · Fase {roundPhase(unit.time)}, TL {roundSlot(unit.time)}{unit.reserve ? ' · In riserva' : ''}
        </option>)}
      </select></label>
      {target && <>
        {target.reserve && <p className="lead" role="status">Questo MS è in riserva. Verrà schierato alla sua prossima attivazione.</p>}
        <button className="button secondary" type="button" disabled={saving || target.reserve}
          onClick={() => update({ kind: 'defeat', key: target.key }, 'MS in Riserva · +2 TL.')}>Distrutto (+2 TL)</button>
        <form onSubmit={event => { event.preventDefault(); update({ kind: 'effect', key: target.key, delta: effectAmount }, 'Spostamento da effetto applicato.') }}>
          <label>Spostamento in TL <input type="number" min={-20} max={20} required value={effectDelta} onChange={event => setEffectDelta(event.target.value)} /></label>
          <button className="button secondary" type="submit" disabled={saving || !canApplyEffect}>Applica effetto</button>
        </form>
      </>}
    </details>}
    {revealed && <div className="tactics-revealed tactics-illustrated" aria-live="polite">
      <CardArtwork cardId={revealed.id} />
      <strong>{revealed.name} · Fase {revealed.phase}, TL {revealed.slot}</strong>
      <p>{revealed.text}</p>
    </div>}
    {deck.cards.length > 0 && <section className="tactics-hand" aria-labelledby="tactics-hand-title">
      <h3 id="tactics-hand-title">{deck.randomized ? 'Tactics Card pescate' : 'Il tuo mazzo tattico'} · {availableCards.length}/{drawn.length}</h3>
      <div className="tactics-controls">
        {availableCards.map(card => <button key={card.id} type="button" className="button secondary tactics-illustrated"
          aria-pressed={selectedTactic === card.id} disabled={saving || !ownPlays || !playable(card)}
          onClick={() => setSelectedTactic(selectedTactic === card.id ? null : card.id)}>
          <CardArtwork cardId={card.id} />
          <span>{card.name}{card.response ? ' · Response' : card.cost ? ` · ${card.cost} TL` : ''}</span>
        </button>)}
        <button type="button" className="button revert-button" disabled={saving || !lastPlay}
          aria-label="Revert, annulla l’ultima Tactics Card giocata"
          onClick={() => lastPlay && void run(() => revertTacticsCard(game.code, playerId, lastPlay), 'Ultima Tactics Card rimessa nel mazzo.')}>
          Revert
        </button>
      </div>
      {tactic && current && playable(tactic) && <div className="tactics-revealed tactics-illustrated">
        <CardArtwork cardId={tactic.id} />
        <p>{tactic.text}</p>
        <button className="button" type="button" disabled={saving}
          onClick={() => void run(async () => {
            await playTacticsCard(game.code, playerId, tactic.id, roundSlot(current.time), current.id)
            if (tactic.cost) setDelta(String(tactic.cost))
          }, tactic.cost ? `Tactics Card giocata. Conferma il costo di ${tactic.cost} TL.` : 'Tactics Card giocata.')}>
          {tactic.response ? 'Conferma innesco e gioca' : 'Gioca'} · TL {roundSlot(current.time)}
        </button>
      </div>}
    </section>}
  </section>
}
