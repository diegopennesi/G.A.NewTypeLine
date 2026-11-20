import { doc, onSnapshot, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore'
import { allTacticsCards, canPlayTacticsCard, tacticsDeckSize } from '../data/tacticsCards'
import { reachedSecondPhase, roundPhase, roundSlot } from '../models/activation'
import type { Game } from '../models/game'
import { getFirestoreService } from './firestoreService'

export type TacticsPlays = { order: string[]; slots: Record<string, number>; phases?: Record<string, number>; activationIds?: Record<string, number> }

export type TacticsDeck = { cards: string[]; randomized: boolean }

export function drawnTacticsCards(deck: TacticsDeck, game: Game, uid: string) {
  if (!deck.randomized) return deck.cards
  const seat = game.playerOneId === uid ? 'one' : 'two'
  const phaseTwo = reachedSecondPhase(game.activation, seat)
  return deck.cards.slice(0, phaseTwo ? 6 : 3)
}

function shuffle(cards: string[]) {
  const order = [...cards]
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

export function watchTacticsDeck(code: string, uid: string, onDeck: (deck: TacticsDeck) => void, onError: (error: Error) => void) {
  const ref = doc(getFirestoreService(), 'games', code, 'tacticsDecks', uid)
  return onSnapshot(ref, { includeMetadataChanges: true }, snapshot => {
    if (!snapshot.metadata.hasPendingWrites) {
      const data = snapshot.data()
      onDeck({ cards: data?.cards ?? [], randomized: data?.randomized === true })
    }
  }, onError)
}

export async function saveTacticsDeck(code: string, uid: string, cards: string[], randomized = false) {
  if (cards.length !== tacticsDeckSize || new Set(cards).size !== tacticsDeckSize ||
      cards.some(id => !allTacticsCards.some(card => card.id === id))) {
    throw new Error('Scegli 9 Tactics Card diverse.')
  }
  await setDoc(doc(getFirestoreService(), 'games', code, 'tacticsDecks', uid), { cards: randomized ? shuffle(cards) : cards, randomized })
}

export function watchTacticsPlays(code: string, uid: string, onPlays: (plays: TacticsPlays | undefined) => void, onError: (error: Error) => void) {
  const ref = doc(getFirestoreService(), 'games', code, 'tacticsPlays', uid)
  return onSnapshot(ref, snapshot => onPlays(snapshot.data() as TacticsPlays | undefined), onError)
}

export async function playTacticsCard(code: string, uid: string, id: string, slot: number, expectedActivationId?: number) {
  const db = getFirestoreService()
  const game = doc(db, 'games', code)
  const ref = doc(game, 'tacticsPlays', uid)
  await runTransaction(db, async transaction => {
    const match = (await transaction.get(game)).data() as Game | undefined
    const plays = (await transaction.get(ref)).data() as TacticsPlays | undefined
    if (plays?.order.includes(id)) throw new Error('Questa carta è già sulla Timeline.')
    const privateDeck = (await transaction.get(doc(game, 'tacticsDecks', uid))).data() as TacticsDeck | undefined
    if (match && privateDeck?.randomized && !drawnTacticsCards(privateDeck, match, uid).includes(id)) {
      throw new Error('Questa carta non è ancora stata pescata.')
    }
    const current = match?.activation?.current
    const card = allTacticsCards.find(candidate => candidate.id === id)
    if (card?.kind || match?.activation || expectedActivationId !== undefined) {
      const seat = match?.playerOneId === uid ? 'one' : 'two'
      if (!current || current.id !== expectedActivationId || roundSlot(current.time) !== slot ||
          !card || !match || !canPlayTacticsCard(card, current.key.startsWith(`${seat}/`),
            current.paid, match.activation?.reaction, current.key.split('/')[1],
            seat === 'one' ? match.playerOneSquad : match.playerTwoSquad) ||
          Object.values(plays?.activationIds ?? {}).includes(current.id)) {
        throw new Error('Questa carta non è giocabile nell’attivazione corrente.')
      }
    }
    transaction.set(ref, {
      order: [...(plays?.order ?? []), id],
      slots: { ...plays?.slots, [id]: slot },
      phases: current ? { ...plays?.phases, [id]: roundPhase(current.time) } : (plays?.phases ?? {}),
      activationIds: current ? { ...plays?.activationIds, [id]: current.id } : (plays?.activationIds ?? {}),
      changedAt: serverTimestamp(),
    })
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
    const phases = { ...plays.phases }
    const activationIds = { ...plays.activationIds }
    delete slots[expectedId]
    delete phases[expectedId]
    delete activationIds[expectedId]
    transaction.set(ref, { order: plays.order.slice(0, -1), slots, phases, activationIds, changedAt: serverTimestamp() })
    transaction.update(game, { updatedAt: serverTimestamp(), lastActionAt: serverTimestamp() })
  })
}
