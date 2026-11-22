import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { applyTimelineAction, initialActivation, reachedSecondPhase, type TimelineAction } from '../models/activation'
import type { Game, MatchResult } from '../models/game'
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
    const phaseTwoSeats = (['one', 'two'] as const).filter(seat => reachedSecondPhase(activation, seat))
    if (phaseTwoSeats.length > 0) activation.phaseTwoSeats = phaseTwoSeats
    transaction.update(ref, { activation, updatedAt: serverTimestamp(), lastActionAt: serverTimestamp() })
    return activation
  })
}

export async function finishMatch(code: string, uid: string, result: MatchResult) {
  const db = getFirestoreService()
  const ref = doc(db, 'games', code)
  await runTransaction(db, async transaction => {
    const game = (await transaction.get(ref)).data() as Game | undefined
    if (!game || ![game.playerOneId, game.playerTwoId].includes(uid)) throw new Error('Partita non disponibile.')
    if (game.status === 'FINISHED') return
    const state = game.activation
    if (game.status !== 'ACTIVE' || !state || state.current || state.reaction || state.units.some(unit => unit.time <= 20)) {
      throw new Error('Concludi entrambe le fasi prima di chiudere la partita.')
    }
    transaction.update(ref, { status: 'FINISHED', result, finishedAt: serverTimestamp(), updatedAt: serverTimestamp() })
  })
}
