import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, it } from 'vitest'
import { assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore'

let environment: RulesTestEnvironment
const game = { code: 'ABCD2345', matchSize: '3v3', status: 'SETUP', ownerId: 'pc', playerOneId: 'pc', playerOneName: 'PC', playerTwoId: 'phone', playerTwoName: 'Phone', createdAt: new Date(), updatedAt: new Date() }

beforeAll(async () => { environment = await initializeTestEnvironment({ projectId: 'demo-ganewtypeline', firestore: { rules: readFileSync('firestore.rules', 'utf8') } }) })
afterAll(async () => environment.cleanup())

describe('lobby exit', () => {
  it('lets Player 2 leave and frees the slot', async () => {
    await environment.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), 'games/ABCD2345'), game))
    const phone = environment.authenticatedContext('phone').firestore()
    await assertSucceeds(updateDoc(doc(phone, 'games/ABCD2345'), { playerTwoId: null, playerTwoName: null, status: 'WAITING', updatedAt: serverTimestamp() }))
    await assertSucceeds(getDoc(doc(environment.authenticatedContext('pc').firestore(), 'games/ABCD2345')))
  })

  it('lets Player 1 transfer the lobby to Player 2', async () => {
    const transferGame = { ...game, code: 'WXYZ6789' }
    await environment.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), 'games/WXYZ6789'), transferGame))
    const pc = environment.authenticatedContext('pc').firestore()
    await assertSucceeds(updateDoc(doc(pc, 'games/WXYZ6789'), { ownerId: 'phone', playerOneId: 'phone', playerOneName: 'Phone', playerTwoId: null, playerTwoName: null, status: 'WAITING', updatedAt: serverTimestamp() }))
    await assertSucceeds(getDoc(doc(environment.authenticatedContext('phone').firestore(), 'games/WXYZ6789')))
  })
})
