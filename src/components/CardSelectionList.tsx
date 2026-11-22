import { CardArtwork } from './CardArtwork'
import { useId, useState } from 'react'

type CardRow = {
  id: string
  name: string
  summary: string
  description?: string
  keywords?: string
}

function normalize(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim()
}

export function CardSelectionList({ label, rows, selected, limit, disabled, onToggle }: {
  label: string
  rows: CardRow[]
  selected: string[]
  limit: number
  disabled: boolean
  onToggle: (id: string) => void
}) {
  const searchId = useId()
  const [query, setQuery] = useState('')
  const terms = normalize(query).split(' ').filter(Boolean)
  const filtered = rows.filter(row => {
    const searchable = normalize([row.id, row.name, row.summary, row.description, row.keywords].join(' '))
    return terms.every(term => searchable.includes(term))
  })

  return <div className="card-selection">
    <label className="field" htmlFor={searchId}>{label}
      <input type="search" id={searchId} value={query}
        placeholder="Nome, fazione o parola chiave"
        onChange={event => setQuery(event.target.value)} />
    </label>
    <p className="card-selection-count" aria-live="polite">
      {filtered.length === 0 ? 'Nessuna carta corrisponde alla ricerca.' : `${filtered.length} di ${rows.length} carte`}
    </p>
    {filtered.length > 0 && <ul className="card-selection-list">
      {filtered.map(row => {
        const chosen = selected.includes(row.id)
        return <li key={row.id}>
          <button type="button" className="card-selection-row" aria-pressed={chosen}
            disabled={disabled || (!chosen && selected.length >= limit)} onClick={() => onToggle(row.id)}>
            <CardArtwork cardId={row.id} />
            <span className="card-selection-text">
              <strong>{row.name}</strong>
              <span>{row.summary}</span>
              {row.description && <span>{row.description}</span>}
            </span>
            <span className="card-selection-check" aria-hidden="true">{chosen ? '✓' : '+'}</span>
          </button>
        </li>
      })}
    </ul>}
  </div>
}
