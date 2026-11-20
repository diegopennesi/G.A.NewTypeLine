export type UnitCard = {
  id: string
  name: string
  faction: 'Federation' | 'Zeon' | 'Independent'
  startingTimeline: number
}

const factions: UnitCard['faction'][] = ['Federation', 'Zeon', 'Independent']

export const unitCards: UnitCard[] = Array.from({ length: 18 }, (_, index) => ({
  id: `placeholder-${index + 1}`,
  name: `Mobile Suit ${String(index + 1).padStart(2, '0')}`,
  faction: factions[index % factions.length],
  startingTimeline: (index % 5) + 1,
}))
