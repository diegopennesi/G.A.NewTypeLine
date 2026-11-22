import { useState } from 'react'
import type { Game } from '../models/game'
import { scoreFor, victoryTotal, type VictoryAction } from '../models/victory'
import { changeVictory } from '../services/activationService'

export function VictoryBoard({ game, playerId, readOnly = false }: { game: Game; playerId: string; readOnly?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function update(action: VictoryAction) {
    setBusy(true)
    setError('')
    try {
      await changeVictory(game.code, playerId, action)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossibile aggiornare i VP.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="victory-board" aria-label="Punti vittoria">
    {(['one', 'two'] as const).map(seat => {
      const isOne = seat === 'one'
      const team = isOne ? game.playerOneTeam : game.playerTwoTeam
      const color = team === 'RED' ? 'Rosso' : 'Blu'
      const own = !readOnly && playerId === (isOne ? game.playerOneId : game.playerTwoId)
      const score = scoreFor(game.victory, seat)
      const total = victoryTotal(score)
      return <div className="victory-team" data-team={team} key={seat}>
        <div className="victory-total">
          <b>{color}</b>
          {own && <button type="button" aria-label="Sottrai 1 VP" disabled={busy || total === 0} onClick={() => void update('subtract')}>−</button>}
          <strong aria-live="polite">{total} VP</strong>
          {own && <button type="button" aria-label="Aggiungi 1 VP" disabled={busy} onClick={() => void update('add')}>+</button>}
        </div>
        <div className="victory-garrisons">
          {own ? <>
            <button type="button" disabled={busy} aria-label={`Aggiungi un Garrison conquistato. Totale ${score.captured}. Più 2 VP.`} onClick={() => void update('captured')}>Garrison conquistati · {score.captured}<small>+2 VP</small></button>
            <button type="button" disabled={busy} aria-label={`Aggiungi un Garrison salvato. Totale ${score.rescued}. Più 2 VP.`} onClick={() => void update('rescued')}>Garrison salvati · {score.rescued}<small>+2 VP</small></button>
          </> : <>
            <span>Garrison conquistati · {score.captured}<small>2 VP ciascuno</small></span>
            <span>Garrison salvati · {score.rescued}<small>2 VP ciascuno</small></span>
          </>}
        </div>
      </div>
    })}
    {error && <p className="message error" role="alert">{error}</p>}
  </section>
}
