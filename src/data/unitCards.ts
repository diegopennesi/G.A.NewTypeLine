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

const expansionCards: UnitCard[] = [
  {
    id: 'EX01-U01', name: 'Unicorn Gundam (Destroy Mode)', faction: 'Earth Federation / Londo Bell', startingTimeline: 3,
    stats: { hp: 14, vp: 10, weapons: [
      { name: 'Beam Saber', timelineCost: 2, range: 1, strength: 4 },
      { name: 'Beam Magnum', timelineCost: 4, range: 4, strength: 8 },
    ] },
  },
  {
    id: 'EX01-U02', name: 'Torohachi', faction: 'Earth Federation', startingTimeline: 1,
    stats: { hp: 8, vp: 5, weapons: [
      { name: 'Armored Frame', timelineCost: 2, range: 1, strength: 3 },
    ] },
  },
  {
    id: 'EX01-U03', name: 'Delta Plus', faction: 'Earth Federation / Londo Bell', startingTimeline: 2,
    stats: { hp: 11, vp: 7, weapons: [
      { name: 'Twin-Barreled Grenade Launcher', timelineCost: 2, range: 3, strength: 3 },
      { name: 'Beam Rifle', timelineCost: 4, range: 5, strength: 6 },
    ] },
  },
  {
    id: 'EX02-U01', name: 'Gundam Aerial', faction: 'Asticassia', startingTimeline: 1,
    stats: { hp: 16, vp: 10, weapons: [
      { name: 'Beam Sabers', timelineCost: 2, range: 1, strength: 3 },
      { name: 'Beam Rifle', timelineCost: 4, range: 4, strength: 6 },
    ] },
  },
  {
    id: 'EX02-U02', name: 'Gundam Pharact', faction: 'Asticassia', startingTimeline: 2,
    stats: { hp: 12, vp: 7, weapons: [
      { name: 'Beak Foot', timelineCost: 2, range: 3, strength: 3 },
      { name: 'Beam Arquebus', timelineCost: 4, range: 5, strength: 6 },
    ] },
  },
  {
    id: 'EX02-U03', name: 'Darilbalde', faction: 'Asticassia', startingTimeline: 3,
    stats: { hp: 13, vp: 8, weapons: [
      { name: 'Shackle Claw', timelineCost: 2, range: 2, strength: 4 },
      { name: 'Beam Saber', timelineCost: 3, range: 1, strength: 7 },
    ] },
  },
  {
    id: 'PA01-U01', name: 'Gundam', faction: 'Earth Federation', startingTimeline: 1,
    stats: { hp: 17, vp: 10, weapons: [
      { name: 'Beam Saber', timelineCost: 2, range: 1, strength: 3 },
      { name: 'Beam Rifle', timelineCost: 3, range: 3, strength: 5 },
    ] },
  },
  {
    id: 'PA01-U02', name: 'Guncannon', faction: 'Earth Federation', startingTimeline: 2,
    stats: { hp: 12, vp: 7, weapons: [
      { name: '240mm Low-Recoil Cannon', timelineCost: 2, range: 'SP', strength: 3 },
      { name: 'Beam Rifle', timelineCost: 4, range: 4, strength: 7 },
    ] },
  },
  {
    id: 'PA01-U03', name: 'Guntank', faction: 'Earth Federation', startingTimeline: 2,
    stats: { hp: 13, vp: 7, weapons: [
      { name: '120mm Low-Recoil Cannons', timelineCost: 2, range: 4, strength: 2 },
      { name: 'Quadruple Bop Missile', timelineCost: 3, range: 'SP', strength: 5 },
    ] },
  },
]

// Historical test matches can still contain these IDs.
const factions = ['Federation', 'Zeon', 'Independent']
const placeholders: UnitCard[] = Array.from({ length: 18 }, (_, index) => ({
  id: `placeholder-${index + 1}`,
  name: `Mobile Suit ${String(index + 1).padStart(2, '0')}`,
  faction: factions[index % factions.length],
  startingTimeline: (index % 5) + 1,
}))

export const unitCards = [...starterCards, ...expansionCards]

export function findUnitCard(id: string | undefined) {
  return unitCards.find(card => card.id === id) ?? placeholders.find(card => card.id === id)
}
