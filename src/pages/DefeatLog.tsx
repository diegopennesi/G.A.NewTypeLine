import { findUnitCard } from '../data/unitCards'
import type { Game } from '../models/game'
import { scoreFor } from '../models/victory'

export function DefeatLog({ game }: { game: Game }) {
  const events = game.defeats ?? []
  return <details className="defeat-log">
    <summary>Unità distrutte <span>{events.length}</span></summary>
    <div className="defeat-log-teams">
      {(['one', 'two'] as const).map(seat => {
        const team = seat === 'one' ? game.playerOneTeam : game.playerTwoTeam
        const entries = events.filter(event => event.creditedTo === seat).reverse()
        const earlierVP = scoreFor(game.victory, seat).destroyed - entries.reduce((total, entry) => total + entry.vp, 0)
        return <section key={seat} data-team={team}>
          <h3>{team === 'RED' ? 'Rosso' : 'Blu'} <small>{entries.length}</small></h3>
          {entries.length ? <ul>
            {entries.map(entry => {
              const unit = findUnitCard(entry.unitId)
              return <li key={entry.version}>
                <span>{unit?.name ?? entry.unitId}<small>{entry.unitId}</small></span>
                <strong>+{entry.vp} VP</strong>
              </li>
            })}
          </ul> : <p>Nessuna distruzione registrata.</p>}
          {earlierVP > 0 && <p>{earlierVP} VP da distruzioni precedenti al registro.</p>}
        </section>
      })}
    </div>
  </details>
}
