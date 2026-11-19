import { placeholderUnits } from '../data/placeholderUnits'
import { doc, onSnapshot, runTransaction, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore'
import type { Game } from '../models/game'
import type { MatchSize } from '../models/game'
import { getFirestoreService } from './firestoreService'
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const normalize = (code: string) => code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
const reference = (code: string) => doc(getFirestoreService(), 'games', normalize(code))
export function createGameCode() { return Array.from(crypto.getRandomValues(new Uint8Array(8)), (value) => alphabet[value % alphabet.length]).join('') }
export async function createLobby(ownerId: string, ownerName: string, matchSize: MatchSize) { const code = createGameCode(); await setDoc(reference(code), { code, matchSize, status: 'WAITING', ownerId, playerOneId: ownerId, playerOneName: ownerName, playerTwoId: null, playerTwoName: null, playerOneTeam: null, playerTwoTeam: null, playerOneSquad: [], playerTwoSquad: [], playerOneReady: false, playerTwoReady: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); return code }
export async function joinLobby(code: string, playerId: string, playerName: string) { const gameCode = normalize(code); await runTransaction(getFirestoreService(), async (transaction) => { const snapshot = await transaction.get(reference(gameCode)); if (!snapshot.exists()) throw new Error('Partita non trovata. Verifica il codice condiviso.'); const game = snapshot.data(); if (game.playerOneId === playerId || game.playerTwoId === playerId) return; if (game.status !== 'WAITING' || game.playerTwoId !== null) throw new Error('Questa partita ha già due giocatori.'); const playerOneTeam = Math.random() < .5 ? 'RED' : 'BLUE'; transaction.update(reference(gameCode), { playerTwoId: playerId, playerTwoName: playerName, playerOneTeam, playerTwoTeam: playerOneTeam === 'RED' ? 'BLUE' : 'RED', status: 'SETUP', updatedAt: serverTimestamp() }) }); return gameCode }
export async function setReady(code: string, playerId: string, playerOne: boolean, squad: string[]) {
  const db = getFirestoreService()
  const ref = doc(db, 'games', normalize(code))
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists()) throw new Error('Partita non trovata.')
    const game = snapshot.data()
    if ((playerOne ? game.playerOneId : game.playerTwoId) !== playerId) throw new Error('Non puoi modificare questa partita.')
    if (game.status === 'ACTIVE') return
    if (game.status !== 'SETUP' || squad.length !== (game.matchSize === '3v3' ? 3 : 5) ||
        new Set(squad).size !== squad.length || squad.some(id => !placeholderUnits.some(unit => unit.id === id))) {
      throw new Error('Squadra non valida.')
    }
    if (playerOne ? game.playerOneReady : game.playerTwoReady) return
    transaction.update(ref, {
      ...(playerOne ? { playerOneReady: true, playerOneSquad: squad } : { playerTwoReady: true, playerTwoSquad: squad }),
      updatedAt: serverTimestamp(),
    })
  })
  // Separate confirmation from activation: concurrent confirmations may both
  // commit before either client sees the other player's readiness.
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref)
    const game = snapshot.data()
    if (game?.status === 'SETUP' && game.playerOneReady && game.playerTwoReady) {
      transaction.update(ref, { status: 'ACTIVE', updatedAt: serverTimestamp() })
    }
  })
}
export async function leaveLobby(code: string, playerId: string) { await runTransaction(getFirestoreService(), async (transaction) => { const snapshot = await transaction.get(reference(code)); if (!snapshot.exists()) return; const game = snapshot.data(); if (game.status === 'ACTIVE') throw new Error('La partita è già avviata.'); const reset = { playerOneSquad: [], playerTwoSquad: [], playerOneReady: false, playerTwoReady: false, playerOneTeam: null, playerTwoTeam: null }; if (game.playerTwoId === playerId) transaction.update(reference(code), { ...reset, playerTwoId: null, playerTwoName: null, status: 'WAITING', updatedAt: serverTimestamp() }); else if (game.playerOneId === playerId && game.playerTwoId) transaction.update(reference(code), { ...reset, ownerId: game.playerTwoId, playerOneId: game.playerTwoId, playerOneName: game.playerTwoName, playerTwoId: null, playerTwoName: null, status: 'WAITING', updatedAt: serverTimestamp() }); else if (game.playerOneId === playerId) transaction.delete(reference(code)); }) }
export function subscribeToLobby(code: string, onGame: (game: Game | null) => void, onError: (error: Error) => void): Unsubscribe { return onSnapshot(reference(code), (snapshot) => onGame(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Game : null), onError) }
