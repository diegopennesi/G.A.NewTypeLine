import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { info } from 'firebase-functions/logger'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { deleteExpiredGames } from './cleanup.js'

initializeApp()

export const cleanupExpiredGames = onSchedule({
  schedule: '0 9 * * 1',
  timeZone: 'Etc/UTC',
  timeoutSeconds: 900,
  concurrency: 1,
  maxInstances: 1,
  retryCount: 3,
}, async event => {
  const result = await deleteExpiredGames(getFirestore(), event.scheduleTime)
  info('Weekly game cleanup completed', result)
})
