export type GameStatus = 'WAITING' | 'SETUP' | 'ACTIVE' | 'FINISHED'
export type MatchSize = '3v3' | '5v5'
export interface Game { id: string; code: string; matchSize: MatchSize; status: GameStatus; ownerId: string; playerOneId: string; playerOneName: string; playerTwoId: string | null; playerTwoName: string | null; createdAt: Date; updatedAt: Date }
