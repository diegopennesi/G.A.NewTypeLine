import type { ReactionTiming } from '../data/tacticsCards'
import { findUnitCard } from '../data/unitCards'
import type { Game } from './game'

type Seat = 'one' | 'two'
export type TimelineUnit = { key: string; id: string; seat: Seat; time: number; reserve: boolean }
export type Activation = {
  version: number
  phaseTwoSeats?: Seat[]
  reaction?: ReactionTiming | null
  lastKind?: TimelineAction['kind']
  units: TimelineUnit[]
  round: number
  lastSeat: Seat | null
  current: { key: string; time: number; paid: boolean; id: number } | null
}
export type TimelineAction =
  | { kind: 'initiative'; one: number; two: number }
  | { kind: 'start'; key: string }
  | { kind: 'pay'; delta: number }
  | { kind: 'end' }
  | { kind: 'openReaction'; timing: ReactionTiming }
  | { kind: 'closeReaction' }
  | { kind: 'defeat'; key: string }
  | { kind: 'effect'; key: string; delta: number }

export const roundSlot = (time: number) => (time - 1) % 10 + 1
export const roundPhase = (time: number) => Math.floor((time - 1) / 10) + 1

export function initialActivation(game: Game): Activation {
  const seats = [
    { seat: 'one', squad: game.playerOneSquad, positions: game.playerOneTimeline },
    { seat: 'two', squad: game.playerTwoSquad, positions: game.playerTwoTimeline },
  ] as const
  const units = seats.flatMap(({ seat, squad, positions }) => squad.flatMap(id => {
    const card = findUnitCard(id)
    return card ? [{ key: `${seat}/${id}`, id, seat, time: positions?.[id] ?? card.startingTimeline, reserve: true }] : []
  }))
  return { version: 0, units, round: 1, lastSeat: null, current: null }
}

export function reachedSecondPhase(state: Activation | undefined, seat: Seat) {
  if (state?.phaseTwoSeats?.includes(seat)) return true
  const units = state?.units.filter(unit => unit.seat === seat) ?? []
  return units.length > 0 && units.every(unit => unit.time > 10)
}

export function nextActivation(state: Activation) {
  const time = Math.min(...state.units.map(unit => unit.time))
  const one = state.units.find(unit => unit.time === time && unit.seat === 'one')
  const two = state.units.find(unit => unit.time === time && unit.seat === 'two')
  const tie = !!one && !!two && state.lastSeat === null
  return { time, tie, unit: tie ? undefined : one && two ? (state.lastSeat === 'one' ? two : one) : one ?? two }
}

export function applyTimelineAction(state: Activation, seat: Seat, action: TimelineAction): Activation {
  const next = nextActivation(state)
  const current = state.units.find(unit => unit.key === state.current?.key)
  const finish = () => ({ ...state, round: state.current!.time, current: null, lastSeat: current!.seat })
  const change = { version: state.version + 1, lastKind: action.kind }

  switch (action.kind) {
    case 'initiative':
      if (state.current || !next.tie || next.time > 20 || action.one === action.two ||
          ![action.one, action.two].every(value => Number.isInteger(value) && value >= 1 && value <= 10)) {
        throw new Error('Lo spareggio non è disponibile.')
      }
      return { ...state, ...change, lastSeat: action.one > action.two ? 'two' : 'one' }
    case 'start':
      if (state.current || next.time > 20 || next.unit?.key !== action.key || next.unit.seat !== seat) {
        throw new Error('Questa unità non può ancora attivarsi.')
      }
      return {
        ...state, ...change, round: next.time,
        current: { key: action.key, time: next.time, paid: false, id: change.version },
        units: state.units.map(unit => unit.key === action.key ? { ...unit, reserve: false } : unit),
      }
    case 'openReaction':
      if (!current || current.seat !== seat || state.reaction) throw new Error('Non puoi aprire una reazione ora.')
      return { ...state, ...change, reaction: action.timing }
    case 'closeReaction':
      if (!current || current.seat === seat || !state.reaction) throw new Error('Non puoi chiudere questa reazione.')
      return { ...state, ...change, reaction: null }
    case 'pay': {
      if (state.reaction || !state.current || !current || current.seat !== seat || state.current.paid ||
          !Number.isInteger(action.delta) || action.delta < 1 || action.delta > 20) {
        throw new Error('Indica un costo da 1 a 20 TL per il MS in attivazione.')
      }
      return { ...state, ...change, current: { ...state.current, paid: true },
        units: [...state.units.filter(unit => unit.key !== current.key), { ...current, time: current.time + action.delta }] }
    }
    case 'end':
      if (state.reaction || !state.current?.paid || current?.seat !== seat) throw new Error('Prima paga il costo TL dell’azione.')
      return { ...finish(), ...change }
    case 'defeat':
    case 'effect': {
      const target = state.units.find(unit => unit.key === action.key)
      const delta = action.kind === 'defeat' ? 2 : action.delta
      if (state.reaction || !target || !Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 20 ||
          target.time + delta < (state.current?.time ?? next.time) || (state.current === null && next.time > 20) || (action.kind === 'defeat' && target.reserve) ||
          (action.kind === 'effect' && target.key === current?.key && state.current!.paid && target.time + delta <= state.round)) {
        throw new Error('Effetto non valido per questa unità o per il round corrente.')
      }
      const moved = { ...target, time: target.time + delta, reserve: action.kind === 'defeat' || target.reserve }
      const result = action.kind === 'defeat' && current?.key === target.key ? finish() : state
      return { ...result, ...change, units: [...state.units.filter(unit => unit.key !== target.key), moved] }
    }
  }
}
