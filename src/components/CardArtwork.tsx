import { useState, type CSSProperties } from 'react'
import { findUnitCard } from '../data/unitCards'

const cardFocus: Partial<Record<string, readonly [number, number]>> = {
  'ST01-U001': [29, 17],
  'ST01-U002': [49, 22],
  'ST01-T01': [46, 15], // Epic Shot
  'EX01-T01': [66, 20], // Psycho-Frame Overload
  'EX01-T02': [52, 27], // Critical Rescue
  'EX01-T03': [43, 19], // Swift Appropriation
  'PA01-T01': [62, 18], // Protective Shot
  'PA01-T02': [56, 20], // All In
  'PA01-T03': [49, 25], // Bulwark Siege
  'PA01-T04': [52, 21], // Formative Strength
  'PA01-T05': [61, 25], // Sayla’s Encouragement
}
const upperArtwork = [50, 29] as const

export function CardArtwork({ cardId }: { cardId: string }) {
  const [failedId, setFailedId] = useState<string>()
  const isTactic = /^(ST01|EX01|EX02|PA01)-T[0-9]{2}$/.test(cardId)
  if ((!isTactic && !findUnitCard(cardId)?.stats) || failedId === cardId) return null
  const [x, y] = cardFocus[cardId] ?? upperArtwork
  const code = cardId.toLowerCase().replace(/^st01-u0/, 'st01-u')
  const directory = isTactic ? 'tacticscard' : 'unitlist'
  return <span className="card-artwork" data-tactic={isTactic || undefined} aria-hidden="true" style={{
    '--portrait-x': `${x}%`, '--portrait-y': `${y}%`,
  } as CSSProperties}>
    <img src={`https://global.bandai-hobby.net/en-us/site/gundam-assemble/images/${directory}/card/img_card_${code}_en.webp`}
      alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedId(cardId)} />
  </span>
}
