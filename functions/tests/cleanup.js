import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deleteApp, initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { cleanupCutoff, deleteExpiredGames } from '../cleanup.js'

const scheduleTime = '2026-12-14T09:00:00Z'

test('uses the scheduled UTC time minus eight days', () => {
  assert.equal(cleanupCutoff(scheduleTime).toDate().toISOString(), '2026-12-06T09:00:00.000Z')
  assert.throws(() => cleanupCutoff(undefined), /Scheduler timestamp/)
})

test('cleans at the inclusive time boundary and removes descendants', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async () => {
  const app = initializeApp({ projectId: 'demo-ganewtypeline-cleanup' })
  try {
    const db = getFirestore(app)
    const games = db.collection('games')
    const cutoff = cleanupCutoff(scheduleTime)
    const newer = Timestamp.fromMillis(cutoff.toMillis() + 1)
    const boundary = games.doc('CLEAN006')
    const older = games.doc('CLEAN005')
    const fresh = games.doc('KEEP0007')
    await Promise.all([
      boundary.set({ updatedAt: cutoff, lastActionAt: cutoff }),
      older.set({ updatedAt: Timestamp.fromMillis(cutoff.toMillis() - 1) }),
      fresh.set({ updatedAt: newer }),
      boundary.collection('tacticsDecks').doc('test').set({ cards: [] }),
      boundary.collection('tacticsPlays').doc('test').set({ order: [] }),
    ])

    assert.equal((await deleteExpiredGames(db, scheduleTime)).deleted, 2)
    assert.equal((await boundary.get()).exists, false)
    assert.equal((await older.get()).exists, false)
    assert.equal((await fresh.get()).exists, true)
    assert.equal((await boundary.collection('tacticsDecks').get()).empty, true)
    assert.equal((await boundary.collection('tacticsPlays').get()).empty, true)
    assert.equal((await deleteExpiredGames(db, scheduleTime)).deleted, 0)
  } finally {
    await deleteApp(app)
  }
})
