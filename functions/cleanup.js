import { Timestamp } from 'firebase-admin/firestore'

const retentionMs = 8 * 24 * 60 * 60 * 1000
const pageSize = 100

export function cleanupCutoff(scheduleTime) {
  const scheduledAt = Date.parse(scheduleTime)
  if (!Number.isFinite(scheduledAt)) throw new Error('Missing or invalid Scheduler timestamp.')
  return Timestamp.fromMillis(scheduledAt - retentionMs)
}

export async function deleteExpiredGames(db, scheduleTime) {
  const cutoff = cleanupCutoff(scheduleTime)
  const eligible = db.collection('games').where('updatedAt', '<=', cutoff).orderBy('updatedAt')
  let cursor
  let deleted = 0

  while (true) {
    const page = await (cursor ? eligible.startAfter(cursor) : eligible).limit(pageSize).get()
    for (const game of page.docs) {
      const current = await game.ref.get()
      if (!current.exists) continue
      const updatedAt = current.get('updatedAt')
      const lastActionAt = current.get('lastActionAt') ?? updatedAt
      if (!(updatedAt instanceof Timestamp) || !(lastActionAt instanceof Timestamp) ||
          updatedAt.valueOf() > cutoff.valueOf() || lastActionAt.valueOf() > cutoff.valueOf()) continue

      // Keep the parent discoverable on retry if deleting any subcollection fails.
      for (const child of await current.ref.listCollections()) await db.recursiveDelete(child)
      await current.ref.delete()
      deleted += 1
    }
    if (page.size < pageSize) break
    cursor = page.docs.at(-1)
  }

  return { deleted, cutoff: cutoff.toDate().toISOString() }
}
