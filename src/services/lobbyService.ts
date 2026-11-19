import { doc, onSnapshot, runTransaction, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore'
import type { Game } from '../models/game'
import { getFirestoreService } from './firestoreService'
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const normalize = (code: string) => code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
const reference = (code: string) => doc(getFirestoreService(), 'games', normalize(code))
export function createGameCode() { return Array.from(crypto.getRandomValues(new Uint8Array(8)), (value) => alphabet[value % alphabet.length]).join('') }
export async function createLobby(ownerId: string) { const code = createGameCode(); await setDoc(reference(code), { code, status: 'WAITING', ownerId, playerOneId: ownerId, playerTwoId: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); return code }
export async function joinLobby(code: string, playerId: string) { const gameCode = normalize(code); await runTransaction(getFirestoreService(), async (transaction) => { const snapshot = await transaction.get(reference(gameCode)); if (!snapshot.exists()) throw new Error('Partita non trovata. Verifica il codice condiviso.'); const game = snapshot.data(); if (game.playerOneId === playerId) return; if (game.status !== 'WAITING' || game.playerTwoId !== null) throw new Error('Questa partita ha già due giocatori.'); transaction.update(reference(gameCode), { playerTwoId: playerId, status: 'SETUP', updatedAt: serverTimestamp() }) }); return gameCode }
export function subscribeToLobby(code: string, onGame: (game: Game | null) => void, onError: (error: Error) => void): Unsubscribe { return onSnapshot(reference(code), (snapshot) => onGame(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Game : null), onError) }
