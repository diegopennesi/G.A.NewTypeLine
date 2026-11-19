export type GameStatus = 'WAITING' | 'SETUP' | 'ACTIVE' | 'FINISHED'
export interface Game { id: string; code: string; status: GameStatus; ownerId: string; playerOneId: string; playerTwoId: string | null; createdAt: Date; updatedAt: Date }
