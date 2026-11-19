export type GameStatus = 'WAITING' | 'SETUP' | 'ACTIVE' | 'FINISHED'
export type PlayerColor = 'RED' | 'BLUE'
export interface Game { id: string; status: GameStatus; createdAt: Date }
