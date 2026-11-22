import { useState, type CSSProperties } from 'react'
import { findUnitCard } from '../data/unitCards'

const faceFocus: Partial<Record<string, readonly [number, number]>> = {
  'ST01-U001': [29, 17],
  'ST01-U002': [49, 22],
}
const upperArtwork = [50, 29] as const

export function UnitPortrait({ unitId }: { unitId: string }) {
  const [failedId, setFailedId] = useState<string>()
  if (!findUnitCard(unitId)?.stats || failedId === unitId) return null
  const [x, y] = faceFocus[unitId] ?? upperArtwork
  const code = unitId.toLowerCase().replace(/^st01-u0/, 'st01-u')
  return <span className="unit-portrait" aria-hidden="true" style={{
    '--portrait-x': `${x}%`, '--portrait-y': `${y}%`,
  } as CSSProperties}>
    <img src={`https://global.bandai-hobby.net/en-us/site/gundam-assemble/images/unitlist/card/img_card_${code}_en.webp`}
      alt="" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedId(unitId)} />
  </span>
}
