import { findUnitCard, unitCards } from './unitCards'
import { allTacticsCards, reactionTimings } from './tacticsCards'

export const unitSelectionRows = unitCards.map(unit => ({
  id: unit.id, name: unit.name,
  summary: `${unit.id} · ${unit.faction} · TL ${unit.startingTimeline}${unit.stats ? ` · HP ${unit.stats.hp} · VP ${unit.stats.vp}` : ''}`,
  keywords: unit.stats?.weapons.map(weapon => weapon.name).join(' '),
}))

const explicitFactions: Record<string, string> = {
  'EX01-T04': 'Londo Bell', 'EX01-T05': 'Londo Bell', 'EX01-T06': 'Londo Bell',
  'EX01-T07': 'Londo Bell', 'EX01-T08': 'Londo Bell',
  'EX02-T04': 'Asticassia', 'EX02-T05': 'Asticassia', 'EX02-T06': 'Asticassia',
  'EX02-T07': 'Asticassia', 'EX02-T08': 'Asticassia',
  'PA01-T04': 'Earth Federation', 'PA01-T05': 'Earth Federation',
}

export function tacticSelectionRows(cards: string[], locked: boolean) {
  return allTacticsCards.filter(card => locked ? cards.includes(card.id) : card.kind || cards.includes(card.id))
    .map(card => {
      const unit = findUnitCard(card.signature)
      const faction = explicitFactions[card.id] ?? unit?.faction
      return {
        id: card.id, name: card.name, description: card.text,
        summary: [card.id, card.kind, faction, card.timing && reactionTimings[card.timing], card.cost && `${card.cost} TL`]
          .filter(Boolean).join(' · '),
        keywords: [card.signature, unit?.name].filter(Boolean).join(' '),
      }
    })
}

