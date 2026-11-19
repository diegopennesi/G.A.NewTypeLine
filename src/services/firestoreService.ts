import { db } from './firebase'
export function getFirestoreService() { if (!db) throw new Error('Firestore richiede una configurazione Firebase valida.'); return db }
