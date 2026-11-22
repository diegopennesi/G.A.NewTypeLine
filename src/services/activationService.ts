import { findUnitCard } from '../data/unitCards'
import { scoreFor, victoryTotal, type VictoryAction } from '../models/victory'
import { arrayUnion, doc, increment, runTransaction, serverTimestamp } from 'firebase/firestore'
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
    const target = action.kind === 'defeat' ? state.units.find(unit => unit.key === action.key) : undefined
    const opponent = target?.seat === 'one' ? 'two' : 'one'
    const award = target ? findUnitCard(target.id)?.stats?.vp ?? 0 : 0
    const points = award ? { [`victory.${opponent}.destroyed`]: increment(award) } : {}
    const log = target ? { defeats: arrayUnion({ version: activation.version, unitId: target.id, creditedTo: opponent, vp: award }) } : {}
    transaction.update(ref, { activation, ...points, ...log, updatedAt: serverTimestamp(), lastActionAt: serverTimestamp() })
    return activation
  })
}

export async function changeVictory(code: string, uid: string, action: VictoryAction) {
  const db = getFirestoreService()
  const ref = doc(db, 'games', code)
  await runTransaction(db, async transaction => {
    const game = (await transaction.get(ref)).data() as Game | undefined
    if (game?.status !== 'ACTIVE' || ![game.playerOneId, game.playerTwoId].includes(uid)) {
      throw new Error('Partita non disponibile.')
    }
    const seat = game.playerOneId === uid ? 'one' : 'two'
    if (action === 'subtract' && victoryTotal(scoreFor(game.victory, seat)) === 0) return
    const field = action === 'captured' || action === 'rescued' ? action : 'manual'
    transaction.update(ref, {
      [`victory.${seat}.${field}`]: increment(action === 'subtract' ? -1 : 1),
      updatedAt: serverTimestamp(), lastActionAt: serverTimestamp(),
    })
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
    transaction.set(doc(db, 'matchResults', code), {
      playerOneId: game.playerOneId, playerTwoId: game.playerTwoId,
      playerOneName: game.playerOneName, playerTwoName: game.playerTwoName,
      playerOneTeam: game.playerOneTeam, playerTwoTeam: game.playerTwoTeam,
      matchSize: game.matchSize, result, finishedAt: serverTimestamp(),
    })
    transaction.update(ref, { status: 'FINISHED', result, finishedAt: serverTimestamp(), updatedAt: serverTimestamp() })
  })
}
