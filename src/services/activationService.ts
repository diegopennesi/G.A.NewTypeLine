import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { applyTimelineAction, initialActivation, type TimelineAction } from '../models/activation'
import type { Game } from '../models/game'
import { getFirestoreService } from './firestoreService'

export async function changeActivation(code: string, uid: string, version: number, action: TimelineAction) {
  const db = getFirestoreService()
  const ref = doc(db, 'games', code)
  return runTransaction(db, async transaction => {
    const game = (await transaction.get(ref)).data() as Game | undefined
    if (game?.status !== 'ACTIVE' || ![game.playerOneId, game.playerTwoId].includes(uid)) {
      throw new Error('Partita non disponibile.')
    }
    const state = game.activation ?? initialActivation(game)
    if (version !== state.version) throw new Error('La Timeline è cambiata. Riprova.')
    const activation = applyTimelineAction(state, game.playerOneId === uid ? 'one' : 'two', action)
    transaction.update(ref, { activation, updatedAt: serverTimestamp(), lastActionAt: serverTimestamp() })
    return activation
  })
}
