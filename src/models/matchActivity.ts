import type { Timestamp } from 'firebase/firestore'

export const matchInactivityMs = 60 * 60 * 1000

export function matchActivity(game: {
  updatedAt: Timestamp | null
  lastActionAt?: Timestamp | null
  playerOneTimeline?: Record<string, number>
  playerTwoTimeline?: Record<string, number>
}) {
  const updatedAt = game.updatedAt?.toMillis() ?? null
  const recorded = game.lastActionAt?.toMillis() ?? null
  const legacyMove = Object.keys(game.playerOneTimeline ?? {}).length > 0 ||
    Object.keys(game.playerTwoTimeline ?? {}).length > 0
  const basis = recorded ?? updatedAt
  return {
    expiresAt: basis === null ? null : basis + matchInactivityMs,
    lastMoveAt: recorded ?? (legacyMove ? updatedAt : null),
  }
}

export function formatMatchTime(time: number) {
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC',
  }).format(time) + ' GMT'
}
