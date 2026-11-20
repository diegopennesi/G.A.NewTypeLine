import { useState } from 'react'
import { tacticsCards, tacticsDeckSize } from '../data/tacticsCards'
import { saveTacticsDeck } from '../services/tacticsService'

export function TacticsDeckPicker({ code, playerId, deck, locked }: {
  code: string; playerId: string; deck: string[]; locked: boolean
}) {
  const [draft, setDraft] = useState<string[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const cards = draft ?? deck

  async function save() {
    setSaving(true)
    setError('')
    try {
      await saveTacticsDeck(code, playerId, cards)
      setDraft(null)
    } catch {
      setError('Impossibile salvare il mazzo. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  return <section className="squad-picker" aria-labelledby="tactics-picker-title">
    <h2 id="tactics-picker-title">Mazzo tattico · {cards.length}/{tacticsDeckSize}</h2>
    <p className="lead">Scegli 9 Tactics Card segnaposto. Il mazzo è visibile solo a te.</p>
    <div className="unit-grid">
      {tacticsCards.filter(card => !locked || deck.includes(card.id)).map(card => {
        const chosen = cards.includes(card.id)
        return <button type="button" key={card.id} className={`unit-card ${chosen ? 'selected' : ''}`}
          aria-pressed={chosen} disabled={locked || saving || (!chosen && cards.length === tacticsDeckSize)}
          onClick={() => setDraft(chosen ? cards.filter(id => id !== card.id) : [...cards, card.id])}>
          <b>{card.name}</b><span>{card.text}</span>
        </button>
      })}
    </div>
    {error && <p className="message error" role="alert">{error}</p>}
    {!locked && <button className="button secondary tactics-save" type="button"
      disabled={saving || draft === null || cards.length !== tacticsDeckSize} onClick={() => void save()}>
      {saving ? 'Salvataggio…' : deck.length === tacticsDeckSize && draft === null ? 'Mazzo salvato' : 'Salva mazzo tattico'}
    </button>}
  </section>
}
