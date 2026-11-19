import { GoogleAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut, type User } from 'firebase/auth'
import { auth } from './firebase'
function getConfiguredAuth() { if (!auth) throw new Error('Firebase non è configurato. Compila .env.local usando .env.example.'); return auth }
export function listenToAuthState(onUser: (user: User | null) => void, onReady: () => void) { return onAuthStateChanged(getConfiguredAuth(), (user) => { onUser(user); onReady() }) }
export async function signInWithEmail(email: string, password: string) { await signInWithEmailAndPassword(getConfiguredAuth(), email, password) }
export async function signUpWithEmail(email: string, password: string) { await createUserWithEmailAndPassword(getConfiguredAuth(), email, password) }
export async function signInWithGoogle() { await signInWithPopup(getConfiguredAuth(), new GoogleAuthProvider()) }
export async function signOutUser() { await signOut(getConfiguredAuth()) }
