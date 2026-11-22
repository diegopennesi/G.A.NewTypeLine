import { collection, doc, getDoc, getDocs, or, query, where } from 'firebase/firestore'
import type { Game } from '../models/game'
import { getFirestoreService } from './firestoreService'

type RecordedMatch = Pick<Game, 'playerOneId' | 'playerTwoId' | 'playerOneName' | 'playerTwoName' |
  'playerOneTeam' | 'playerTwoTeam' | 'matchSize'> & Required<Pick<Game, 'result' | 'finishedAt'>>

export type MatchHistoryEntry = {
  code: string
  opponent: string | null
  size: Game['matchSize']
  finishedAt: number
  outcome: 'win' | 'loss' | 'draw' | 'interrupted'
  cards: string[] | null
}

export async function loadMatchHistory(uid: string): Promise<MatchHistoryEntry[]> {
  const db = getFirestoreService()
  const seatFilter = or(where('playerOneId', '==', uid), where('playerTwoId', '==', uid))
  const [archived, legacy, decks] = await Promise.all([
    getDocs(query(collection(db, 'matchResults'), seatFilter)),
    getDocs(query(collection(db, 'games'), seatFilter)),
    getDocs(collection(db, 'accounts', uid, 'matchDecks')),
  ])
  const snapshots = new Map(decks.docs.map(entry => [entry.id, entry.data().cards as string[]]))
  const legacyCodes = new Set(legacy.docs.map(entry => entry.id))
  const matches = new Map<string, RecordedMatch>()
  for (const entry of legacy.docs) {
    const game = entry.data() as Game
    if (game.status === 'FINISHED' && game.result && game.finishedAt) matches.set(entry.id, { ...game, result: game.result, finishedAt: game.finishedAt })
  }
  for (const entry of archived.docs) matches.set(entry.id, entry.data() as RecordedMatch)

  return Promise.all([...matches.entries()]
    .sort(([, a], [, b]) => b.finishedAt.toMillis() - a.finishedAt.toMillis())
    .map(async ([code, match]): Promise<MatchHistoryEntry> => {
      const first = match.playerOneId === uid
      const team = first ? match.playerOneTeam : match.playerTwoTeam
      const storedDeck = snapshots.get(code)
      const legacyDeck = !storedDeck && legacyCodes.has(code)
        ? (await getDoc(doc(db, 'games', code, 'tacticsDecks', uid))).data()?.cards as string[] | undefined
        : undefined
      const cards = storedDeck ?? legacyDeck
      return {
        code,
        opponent: first ? match.playerTwoName : match.playerOneName,
        size: match.matchSize,
        finishedAt: match.finishedAt.toMillis(),
        outcome: match.result === 'INTERRUPTED' ? 'interrupted' : match.result === 'DRAW' ? 'draw' : match.result === team ? 'win' : 'loss',
        cards: cards?.length === 9 ? cards : null,
      }
    }))
}

export function deckKey(cards: string[]) {
  return [...cards].sort().join('/')
}
