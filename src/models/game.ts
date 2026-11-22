import type { DefeatEvent, Victory } from './victory'
import type { Timestamp } from 'firebase/firestore'
import type { Activation } from './activation'

export type GameStatus = 'WAITING' | 'SETUP' | 'ACTIVE' | 'FINISHED'
export type MatchSize = '3v3' | '5v5'
export type Team = 'RED' | 'BLUE'
export type MatchResult = Team | 'DRAW' | 'INTERRUPTED'

export const matchResultLabels: Record<MatchResult, string> = {
  RED: 'Vittoria del Rosso',
  BLUE: 'Vittoria del Blu',
  DRAW: 'Pareggio',
  INTERRUPTED: 'Partita interrotta',
}
export interface Game { id: string; code: string; matchSize: MatchSize; status: GameStatus; ownerId: string; playerOneId: string; playerOneName: string; playerTwoId: string | null; playerTwoName: string | null; playerOneTeam: Team | null; playerTwoTeam: Team | null; playerOneSquad: string[]; playerTwoSquad: string[]; playerOneReady: boolean; playerTwoReady: boolean; playerOneTimeline?: Record<string, number>; playerTwoTimeline?: Record<string, number>; createdAt: Timestamp; updatedAt: Timestamp | null; lastActionAt?: Timestamp | null; finishedAt?: Timestamp; result?: MatchResult; victory?: Victory; defeats?: DefeatEvent[]; activation?: Activation }
