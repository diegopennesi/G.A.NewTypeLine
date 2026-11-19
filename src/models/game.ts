export type GameStatus = 'WAITING' | 'SETUP' | 'ACTIVE' | 'FINISHED'
export type PlayerColor = 'RED' | 'BLUE'
export interface Game { id: string; code: string; status: GameStatus; ownerId: string; redPlayerId: string; bluePlayerId: string | null; createdAt: Date; updatedAt: Date }
