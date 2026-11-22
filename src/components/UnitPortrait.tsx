import { useState, type CSSProperties } from 'react'

const focus: Record<string, [number, number]> = {
  'ST01-U001': [74, 18], 'ST01-U002': [72, 19], 'ST01-U003': [74, 19],
  'ST01-U004': [77, 19], 'ST01-U005': [75, 20], 'ST01-U006': [75, 19],
  'EX01-U01': [69, 18], 'EX01-U02': [69, 20], 'EX01-U03': [69, 19],
  'EX02-U01': [72, 20], 'EX02-U02': [72, 19], 'EX02-U03': [67, 20],
  'PA01-U01': [72, 18], 'PA01-U02': [71, 19], 'PA01-U03': [71, 19],
}

export function UnitPortrait({ unitId }: { unitId: string }) {
  const [failedId, setFailedId] = useState<string>()
  const point = focus[unitId]
  if (!point || failedId === unitId) return null
  const code = unitId.toLowerCase().replace(/^st01-u0/, 'st01-u')
  return <span className="unit-portrait" aria-hidden="true" style={{
    '--portrait-x': `${point[0]}%`, '--portrait-y': `${point[1]}%`,
  } as CSSProperties}>
    <img src={`https://global.bandai-hobby.net/en-us/site/gundam-assemble/images/unitlist/card/img_card_front_${code}_en.webp`}
      alt="" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedId(unitId)} />
  </span>
}
