import { useState } from 'react'
import { CardSelectionList } from '../components/CardSelectionList'
import { tacticSelectionRows } from '../data/cardSelectionRows'
import { tacticsDeckSize } from '../data/tacticsCards'
import { saveTacticsDeck, type TacticsDeck } from '../services/tacticsService'

export function TacticsDeckPicker({ code, playerId, deck, locked }: {
  code: string; playerId: string; deck: TacticsDeck; locked: boolean
}) {
  const [draft, setDraft] = useState<string[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [draftRandomized, setDraftRandomized] = useState<boolean | null>(null)
  const randomized = draftRandomized ?? deck.randomized
  const cards = draft ?? deck.cards

  async function save() {
    setSaving(true)
    setError('')
    try {
      await saveTacticsDeck(code, playerId, cards, randomized)
      setDraft(null)
      setDraftRandomized(null)
    } catch {
      setError('Impossibile salvare il mazzo. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="squad-picker" aria-labelledby="tactics-picker-title">
    <h2 id="tactics-picker-title">Mazzo tattico · {cards.length}/{tacticsDeckSize}</h2>
    <p className="lead">Scegli 9 Tactics Card. Il mazzo è visibile solo a te.</p>
    <label className="deck-randomize">
      <input type="checkbox" checked={randomized} disabled={locked || saving}
        onChange={event => setDraftRandomized(event.target.checked)} /> Randomizza carte
    </label>
    {randomized && <p>3 carte all’inizio, altre 3 quando tutti i tuoi MS raggiungono Fase 2.</p>}
    <CardSelectionList label="Cerca Tactics Card"
      rows={tacticSelectionRows(cards, locked)}
      selected={cards} limit={tacticsDeckSize} disabled={locked || saving}
      onToggle={id => setDraft(cards.includes(id) ? cards.filter(cardId => cardId !== id) : [...cards, id])} />
    {error && <p className="message error" role="alert">{error}</p>}
    {!locked && <button className="button secondary tactics-save" type="button"
      disabled={saving || (draft === null && draftRandomized === null) || cards.length !== tacticsDeckSize} onClick={() => void save()}>
      {saving ? 'Salvataggio…' : deck.cards.length === tacticsDeckSize && draft === null && draftRandomized === null ? 'Mazzo salvato' : 'Salva mazzo tattico'}
    </button>}
  </section>
}
