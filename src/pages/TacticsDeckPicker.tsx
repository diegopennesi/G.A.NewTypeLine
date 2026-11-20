import { useState } from 'react'
import { CardSelectionList } from '../components/CardSelectionList'
import { findUnitCard } from '../data/unitCards'
import { allTacticsCards, reactionTimings, tacticsDeckSize } from '../data/tacticsCards'
import { saveTacticsDeck, type TacticsDeck } from '../services/tacticsService'

const explicitFactions: Record<string, string> = {
  'EX01-T04': 'Londo Bell', 'EX01-T05': 'Londo Bell', 'EX01-T06': 'Londo Bell',
  'EX01-T07': 'Londo Bell', 'EX01-T08': 'Londo Bell',
  'EX02-T04': 'Asticassia', 'EX02-T05': 'Asticassia', 'EX02-T06': 'Asticassia',
  'EX02-T07': 'Asticassia', 'EX02-T08': 'Asticassia',
  'PA01-T04': 'Earth Federation', 'PA01-T05': 'Earth Federation',
}

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
      rows={allTacticsCards.filter(card => locked ? deck.cards.includes(card.id) : card.kind || cards.includes(card.id))
        .map(card => {
          const unit = findUnitCard(card.signature)
          const faction = explicitFactions[card.id] ?? unit?.faction
          return {
            id: card.id, name: card.name, description: card.text,
            summary: [card.id, card.kind, faction, card.timing && reactionTimings[card.timing], card.cost && `${card.cost} TL`]
              .filter(Boolean).join(' · '),
            keywords: [card.signature, unit?.name].filter(Boolean).join(' '),
          }
        })}
      selected={cards} limit={tacticsDeckSize} disabled={locked || saving}
      onToggle={id => setDraft(cards.includes(id) ? cards.filter(cardId => cardId !== id) : [...cards, id])} />
    {error && <p className="message error" role="alert">{error}</p>}
    {!locked && <button className="button secondary tactics-save" type="button"
      disabled={saving || (draft === null && draftRandomized === null) || cards.length !== tacticsDeckSize} onClick={() => void save()}>
      {saving ? 'Salvataggio…' : deck.cards.length === tacticsDeckSize && draft === null && draftRandomized === null ? 'Mazzo salvato' : 'Salva mazzo tattico'}
    </button>}
  </section>
}
