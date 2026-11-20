export type UnitWeapon = {
  name: string
  timelineCost: number
  range: number | 'SP'
  strength: number
}

export type UnitCard = {
  id: string
  name: string
  faction: string
  startingTimeline: number
  stats?: { hp: number; vp: number; weapons: readonly UnitWeapon[] }
}

const starterCards: UnitCard[] = [
  {
    id: 'ST01-U001', name: 'Gundam', faction: 'Earth Federation', startingTimeline: 2,
    stats: { hp: 15, vp: 8, weapons: [
      { name: 'Vulcan Guns', timelineCost: 2, range: 2, strength: 3 },
      { name: 'Beam Saber', timelineCost: 3, range: 1, strength: 6 },
    ] },
  },
  {
    id: 'ST01-U002', name: 'Wing Gundam Zero (EW)', faction: 'G Team', startingTimeline: 3,
    stats: { hp: 12, vp: 9, weapons: [
      { name: 'Beam Saber', timelineCost: 2, range: 1, strength: 4 },
      { name: 'Twin Buster Rifle', timelineCost: 4, range: 'SP', strength: 6 },
    ] },
  },
  {
    id: 'ST01-U003', name: 'Gundam Barbatos Lupus Rex', faction: 'Tekkadan', startingTimeline: 2,
    stats: { hp: 17, vp: 10, weapons: [
      { name: 'Rex Claws', timelineCost: 2, range: 1, strength: 3 },
      { name: 'Tail Blade', timelineCost: 4, range: 2, strength: 7 },
    ] },
  },
  {
    id: 'ST01-U004', name: 'Char’s Zaku II', faction: 'Zeon', startingTimeline: 2,
    stats: { hp: 12, vp: 7, weapons: [
      { name: 'Heat Hawk', timelineCost: 2, range: 1, strength: 4 },
      { name: 'Zaku Bazooka', timelineCost: 4, range: 4, strength: 7 },
    ] },
  },
  {
    id: 'ST01-U005', name: 'Gundam Epyon (EW)', faction: 'White Fang / OZ', startingTimeline: 3,
    stats: { hp: 15, vp: 9, weapons: [
      { name: 'Heat Rod', timelineCost: 2, range: 2, strength: 3 },
      { name: 'Beam Sword', timelineCost: 3, range: 1, strength: 7 },
    ] },
  },
  {
    id: 'ST01-U006', name: 'Gundam Vidar', faction: 'Gjallarhorn', startingTimeline: 1,
    stats: { hp: 13, vp: 7, weapons: [
      { name: 'Handguns', timelineCost: 3, range: 2, strength: 3 },
      { name: 'Burst Saber', timelineCost: 4, range: 1, strength: 8 },
    ] },
  },
]

const factions = ['Federation', 'Zeon', 'Independent']
const placeholders: UnitCard[] = Array.from({ length: 18 }, (_, index) => ({
  id: `placeholder-${index + 1}`,
  name: `Mobile Suit ${String(index + 1).padStart(2, '0')}`,
  faction: factions[index % factions.length],
  startingTimeline: (index % 5) + 1,
}))

export const unitCards = [...starterCards, ...placeholders.slice(6)]

export function findUnitCard(id: string | undefined) {
  return starterCards.find(card => card.id === id) ?? placeholders.find(card => card.id === id)
}
