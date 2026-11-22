import { useEffect, useState } from 'react'
import { findUnitCard } from '../data/unitCards'
import type { Preset } from '../services/accountService'
import { deckKey, loadMatchHistory, type MatchHistoryEntry } from '../services/matchHistoryService'

const outcomeLabels = { win: 'Vittoria', loss: 'Sconfitta', draw: 'Pareggio', interrupted: 'Interrotta' }
function searchText(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('it')
}

const date = new Intl.DateTimeFormat('it-IT', { dateStyle: 'short', timeStyle: 'short' })

export function AccountMatchHistory({ uid, presets }: { uid: string; presets: Preset[] }) {
  const [matches, setMatches] = useState<MatchHistoryEntry[] | null>(null)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let active = true
    void loadMatchHistory(uid).then(history => { if (active) setMatches(history) },
      () => { if (active) setError(true) })
    return () => { active = false }
  }, [uid])

  const groups = new Map<string, { squad: string[]; size: MatchHistoryEntry['size']; matches: MatchHistoryEntry[] }>()
  for (const match of matches ?? []) {
    if (!match.squad?.length || !match.cards) continue
    const key = JSON.stringify([match.size, deckKey(match.squad), deckKey(match.cards)])
    const group = groups.get(key) ?? { squad: match.squad, size: match.size, matches: [] }
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

  function deckName(match: MatchHistoryEntry) {
    return match.deckName ?? (match.cards ? savedNames('deck', match.cards).join(' / ') || 'Mazzo senza nome' : 'Mazzo non disponibile')
  }

  const terms = searchText(search.trim()).split(/\s+/).filter(Boolean)
  const visibleGroups = [...groups].flatMap(([key, group]) => {
    const squads = [...new Set(group.matches.map(squadName))]
    const decks = [...new Set(group.matches.map(deckName))]
    const units = group.squad.map(id => `${id} ${findUnitCard(id)?.name ?? ''}`)
    const searchable = searchText([...squads, ...decks, ...units, group.size].join(' '))
    return terms.every(term => searchable.includes(term)) ? [{ key, group, squads, decks }] : []
  })

  return <section className="operation-panel account-match-history" aria-labelledby="account-history-title">
    <h2 id="account-history-title">Storico e statistiche</h2>
    {error ? <p role="alert">Impossibile caricare lo storico.</p> : !matches ? <p>Caricamento…</p> : <>
      <h3>Statistiche per squadra e mazzo tattico</h3>
      <label className="field">Cerca una combinazione
        <input type="search" value={search} placeholder="Squadra, mazzo o unità"
          onChange={event => setSearch(event.target.value)} />
      </label>
      {visibleGroups.length === 0 && <p role="status">{groups.size === 0
        ? 'Nessuna partita con squadra e mazzo registrati.'
        : 'Nessuna combinazione corrisponde alla ricerca.'}</p>}
      {visibleGroups.map(({ key, group, squads, decks }) => {
        const count = (outcome: MatchHistoryEntry['outcome']) => group.matches.filter(match => match.outcome === outcome).length
        const completed = group.matches.length - count('interrupted')
        return <details key={key} className="account-history-row">
          <summary><strong>{squads.join(' / ')} + {decks.join(' / ')}</strong> · {group.size} · {completed} concluse
            {completed > 0 && <> · {Math.round(count('win') / completed * 100)}% vittorie</>}</summary>
          <p>{count('win')} vinte · {count('loss')} perse · {count('draw')} pareggiate · {count('interrupted')} interrotte</p>
          <p>Unità · {group.squad.map(id => findUnitCard(id)?.name ?? id).join(', ')}</p>
        </details>
      })}
      <h3>Partite</h3>
      {matches.length === 0 && <p>Nessun risultato registrato.</p>}
      {matches.map(match => <details key={match.code} className="account-history-row">
        <summary><strong>{outcomeLabels[match.outcome]}</strong> · {match.size} · {match.opponent ?? 'Avversario'} · {date.format(match.finishedAt)}</summary>
        <p>Partita {match.code}</p>
        <p>Squadra · {squadName(match)}</p>
        <p>Mazzo tattico · {deckName(match)}</p>
      </details>)}
    </>}
  </section>
}
