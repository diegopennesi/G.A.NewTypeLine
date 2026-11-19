export type PlaceholderUnit = {
  id: string
  name: string
  faction: 'Federation' | 'Zeon' | 'Independent'
  startingTimeline: number
}

const factions: PlaceholderUnit['faction'][] = ['Federation', 'Zeon', 'Independent']

export const placeholderUnits: PlaceholderUnit[] = Array.from({ length: 18 }, (_, index) => ({
  id: `placeholder-${index + 1}`,
  name: `Mobile Suit ${String(index + 1).padStart(2, '0')}`,
  faction: factions[index % factions.length],
  startingTimeline: (index % 5) + 1,
}))
