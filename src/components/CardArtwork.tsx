import { useState, type CSSProperties } from 'react'
import { findUnitCard } from '../data/unitCards'

const faceFocus: Partial<Record<string, readonly [number, number]>> = {
  'ST01-U001': [29, 17],
  'ST01-U002': [49, 22],
}
const upperArtwork = [50, 29] as const

export function CardArtwork({ cardId }: { cardId: string }) {
  const [failedId, setFailedId] = useState<string>()
  const isTactic = /^(ST01|EX01|EX02|PA01)-T[0-9]{2}$/.test(cardId)
  if ((!isTactic && !findUnitCard(cardId)?.stats) || failedId === cardId) return null
  const [x, y] = isTactic ? [50, 35] : faceFocus[cardId] ?? upperArtwork
  const code = cardId.toLowerCase().replace(/^st01-u0/, 'st01-u')
  const directory = isTactic ? 'tacticscard' : 'unitlist'
  return <span className="card-artwork" data-tactic={isTactic || undefined} aria-hidden="true" style={{
    '--portrait-x': `${x}%`, '--portrait-y': `${y}%`,
  } as CSSProperties}>
    <img src={`https://global.bandai-hobby.net/en-us/site/gundam-assemble/images/${directory}/card/img_card_${code}_en.webp`}
      alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedId(cardId)} />
  </span>
}
