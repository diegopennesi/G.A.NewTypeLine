import { useEffect, useState } from 'react'
import { unitCards } from '../data/unitCards'
import type { Game } from '../models/game'
import { tacticsCards } from '../data/tacticsCards'
import { playTacticsCard, revertTacticsCard, watchTacticsPlays } from '../services/tacticsService'
import { moveTimelineUnit } from '../services/lobbyService'

const slots = Array.from({ length: 10 }, (_, index) => index + 1)

export function ManualTimeline({ game, playerId, deck }: { game: Game; playerId: string; deck: string[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [selectedTactic, setSelectedTactic] = useState<string | null>(null)
  const [shownMarker, setShownMarker] = useState<string | null>(null)
  const [playsByPlayer, setPlaysByPlayer] = useState<Record<string, { order: string[]; slots: Record<string, number> }>>({})
  useEffect(() => {
    const stop = [game.playerOneId, game.playerTwoId].flatMap(uid => uid ? [
      watchTacticsPlays(game.code, uid, plays => {
        setPlaysByPlayer(previous => ({ ...previous, [uid]: plays ?? { order: [], slots: {} } }))
      }, () => setError('Impossibile caricare le Tactics Card giocate.'))
    ] : [])
    return () => stop.forEach(unsubscribe => unsubscribe())
  }, [game.code, game.playerOneId, game.playerTwoId])

  const ownPlays = playsByPlayer[playerId]
  const lastPlay = ownPlays?.order.at(-1)
  const availableCards = tacticsCards.filter(card => deck.includes(card.id) && !ownPlays?.order.includes(card.id))
  const tactic = availableCards.find(card => card.id === selectedTactic)
  const teams = [
    { playerId: game.playerOneId, team: game.playerOneTeam, squad: game.playerOneSquad, positions: game.playerOneTimeline },
    { playerId: game.playerTwoId, team: game.playerTwoTeam, squad: game.playerTwoSquad, positions: game.playerTwoTimeline },
  ]
  const units = teams.flatMap(team => team.squad.flatMap(id => {
    const unit = unitCards.find(candidate => candidate.id === id)
    return unit ? [{ ...unit, team: team.team, own: team.playerId === playerId, position: team.positions?.[id] ?? unit.startingTimeline }] : []
  }))
  const selected = units.find(unit => unit.own && unit.id === selectedId)

  const markers = teams.flatMap(team => {
    const plays = team.playerId ? playsByPlayer[team.playerId] : undefined
    return plays?.order.flatMap(id => {
      const card = tacticsCards.find(candidate => candidate.id === id)
      return card ? [{ ...card, key: `${team.playerId}/${id}`, team: team.team, slot: plays.slots[id] }] : []
    }) ?? []
  })
  const revealed = markers.find(marker => marker.key === shownMarker)

  async function updateTactics(action: () => Promise<void>, message: string) {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      await action()
      setSelectedTactic(null)
      setNotice(message)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossibile aggiornare la Timeline.')
    } finally {
      setSaving(false)
    }
  }

  async function move(to: number) {
    if (!selected || saving) return
    setSaving(true)
    setError(null)
    try {
      await moveTimelineUnit(game.code, playerId, selected.id, selected.position, to)
      setNotice(`${selected.name} spostato su TL ${to}.`)
      setSelectedId(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossibile spostare l’unità.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="manual-timeline" aria-labelledby="manual-timeline-title">
    <h2 id="manual-timeline-title">Timeline</h2>
    <div className="timeline-instructions">
      <p aria-live="polite">{saving ? 'Salvataggio…' : tactic ? `${tactic.name}. Scegli la casella TL.` : selected ? `${selected.name} · TL ${selected.position}. Scegli la destinazione.` : notice || 'Tocca una tua Unit Card, poi scegli di quanti TL spostarla.'}</p>
      {(selected || tactic) && <button type="button" disabled={saving} onClick={() => { setSelectedId(null); setSelectedTactic(null) }}>Annulla</button>}
    </div>
    {error && <p className="message error" role="alert">{error}</p>}
    <div className="timeline-scroll" role="region" aria-label="Caselle Timeline" tabIndex={0}>
      <ol className="timeline-grid">
        {slots.map(slot => {
          const delta = selected ? slot - selected.position : 0
          const deltaLabel = delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`
          return <li className="timeline-slot" key={slot}>
            {tactic ? <button className="timeline-destination" type="button" disabled={saving}
              aria-label={`Gioca ${tactic.name} su TL ${slot}`}
              onClick={() => void updateTactics(() => playTacticsCard(game.code, playerId, tactic.id, slot), `${tactic.name} giocata su TL ${slot}.`)}>
              <span>{slot}</span><strong>Gioca qui</strong>
            </button> : selected && delta !== 0
              ? <button className="timeline-destination" type="button" disabled={saving} aria-label={`Sposta di ${deltaLabel} TL, a TL ${slot}`} onClick={() => void move(slot)}><span>{slot}</span><strong>{deltaLabel} TL</strong></button>
              : <span className="timeline-slot-number">{slot}</span>}
            {markers.some(marker => marker.slot === slot) && <div className="tactics-markers">
              {markers.filter(marker => marker.slot === slot).map(marker => <button key={marker.key} type="button"
                className={`tactics-marker timeline-unit-${marker.team === 'RED' ? 'red' : 'blue'}`}
                aria-label={`Leggi ${marker.name}, TL ${slot}`} aria-pressed={shownMarker === marker.key}
                onClick={() => setShownMarker(shownMarker === marker.key ? null : marker.key)} />)}
            </div>}
            {units.filter(unit => unit.position === slot).map(unit => {
              const className = `timeline-unit timeline-unit-${unit.team === 'RED' ? 'red' : 'blue'}`
              return unit.own
                ? <button className={className} type="button" key={`own-${unit.id}`} disabled={saving} aria-pressed={selectedId === unit.id} onClick={() => { setError(null); setNotice(''); setSelectedTactic(null); setSelectedId(selectedId === unit.id ? null : unit.id) }}>{unit.name}</button>
                : <span className={className} key={`other-${unit.id}`}>{unit.name}</span>
            })}
          </li>
        })}
      </ol>
    </div>
    {revealed && <div className="tactics-revealed" aria-live="polite">
      <strong>{revealed.name} · TL {revealed.slot}</strong>
      <p>{revealed.text}</p>
    </div>}
    {deck.length > 0 && <section className="tactics-hand" aria-labelledby="tactics-hand-title">
      <h3 id="tactics-hand-title">Il tuo mazzo tattico · {availableCards.length}/{deck.length}</h3>
      <div className="tactics-controls">
        {availableCards.map(card => <button key={card.id} type="button" className="button secondary"
          aria-pressed={selectedTactic === card.id} disabled={saving || !ownPlays}
          onClick={() => { setSelectedId(null); setError(null); setNotice(''); setSelectedTactic(selectedTactic === card.id ? null : card.id) }}>
          {card.name}
        </button>)}
        <button type="button" className="button secondary" disabled={saving || !lastPlay}
          aria-label="Revert, annulla l’ultima Tactics Card giocata"
          onClick={() => lastPlay && void updateTactics(() => revertTacticsCard(game.code, playerId, lastPlay), 'Ultima Tactics Card rimessa nel mazzo.')}>
          Revert
        </button>
      </div>
      {tactic && <p>{tactic.text}</p>}
    </section>}
  </section>
}
