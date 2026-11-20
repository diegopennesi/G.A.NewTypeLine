import { useState } from 'react'
import { placeholderUnits } from '../data/placeholderUnits'
import type { Game } from '../models/game'
import { moveTimelineUnit } from '../services/lobbyService'

const slots = Array.from({ length: 10 }, (_, index) => index + 1)

export function ManualTimeline({ game, playerId }: { game: Game; playerId: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const teams = [
    { playerId: game.playerOneId, team: game.playerOneTeam, squad: game.playerOneSquad, positions: game.playerOneTimeline },
    { playerId: game.playerTwoId, team: game.playerTwoTeam, squad: game.playerTwoSquad, positions: game.playerTwoTimeline },
  ]
  const units = teams.flatMap(team => team.squad.flatMap(id => {
    const unit = placeholderUnits.find(candidate => candidate.id === id)
    return unit ? [{ ...unit, team: team.team, own: team.playerId === playerId, position: team.positions?.[id] ?? unit.startingTimeline }] : []
  }))
  const selected = units.find(unit => unit.own && unit.id === selectedId)

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
      <p aria-live="polite">{saving ? 'Spostamento…' : selected ? `${selected.name} · TL ${selected.position}. Scegli la destinazione.` : notice || 'Tocca una tua carta, poi scegli di quanti TL spostarla.'}</p>
      {selected && <button type="button" disabled={saving} onClick={() => setSelectedId(null)}>Annulla</button>}
    </div>
    {error && <p className="message error" role="alert">{error}</p>}
    <div className="timeline-scroll" role="region" aria-label="Caselle Timeline" tabIndex={0}>
      <ol className="timeline-grid">
        {slots.map(slot => {
          const delta = selected ? slot - selected.position : 0
          const deltaLabel = delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`
          return <li className="timeline-slot" key={slot}>
            {selected && delta !== 0
              ? <button className="timeline-destination" type="button" disabled={saving} aria-label={`Sposta di ${deltaLabel} TL, a TL ${slot}`} onClick={() => void move(slot)}><span>{slot}</span><strong>{deltaLabel} TL</strong></button>
              : <span className="timeline-slot-number">{slot}</span>}
            {units.filter(unit => unit.position === slot).map(unit => {
              const className = `timeline-unit timeline-unit-${unit.team === 'RED' ? 'red' : 'blue'}`
              return unit.own
                ? <button className={className} type="button" key={`own-${unit.id}`} disabled={saving} aria-pressed={selectedId === unit.id} onClick={() => { setError(null); setNotice(''); setSelectedId(selectedId === unit.id ? null : unit.id) }}>{unit.name}</button>
                : <span className={className} key={`other-${unit.id}`}>{unit.name}</span>
            })}
          </li>
        })}
      </ol>
    </div>
  </section>
}
