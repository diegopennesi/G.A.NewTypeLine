import { useEffect, useState } from 'react'
import type { Preset } from '../services/accountService'
import { deckKey, loadMatchHistory, type MatchHistoryEntry } from '../services/matchHistoryService'

const outcomeLabels = { win: 'Vittoria', loss: 'Sconfitta', draw: 'Pareggio', interrupted: 'Interrotta' }
const date = new Intl.DateTimeFormat('it-IT', { dateStyle: 'short', timeStyle: 'short' })

export function AccountMatchHistory({ uid, presets }: { uid: string; presets: Preset[] }) {
  const [matches, setMatches] = useState<MatchHistoryEntry[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    void loadMatchHistory(uid).then(history => { if (active) setMatches(history) },
      () => { if (active) setError(true) })
    return () => { active = false }
  }, [uid])

  const groups = new Map<string, { cards: string[]; matches: MatchHistoryEntry[] }>()
  for (const preset of presets) {
    if (preset.kind === 'deck') groups.set(deckKey(preset.cards), { cards: preset.cards, matches: [] })
  }
  for (const match of matches ?? []) {
    if (!match.cards) continue
    const key = deckKey(match.cards)
    const group = groups.get(key) ?? { cards: match.cards, matches: [] }
    group.matches.push(match)
    groups.set(key, group)
  }

  function savedNames(kind: Preset['kind'], cards: string[]) {
    const key = deckKey(cards)
    return presets.filter(item => item.kind === kind && deckKey(item.cards) === key).map(item => item.name)
  }

  function squadName(match: MatchHistoryEntry) {
    return match.squadName ?? (match.squad ? savedNames('squad', match.squad).join(' / ') || 'Squadra senza nome' : 'Squadra non disponibile')
  }

  return <section className="operation-panel account-match-history" aria-labelledby="account-history-title">
    <h2 id="account-history-title">Storico e statistiche</h2>
    {error ? <p role="alert">Impossibile caricare lo storico.</p> : !matches ? <p>Caricamento…</p> : <>
      <h3>Statistiche dei mazzi</h3>
      {groups.size === 0 && <p>Nessun mazzo disponibile per le statistiche.</p>}
      {[...groups].map(([key, group]) => {
        const count = (outcome: MatchHistoryEntry['outcome']) => group.matches.filter(match => match.outcome === outcome).length
        const completed = group.matches.length - count('interrupted')
        const names = [...new Set([...savedNames('deck', group.cards), ...group.matches.flatMap(match => match.deckName ?? [])])]
        const squads = [...new Set(group.matches.map(squadName))]
        return <details key={key} className="account-history-row">
          <summary><strong>{names.join(' / ') || 'Mazzo senza nome'}</strong> · {completed} concluse
            {completed > 0 && <> · {Math.round(count('win') / completed * 100)}% vittorie</>}</summary>
          <p>{count('win')} vinte · {count('loss')} perse · {count('draw')} pareggiate · {count('interrupted')} interrotte</p>
          {squads.length > 0 && <p>Squadre usate · {squads.join(', ')}</p>}
        </details>
      })}
      <h3>Partite</h3>
      {matches.length === 0 && <p>Nessun risultato registrato.</p>}
      {matches.map(match => <details key={match.code} className="account-history-row">
        <summary><strong>{outcomeLabels[match.outcome]}</strong> · {match.size} · {match.opponent ?? 'Avversario'} · {date.format(match.finishedAt)}</summary>
        <p>Partita {match.code}</p>
        <p>Squadra · {squadName(match)}</p>
        <p>Mazzo tattico · {match.deckName ?? (match.cards ? savedNames('deck', match.cards).join(' / ') || 'Mazzo senza nome' : 'Mazzo non disponibile')}</p>
      </details>)}
    </>}
  </section>
}
