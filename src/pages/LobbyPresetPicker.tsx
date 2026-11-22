import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { watchPresets, type Preset } from '../services/accountService'

export function LobbyPresetPicker({ code, playerId, size, busy, onUse }: {
  code: string; playerId: string; size: number; busy: boolean; onUse: (squad: string[], deck: string[]) => void
}) {
  const [presets, setPresets] = useState<Preset[] | null>(null)
  const [error, setError] = useState(false)
  const [squadId, setSquadId] = useState('')
  const [deckId, setDeckId] = useState('')
  useEffect(() => watchPresets(playerId, setPresets, () => setError(true)), [playerId])
  const squads = presets?.filter(preset => preset.kind === 'squad' && preset.cards.length === size) ?? []
  const decks = presets?.filter(preset => preset.kind === 'deck') ?? []
  const squad = squads.find(preset => preset.id === squadId)
  const deck = decks.find(preset => preset.id === deckId)

  return <div className="operation-panel lobby-preset-picker">
    {error ? <p role="alert">Impossibile caricare i preset.</p>
      : !presets ? <p role="status">Caricamento dei preset…</p>
      : !squads.length || !decks.length ? <p>Salva una squadra {size}v{size} e un mazzo nell’Account per riutilizzarli qui.</p>
      : <>
        <div className="lobby-preset-fields">
          <label className="field">Squadra <select value={squadId} disabled={busy} onChange={event => setSquadId(event.target.value)}>
            <option value="">Scegli una squadra</option>
            {squads.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
          <label className="field">Mazzo <select value={deckId} disabled={busy} onChange={event => setDeckId(event.target.value)}>
            <option value="">Scegli un mazzo</option>
            {decks.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
        </div>
        <button type="button" className="button secondary" disabled={busy || !squad || !deck}
          onClick={() => { if (squad && deck) onUse(squad.cards, deck.cards) }}>Usa squadra e mazzo</button>
      </>}
    <Link className="button secondary" to="/account" state={{ backTo: `/games/${code}` }}>Crea o modifica preset</Link>
  </div>
}
