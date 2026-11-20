import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore'

import { createLobby, joinLobby, leaveLobby, moveTimelineUnit, setReady, subscribeToLobby } from './lobbyService'
import { getFirestoreService } from './firestoreService'
vi.mock('./firestoreService', () => ({ getFirestoreService: vi.fn() }))

let environment: RulesTestEnvironment
const game = { code: 'ABCD2345', matchSize: '3v3', playerOneTeam: 'RED', playerTwoTeam: 'BLUE', playerOneReady: false, playerTwoReady: false, playerOneSquad: [], playerTwoSquad: [], status: 'SETUP', ownerId: 'pc', playerOneId: 'pc', playerOneName: 'PC', playerTwoId: 'phone', playerTwoName: 'Phone', createdAt: new Date(), updatedAt: new Date() }

beforeAll(async () => { environment = await initializeTestEnvironment({ projectId: 'demo-ganewtypeline', firestore: { rules: readFileSync('firestore.rules', 'utf8') } }) })
afterAll(async () => environment.cleanup())

describe('Sprint 3: setup e regole', () => {
  for (const size of [3, 5]) {
    it(`persists simultaneous confirmations and starts ${size}v${size}`, async () => {
      const code = size === 3 ? 'READY333' : 'READY555'
      await environment.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), `games/${code}`), { ...game, code, matchSize: `${size}v${size}` }))
      const squad = Array.from({ length: size }, (_, i) => `placeholder-${i + 1}`)
      await Promise.all(['pc', 'phone'].map((uid, index) => {
        const db = environment.authenticatedContext(uid).firestore()
        vi.mocked(getFirestoreService).mockReturnValue(db as unknown as ReturnType<typeof getFirestoreService>)
        return setReady(code, uid, index === 0, squad)
      }))
      const saved = (await getDoc(doc(environment.authenticatedContext('pc').firestore(), `games/${code}`))).data()!
      expect(saved.status).toBe('ACTIVE')
      expect(saved.playerOneSquad).toEqual(squad)
      expect(saved.playerTwoSquad).toEqual(squad)
    })
  }
  it('rejects incomplete, duplicate and unknown squads, opponent edits and early start', async () => {
    const code = 'DENY1234'
    await environment.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), `games/${code}`), { ...game, code }))
    const ref = doc(environment.authenticatedContext('pc').firestore(), `games/${code}`)
    for (const squad of [['placeholder-1'], ['placeholder-1','placeholder-1','placeholder-2'], ['unknown','placeholder-1','placeholder-2']]) {
      await assertFails(updateDoc(ref, { playerOneSquad: squad, playerOneReady: true, updatedAt: serverTimestamp() }))
    }
    await assertFails(updateDoc(ref, { playerTwoReady: true, playerTwoSquad: ['placeholder-1','placeholder-2','placeholder-3'], updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(ref, { status: 'ACTIVE', updatedAt: serverTimestamp() }))
  })
  it('lets Player 2 leave and frees the slot', async () => {
    await environment.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), 'games/ABCD2345'), game))
    const phone = environment.authenticatedContext('phone').firestore()
    await assertSucceeds(updateDoc(doc(phone, 'games/ABCD2345'), { playerTwoId: null, playerTwoName: null, playerOneTeam: null, playerTwoTeam: null, status: 'WAITING', updatedAt: serverTimestamp() }))
    await assertSucceeds(getDoc(doc(environment.authenticatedContext('pc').firestore(), 'games/ABCD2345')))
  })

  it('lets Player 1 transfer the lobby to Player 2', async () => {
    const transferGame = { ...game, code: 'WXYZ6789' }
    await environment.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), 'games/WXYZ6789'), transferGame))
    const pc = environment.authenticatedContext('pc').firestore()
    await assertSucceeds(updateDoc(doc(pc, 'games/WXYZ6789'), { ownerId: 'phone', playerOneId: 'phone', playerOneName: 'Phone', playerTwoId: null, playerTwoName: null, playerOneTeam: null, playerTwoTeam: null, status: 'WAITING', updatedAt: serverTimestamp() }))
    await assertSucceeds(getDoc(doc(environment.authenticatedContext('phone').firestore(), 'games/WXYZ6789')))
  })
})

