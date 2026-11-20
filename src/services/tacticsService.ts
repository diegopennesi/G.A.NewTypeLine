import { doc, onSnapshot, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore'
import { tacticsCards, tacticsDeckSize } from '../data/tacticsCards'
import { getFirestoreService } from './firestoreService'

type TacticsPlays = { order: string[]; slots: Record<string, number> }

export function watchTacticsDeck(code: string, uid: string, onDeck: (deck: string[]) => void, onError: (error: Error) => void) {
  const ref = doc(getFirestoreService(), 'games', code, 'tacticsDecks', uid)
  return onSnapshot(ref, { includeMetadataChanges: true }, snapshot => {
    if (!snapshot.metadata.hasPendingWrites) onDeck(snapshot.data()?.cards ?? [])
  }, onError)
}

export async function saveTacticsDeck(code: string, uid: string, cards: string[]) {
  if (cards.length !== tacticsDeckSize || new Set(cards).size !== tacticsDeckSize ||
      cards.some(id => !tacticsCards.some(card => card.id === id))) {
    throw new Error('Scegli 9 Tactics Card diverse.')
  }
  await setDoc(doc(getFirestoreService(), 'games', code, 'tacticsDecks', uid), { cards })
}

export function watchTacticsPlays(code: string, uid: string, onPlays: (plays: TacticsPlays | undefined) => void, onError: (error: Error) => void) {
  const ref = doc(getFirestoreService(), 'games', code, 'tacticsPlays', uid)
  return onSnapshot(ref, snapshot => onPlays(snapshot.data() as TacticsPlays | undefined), onError)
}

export async function playTacticsCard(code: string, uid: string, id: string, slot: number) {
  const db = getFirestoreService()
  const game = doc(db, 'games', code)
  const ref = doc(game, 'tacticsPlays', uid)
  await runTransaction(db, async transaction => {
    const plays = (await transaction.get(ref)).data() as TacticsPlays | undefined
    if (plays?.order.includes(id)) throw new Error('Questa carta è già sulla Timeline.')
    transaction.set(ref, { order: [...(plays?.order ?? []), id], slots: { ...plays?.slots, [id]: slot }, changedAt: serverTimestamp() })
    transaction.update(game, { updatedAt: serverTimestamp(), lastActionAt: serverTimestamp() })
  })
}

export async function revertTacticsCard(code: string, uid: string, expectedId: string) {
  const db = getFirestoreService()
  const game = doc(db, 'games', code)
  const ref = doc(game, 'tacticsPlays', uid)
  await runTransaction(db, async transaction => {
    const plays = (await transaction.get(ref)).data() as TacticsPlays | undefined
    if (!plays || plays.order.at(-1) !== expectedId) throw new Error('L’ultima carta è cambiata. Riprova.')
    const slots = { ...plays.slots }
    delete slots[expectedId]
    transaction.set(ref, { order: plays.order.slice(0, -1), slots, changedAt: serverTimestamp() })
    transaction.update(game, { updatedAt: serverTimestamp(), lastActionAt: serverTimestamp() })
  })
}