describe('ciclo completo tramite i servizi applicativi', () => {
  function asUser(uid: string) {
    const db = environment.authenticatedContext(uid).firestore()
    vi.mocked(getFirestoreService).mockReturnValue(db as unknown as ReturnType<typeof getFirestoreService>)
    return db
  }
  for (const format of ['3v3', '5v5'] as const) {
    it(format + ': crea, entra, conferma, esce, sostituisce il giocatore e avvia', async () => {
      asUser('pc')
      const code = await createLobby('pc', 'PC', format)
      asUser('phone')
      await joinLobby(code, 'phone', 'Phone')
      await joinLobby(code, 'phone', 'Phone') // QR / repeated effect is idempotent.
      const squad = Array.from({ length: format === '3v3' ? 3 : 5 }, (_, i) => 'placeholder-' + (i + 1))
      await setReady(code, 'phone', false, squad)
      await leaveLobby(code, 'phone')
      const pc = asUser('pc')
      let saved = (await getDoc(doc(pc, 'games', code))).data()!
      expect(saved.playerTwoId).toBeNull()
      expect(saved.playerTwoReady).toBe(false)
      expect(saved.playerTwoSquad).toEqual([])
      expect(saved.status).toBe('WAITING')
      asUser('replacement')
      await joinLobby(code, 'replacement', 'Replacement')
      await setReady(code, 'replacement', false, squad)
      asUser('pc')
      await setReady(code, 'pc', true, squad)
      saved = (await getDoc(doc(pc, 'games', code))).data()!
      expect(saved.status).toBe('ACTIVE')
      expect(saved.playerOneTeam).not.toBe(saved.playerTwoTeam)
      expect(saved.playerOneSquad).toEqual(squad)
      expect(saved.playerTwoSquad).toEqual(squad)
      await assertFails(updateDoc(doc(pc, 'games', code), { playerOneSquad: [...squad].reverse(), updatedAt: serverTimestamp() }))
      await assertFails(getDoc(doc(asUser('outsider'), 'games', code)))
    })
  }
  it('trasferisce la proprietà e cancella la lobby quando esce l’ultimo giocatore', async () => {
    asUser('pc')
    const code = await createLobby('pc', 'PC', '3v3')
    asUser('phone')
    await joinLobby(code, 'phone', 'Phone')
    asUser('pc')
    await leaveLobby(code, 'pc')
    const phone = asUser('phone')
    const saved = (await getDoc(doc(phone, 'games', code))).data()!
    expect(saved.ownerId).toBe('phone')
    expect(saved.playerOneName).toBe('Phone')
    expect(saved.playerTwoId).toBeNull()
    await leaveLobby(code, 'phone')
    await environment.withSecurityRulesDisabled(async context => {
      expect((await getDoc(doc(context.firestore(), 'games', code))).exists()).toBe(false)
    })
  })
  it('rifiuta conferme di estranei, modifiche alla squadra confermata e cambi formato', async () => {
    asUser('pc')
    const code = await createLobby('pc', 'PC', '3v3')
    asUser('phone')
    await joinLobby(code, 'phone', 'Phone')
    const squad = ['placeholder-1', 'placeholder-2', 'placeholder-3']
    await setReady(code, 'phone', false, squad)
    const phone = asUser('phone')
    await assertFails(updateDoc(doc(phone, 'games', code), { playerTwoSquad: [...squad].reverse(), updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(phone, 'games', code), { matchSize: '5v5', updatedAt: serverTimestamp() }))
    asUser('outsider')
    await expect(setReady(code, 'outsider', false, squad)).rejects.toBeDefined()
  })
})

it('notifica entrambi i client e ripristina le squadre dopo una nuova sottoscrizione', async () => {
  const pc = environment.authenticatedContext('pc').firestore()
  const phone = environment.authenticatedContext('phone').firestore()
  const use = (db: typeof pc) => vi.mocked(getFirestoreService).mockReturnValue(db as unknown as ReturnType<typeof getFirestoreService>)
  use(pc)
  const code = await createLobby('pc', 'PC', '3v3')
  use(phone)
  await joinLobby(code, 'phone', 'Phone')
  const pcUpdates: string[] = []
  const phoneUpdates: string[] = []
  const errors: Error[] = []
  use(pc)
  const stopPC = subscribeToLobby(code, game => { if (game) pcUpdates.push(game.status) }, error => errors.push(error))
  use(phone)
  const stopPhone = subscribeToLobby(code, game => { if (game) phoneUpdates.push(game.status) }, error => errors.push(error))
  const squad = ['placeholder-6', 'placeholder-1', 'placeholder-3']
  try {
    await setReady(code, 'phone', false, squad)
    use(pc)
    await setReady(code, 'pc', true, squad)
    await vi.waitFor(() => {
      expect(pcUpdates).toContain('ACTIVE')
      expect(phoneUpdates).toContain('ACTIVE')
    })
    let restored: string[] = []
    const stopReload = subscribeToLobby(code, game => { restored = game?.playerOneSquad ?? [] }, error => errors.push(error))
    try { await vi.waitFor(() => expect(restored).toEqual(squad)) } finally { stopReload() }
    expect(errors).toEqual([])
  } finally { stopPC(); stopPhone() }
})

it('saves manual moves independently for both players and rejects invalid edits', async () => {
  const code = 'MOVETL23'
  const squad = ['placeholder-1', 'placeholder-2', 'placeholder-3']
  const path = `games/${code}`
  await environment.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), path), {
    ...game, code, status: 'ACTIVE', playerOneReady: true, playerTwoReady: true,
    playerOneSquad: squad, playerTwoSquad: squad,
  }))

  const pc = environment.authenticatedContext('pc').firestore()
  const phone = environment.authenticatedContext('phone').firestore()
  vi.mocked(getFirestoreService).mockReturnValue(pc as unknown as ReturnType<typeof getFirestoreService>)
  const first = moveTimelineUnit(code, 'pc', 'placeholder-1', 1, 10)
  vi.mocked(getFirestoreService).mockReturnValue(phone as unknown as ReturnType<typeof getFirestoreService>)
  await Promise.all([first, moveTimelineUnit(code, 'phone', 'placeholder-1', 1, 4)])

  const ref = doc(pc, path)
  const saved = (await getDoc(ref)).data()
  expect(saved?.playerOneTimeline).toEqual({ 'placeholder-1': 10 })
  expect(saved?.playerTwoTimeline).toEqual({ 'placeholder-1': 4 })
  vi.mocked(getFirestoreService).mockReturnValue(pc as unknown as ReturnType<typeof getFirestoreService>)
  await expect(moveTimelineUnit(code, 'pc', 'placeholder-1', 1, 2)).rejects.toThrow('già stata spostata')
  await expect(moveTimelineUnit(code, 'pc', 'placeholder-1', 10, 11)).rejects.toThrow('TL 10')
  await assertFails(updateDoc(ref, { playerTwoTimeline: { 'placeholder-1': 7 }, updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(ref, { playerOneTimeline: { 'placeholder-1': 11 }, updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(ref, { playerOneTimeline: { 'placeholder-1': 10, 'placeholder-4': 7 }, updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(ref, { playerOneTimeline: { 'placeholder-1': 9, 'placeholder-2': 8 }, updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(ref, { playerOneTimeline: { 'placeholder-1': 9 }, status: 'WAITING', updatedAt: serverTimestamp() }))
  await moveTimelineUnit(code, 'pc', 'placeholder-1', 10, 1)
  expect((await getDoc(ref)).data()?.playerOneTimeline).toEqual({ 'placeholder-1': 1 })
})
