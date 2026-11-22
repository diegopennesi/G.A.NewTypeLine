import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'

import { createLobby, joinLobby, leaveLobby, moveTimelineUnit, setReady, subscribeToLobby, watchResumableMatches, type ResumableMatch } from './lobbyService'
import { drawnTacticsCards, type TacticsDeck, playTacticsCard, revertTacticsCard, saveTacticsDeck } from './tacticsService'
import { changeActivation, changeVictory, finishMatch } from './activationService'
import type { Game } from '../models/game'
import { activationQueue, initialActivation, nextActivation } from '../models/activation'
import { removePreset, saveAvatar, savePreset } from './accountService'
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
      const squad = size === 3 ? ['ST01-U001', 'EX01-U02', 'PA01-U03']
        : Array.from({ length: size }, (_, i) => `placeholder-${i + 1}`)
      await Promise.all(['pc', 'phone'].map((uid, index) => {
        const db = environment.authenticatedContext(uid).firestore()
        vi.mocked(getFirestoreService).mockReturnValue(db as unknown as ReturnType<typeof getFirestoreService>)
        return setReady(code, uid, index === 0, squad)
      }))
      const saved = (await getDoc(doc(environment.authenticatedContext('pc').firestore(), `games/${code}`))).data()!
      expect(saved.status).toBe('ACTIVE')
      expect(saved.playerOneSquad).toEqual(squad)
      expect(saved.playerTwoSquad).toEqual(squad)
      if (size === 3) {
        expect(initialActivation(saved as Game).units.slice(0, 3).map(unit => unit.time)).toEqual([2, 1, 2])
      }
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
  it('trasferisce la proprietà e chiude la lobby quando esce l’ultimo giocatore', async () => {
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
      expect((await getDoc(doc(context.firestore(), 'games', code))).data()?.status).toBe('FINISHED')
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
  await assertFails(updateDoc(ref, { playerTwoTimeline: { 'placeholder-1': 7 }, updatedAt: serverTimestamp(), lastActionAt: serverTimestamp() }))
  await assertFails(updateDoc(ref, { playerOneTimeline: { 'placeholder-1': 11 }, updatedAt: serverTimestamp(), lastActionAt: serverTimestamp() }))
  await assertFails(updateDoc(ref, { playerOneTimeline: { 'placeholder-1': 10, 'placeholder-4': 7 }, updatedAt: serverTimestamp(), lastActionAt: serverTimestamp() }))
  await assertFails(updateDoc(ref, { playerOneTimeline: { 'placeholder-1': 9, 'placeholder-2': 8 }, updatedAt: serverTimestamp(), lastActionAt: serverTimestamp() }))
  await assertFails(updateDoc(ref, { playerOneTimeline: { 'placeholder-1': 9 }, status: 'WAITING', updatedAt: serverTimestamp(), lastActionAt: serverTimestamp() }))
  await moveTimelineUnit(code, 'pc', 'placeholder-1', 10, 1)
  expect((await getDoc(ref)).data()?.playerOneTimeline).toEqual({ 'placeholder-1': 1 })
})

it('keeps decks private and lets each player reveal and revert only their own tactics', async () => {
  const code = 'TACTIC23'
  const path = `games/${code}`
  const pc = environment.authenticatedContext('pc').firestore()
  const phone = environment.authenticatedContext('phone').firestore()
  const outsider = environment.authenticatedContext('outsider').firestore()
  const cards = Array.from({ length: 9 }, (_, i) => `tactic-0${i + 1}`)
  await environment.withSecurityRulesDisabled(context => setDoc(doc(context.firestore(), path), { ...game, code }))
  vi.mocked(getFirestoreService).mockReturnValue(pc as unknown as ReturnType<typeof getFirestoreService>)
  await saveTacticsDeck(code, 'pc', cards)
  await assertSucceeds(getDoc(doc(pc, path, 'tacticsDecks', 'pc')))
  await assertFails(getDoc(doc(phone, path, 'tacticsDecks', 'pc')))
  await assertFails(setDoc(doc(phone, path, 'tacticsDecks', 'pc'), { cards }))
  await assertFails(setDoc(doc(pc, path, 'tacticsDecks', 'pc'), { cards: Array(9).fill(cards[0]) }))
  await assertFails(playTacticsCard(code, 'pc', cards[0], 3))

  const squad = ['placeholder-1', 'placeholder-2', 'placeholder-3']
  await environment.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), path), {
    status: 'ACTIVE', playerOneReady: true, playerTwoReady: true, playerOneSquad: squad, playerTwoSquad: squad,
  }))
  await assertFails(saveTacticsDeck(code, 'pc', cards))
  await assertFails(playTacticsCard(code, 'pc', 'tactic-10', 3))
  await assertFails(playTacticsCard(code, 'pc', cards[0], 11))
  await playTacticsCard(code, 'pc', cards[0], 3)
  await playTacticsCard(code, 'pc', cards[1], 3)
  await moveTimelineUnit(code, 'pc', squad[0], 1, 7)

  const opponentView = doc(phone, path, 'tacticsPlays', 'pc')
  expect((await getDoc(opponentView)).data()).toMatchObject({
    order: cards.slice(0, 2), slots: { [cards[0]]: 3, [cards[1]]: 3 },
  })
  await assertFails(getDoc(doc(outsider, path, 'tacticsPlays', 'pc')))
  await assertFails(updateDoc(opponentView, { order: [cards[0]], slots: { [cards[0]]: 3 } }))
  await assertFails(updateDoc(doc(pc, path, 'tacticsPlays', 'pc'), { slots: { [cards[0]]: 7, [cards[1]]: 3 } }))
  await expect(revertTacticsCard(code, 'pc', cards[0])).rejects.toThrow('ultima carta')
  await revertTacticsCard(code, 'pc', cards[1])
  expect((await getDoc(opponentView)).data()).toMatchObject({ order: [cards[0]], slots: { [cards[0]]: 3 } })
  await playTacticsCard(code, 'pc', cards[1], 8)
  const replay = (await getDoc(opponentView)).data()
  expect(replay?.slots[cards[1]]).toBe(8)
  expect((await getDoc(doc(pc, path))).data()?.lastActionAt.isEqual(replay?.changedAt)).toBe(true)
})

it('lists resumable matches for both seats, including inactive browser sessions', async () => {
  const squad = ['placeholder-1', 'placeholder-2', 'placeholder-3']
  const active = { ...game, status: 'ACTIVE', playerOneReady: true, playerTwoReady: true, playerOneSquad: squad, playerTwoSquad: squad }
  await environment.withSecurityRulesDisabled(async context => { await Promise.all([
    setDoc(doc(context.firestore(), 'games/REJOIN23'), { ...active, code: 'REJOIN23', updatedAt: new Date(0) }),
    setDoc(doc(context.firestore(), 'games/REJOIN24'), { ...active, code: 'REJOIN24', status: 'FINISHED' }),
    setDoc(doc(context.firestore(), 'games/REJOIN25'), { ...active, code: 'REJOIN25', ownerId: 'other', playerOneId: 'other', playerTwoId: 'another' }),
  ]) });
  for (const [uid, opponent] of [['pc', 'Phone'], ['phone', 'PC']]) {
    vi.mocked(getFirestoreService).mockReturnValue(environment.authenticatedContext(uid).firestore() as unknown as ReturnType<typeof getFirestoreService>)
    const matches = await new Promise<ResumableMatch[]>((resolve, reject) => {
      const stop = watchResumableMatches(uid, matches => { stop(); resolve(matches) }, reject)
    })
    expect(matches).toContainEqual({ code: 'REJOIN23', matchSize: '3v3', status: 'ACTIVE', opponent, expiresAt: 3_600_000, lastMoveAt: null })
    expect(matches.some(match => ['REJOIN24', 'REJOIN25'].includes(match.code))).toBe(false)
  }
})

it('expires old lobbies and denies moves that would revive an expired match', async () => {
  const activeCode = 'EXPIRE23'
  const lobbyCode = 'EXPIRE24'
  const liveCode = 'EXPIRE25'
  const activePath = `games/${activeCode}`
  const squad = ['placeholder-1', 'placeholder-2', 'placeholder-3']
  const active = { ...game, status: 'ACTIVE', playerOneReady: true, playerTwoReady: true, playerOneSquad: squad, playerTwoSquad: squad }
  const old = new Date(Date.now() - 2 * 60 * 60 * 1000)
  await environment.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    await setDoc(doc(db, activePath), { ...active, code: activeCode, updatedAt: old })
    await setDoc(doc(db, activePath, 'tacticsDecks', 'pc'), { cards: ['tactic-01'] })
    await setDoc(doc(db, 'games', liveCode), { ...active, code: liveCode, updatedAt: new Date() })
  })

  const pc = environment.authenticatedContext('pc').firestore()
  vi.mocked(getFirestoreService).mockReturnValue(pc as unknown as ReturnType<typeof getFirestoreService>)
  await expect(joinLobby(activeCode, 'pc', 'PC')).rejects.toThrow('scaduta')
  await assertFails(moveTimelineUnit(activeCode, 'pc', squad[0], 1, 7))
  await assertFails(playTacticsCard(activeCode, 'pc', 'tactic-01', 3))
  await assertFails(updateDoc(doc(pc, 'games', liveCode), { updatedAt: serverTimestamp(), lastActionAt: serverTimestamp() }))
  await moveTimelineUnit(liveCode, 'pc', squad[0], 1, 8)
  expect((await getDoc(doc(pc, 'games', liveCode))).data()?.lastActionAt.toMillis()).toBeGreaterThan(old.getTime())

  await environment.withSecurityRulesDisabled(async context => {
    const lobby = { ...game, code: lobbyCode, status: 'WAITING', playerTwoId: null, playerTwoName: null, playerOneTeam: null, playerTwoTeam: null, updatedAt: old }
    await setDoc(doc(context.firestore(), 'games', lobbyCode), lobby)
  })
  const phone = environment.authenticatedContext('phone').firestore()
  vi.mocked(getFirestoreService).mockReturnValue(phone as unknown as ReturnType<typeof getFirestoreService>)
  await expect(joinLobby(lobbyCode, 'phone', 'Phone')).rejects.toThrow('scaduta')
  await assertFails(updateDoc(doc(phone, 'games', lobbyCode), {
    playerTwoId: 'phone', playerTwoName: 'Phone', playerOneTeam: 'RED', playerTwoTeam: 'BLUE',
    status: 'SETUP', updatedAt: serverTimestamp(),
  }))
})

it('coordinates activation, fixed tactic markers, phase wrap and out-of-turn effects', async () => {
  const code = 'TURNAB23'
  const path = `games/${code}`
  const squad = ['placeholder-1', 'placeholder-2', 'placeholder-3']
  const positions = Object.fromEntries(squad.map((id, index) => [id, index < 2 ? 8 : 10]))
  await environment.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    await setDoc(doc(db, path), {
      ...game, code, status: 'ACTIVE', playerOneReady: true, playerTwoReady: true,
      playerOneSquad: squad, playerTwoSquad: squad, playerOneTimeline: positions, playerTwoTimeline: positions,
    })
    await Promise.all(['pc', 'phone'].map(uid => setDoc(doc(db, path, 'tacticsDecks', uid), {
      cards: ['tactic-01', 'tactic-02', 'tactic-03', 'tactic-04', 'tactic-05', 'tactic-06', 'tactic-07', 'tactic-08', 'tactic-11'],
    })))
  })
  const pc = environment.authenticatedContext('pc').firestore()
  const phone = environment.authenticatedContext('phone').firestore()
  const use = (db: typeof pc) => vi.mocked(getFirestoreService).mockReturnValue(db as unknown as ReturnType<typeof getFirestoreService>)
  use(pc)
  await expect(changeActivation(code, 'pc', 0, { kind: 'start', key: 'one/placeholder-1' })).rejects.toThrow('ancora')
  let state = await changeActivation(code, 'pc', 0, { kind: 'initiative', one: 9, two: 3 })
  expect(nextActivation(state).unit?.key).toBe('one/placeholder-1')
  await expect(changeActivation(code, 'pc', 1, { kind: 'start', key: 'one/placeholder-2' })).rejects.toThrow('ancora')
  state = await changeActivation(code, 'pc', 1, { kind: 'start', key: 'one/placeholder-1' })
  state = await changeActivation(code, 'pc', 2, { kind: 'pay', delta: 4 })
  expect(state.units.at(-1)?.time).toBe(12)
  expect(state.current?.time).toBe(8)
  await expect(changeActivation(code, 'pc', 2, { kind: 'end' })).rejects.toThrow('cambiata')
  await assertFails(moveTimelineUnit(code, 'pc', squad[0], 8, 9))
  await expect(playTacticsCard(code, 'pc', 'tactic-01', 2, 2)).rejects.toThrow('non è giocabile')
  await playTacticsCard(code, 'pc', 'tactic-01', 8, 2)
  await expect(playTacticsCard(code, 'pc', 'tactic-02', 8, 2)).rejects.toThrow('non è giocabile')
  use(phone)
  await expect(playTacticsCard(code, 'phone', 'tactic-01', 8, 2)).rejects.toThrow('non è giocabile')
  await playTacticsCard(code, 'phone', 'tactic-11', 8, 2)
  await expect(changeActivation(code, 'phone', 3, { kind: 'end' })).rejects.toThrow('costo')
  state = await changeActivation(code, 'phone', 3, { kind: 'effect', key: 'two/placeholder-3', delta: -1 })
  expect(state.current?.key).toBe('one/placeholder-1')
  expect(state.units.at(-1)?.time).toBe(9)
  state = await changeActivation(code, 'phone', 4, { kind: 'defeat', key: 'one/placeholder-1' })
  expect(state.current).toBeNull()
  expect(state.units.at(-1)).toMatchObject({ key: 'one/placeholder-1', time: 14, reserve: true })
  expect(nextActivation(state).unit?.key).toBe('two/placeholder-1')
  expect((await getDoc(doc(phone, path, 'tacticsPlays', 'pc'))).data()).toMatchObject({
    slots: { 'tactic-01': 8 }, phases: { 'tactic-01': 1 },
  })
  state = await changeActivation(code, 'phone', 5, { kind: 'start', key: 'two/placeholder-1' })
  await expect(changeActivation(code, 'phone', 6, { kind: 'effect', key: 'two/placeholder-3', delta: -2 })).rejects.toThrow('round corrente')
  state = await changeActivation(code, 'phone', 6, { kind: 'pay', delta: 1 })
  const destinationPile = state.units.filter(unit => unit.seat === 'two' && unit.time === 9)
  expect(destinationPile.map(unit => unit.key)).toEqual(['two/placeholder-3', 'two/placeholder-1'])
  state = await changeActivation(code, 'phone', 7, { kind: 'end' })
  expect(state.current).toBeNull()
  expect(nextActivation(state).unit?.key).toBe('one/placeholder-2')

})

it('registers official tactics in the correct reaction window and resumes the activation after a pass', async () => {
  const code = 'REACT123'
  const path = `games/${code}`
  const one = ['ST01-U001', 'ST01-U002', 'ST01-U005']
  const two = ['ST01-U002', 'ST01-U005', 'placeholder-4']
  const deck = ['ST01-T01', 'ST01-T02', 'ST01-T03', 'ST01-T04', 'ST01-T05', 'ST01-T06', 'ST01-T07', 'ST01-T08', 'ST01-T09']
  await environment.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    await setDoc(doc(db, path), {
      ...game, code, status: 'SETUP', playerOneSquad: one, playerTwoSquad: two,
    })
  })
  const pc = environment.authenticatedContext('pc').firestore()
  const phone = environment.authenticatedContext('phone').firestore()
  const use = (db: typeof pc) => vi.mocked(getFirestoreService).mockReturnValue(db as unknown as ReturnType<typeof getFirestoreService>)
  use(pc)
  await saveTacticsDeck(code, 'pc', deck)
  await setReady(code, 'pc', true, one)
  use(phone)
  await saveTacticsDeck(code, 'phone', deck)
  await setReady(code, 'phone', false, two)
  use(pc)
  await changeActivation(code, 'pc', 0, { kind: 'start', key: 'one/ST01-U001' })
  await playTacticsCard(code, 'pc', 'ST01-T01', 2, 1)
  await changeActivation(code, 'pc', 1, { kind: 'pay', delta: 3 })
  await changeActivation(code, 'pc', 2, { kind: 'openReaction', timing: 'beforeRoll' })
  await expect(changeActivation(code, 'pc', 3, { kind: 'end' })).rejects.toThrow()
  use(phone)
  await expect(playTacticsCard(code, 'phone', 'ST01-T09', 2, 1)).rejects.toThrow('non è giocabile')
  await playTacticsCard(code, 'phone', 'ST01-T08', 2, 1)
  await changeActivation(code, 'phone', 3, { kind: 'closeReaction' })
  use(pc)
  const done = await changeActivation(code, 'pc', 4, { kind: 'end' })
  expect(done.current).toBeNull()
  expect((await getDoc(doc(pc, path, 'tacticsPlays', 'phone'))).data()).toMatchObject({
    slots: { 'ST01-T08': 2 }, phases: { 'ST01-T08': 1 },
  })
})

it('lets a participant finish a completed match and prevents early closure', async () => {
  const code = 'FINISH23'
  const path = `games/${code}`
  const squad = ['ST01-U001', 'ST01-U002', 'ST01-U003']
  const units = ['one', 'two'].flatMap(seat => squad.map(id => ({
    key: `${seat}/${id}`, id, seat, time: 21, reserve: false,
  })))
  const context = environment.authenticatedContext('pc')
  const db = context.firestore()
  const ref = doc(db, path)
  vi.mocked(getFirestoreService).mockReturnValue(db as unknown as ReturnType<typeof getFirestoreService>)
  await environment.withSecurityRulesDisabled(admin => setDoc(doc(admin.firestore(), path), {
    ...game, code, status: 'ACTIVE', playerOneSquad: squad, playerTwoSquad: squad,
    playerOneReady: true, playerTwoReady: true,
    activation: { version: 2, round: 20, current: null, lastSeat: 'two', units: [{ ...units[0], time: 20 }, ...units.slice(1)] },
  }))
  await expect(finishMatch(code, 'pc', 'RED')).rejects.toThrow('entrambe le fasi')
  await assertFails(updateDoc(ref, { status: 'FINISHED', finishedAt: serverTimestamp(), updatedAt: serverTimestamp() }))
  await environment.withSecurityRulesDisabled(admin => updateDoc(doc(admin.firestore(), path), { 'activation.units': units }))
  await assertFails(updateDoc(ref, { status: 'FINISHED', finishedAt: serverTimestamp(), updatedAt: serverTimestamp() }))
  await assertFails(updateDoc(ref, { status: 'FINISHED', result: 'INVALID', finishedAt: serverTimestamp(), updatedAt: serverTimestamp() }))
  await finishMatch(code, 'pc', 'RED')
  await finishMatch(code, 'pc', 'BLUE')
  const otherRef = doc(environment.authenticatedContext('phone').firestore(), path)
  const saved = (await getDoc(otherRef)).data()
  expect(saved?.status).toBe('FINISHED')
  expect(saved?.finishedAt.isEqual(saved.updatedAt)).toBe(true)
  expect(saved?.result).toBe('RED')
})

it('keeps random draws private, unlocks three more at the second phase and keeps the last three covered', async () => {
  const pc = environment.authenticatedContext('pc').firestore()
  const phone = environment.authenticatedContext('phone').firestore()
  vi.mocked(getFirestoreService).mockReturnValue(pc as unknown as ReturnType<typeof getFirestoreService>)
  const code = await createLobby('pc', 'PC', '3v3', true)
  const ref = doc(pc, 'games', code)
  const privateRef = doc(ref, 'tacticsDecks', 'pc')
  expect((await getDoc(privateRef)).data()).toEqual({ cards: [], randomized: true })
  const cards = ['ST01-T04', 'ST01-T05', 'ST01-T06', 'ST01-T07', 'ST01-T13', 'ST01-T14', 'ST01-T15', 'EX02-T04', 'EX02-T05']
  await saveTacticsDeck(code, 'pc', cards, true)
  const deck = (await getDoc(privateRef)).data() as TacticsDeck
  expect(new Set(deck.cards)).toEqual(new Set(cards))
  const squad = ['ST01-U001', 'ST01-U002', 'ST01-U003']
  const units = ['one', 'two'].flatMap(seat => squad.map((id, index) => ({
    key: `${seat}/${id}`, id, seat, time: seat === 'one' ? (index === 0 ? 10 : 12) : 9, reserve: false,
  })))
  await environment.withSecurityRulesDisabled(context => updateDoc(doc(context.firestore(), 'games', code), {
    status: 'ACTIVE', playerOneSquad: squad, playerTwoSquad: squad, playerTwoId: 'phone', playerTwoName: 'Phone',
    playerOneTeam: 'RED', playerTwoTeam: 'BLUE', playerOneReady: true, playerTwoReady: true,
    activation: { version: 1, round: 10, lastSeat: 'two', current: { key: units[0].key, time: 10, paid: false, id: 1 }, units },
  }))
  await assertFails(getDoc(doc(phone, 'games', code, 'tacticsDecks', 'pc')))
  expect(drawnTacticsCards(deck, (await getDoc(ref)).data() as Game, 'pc')).toEqual(deck.cards.slice(0, 3))
  await expect(playTacticsCard(code, 'pc', deck.cards[3], 10, 1)).rejects.toThrow('non è ancora stata pescata')
  const forbidden = writeBatch(pc)
  forbidden.set(doc(ref, 'tacticsPlays', 'pc'), {
    order: [deck.cards[3]], slots: { [deck.cards[3]]: 10 }, phases: { [deck.cards[3]]: 1 },
    activationIds: { [deck.cards[3]]: 1 }, changedAt: serverTimestamp(),
  })
  forbidden.update(ref, { updatedAt: serverTimestamp(), lastActionAt: serverTimestamp() })
  await assertFails(forbidden.commit())
  await changeActivation(code, 'pc', 1, { kind: 'pay', delta: 1 })
  const updated = (await getDoc(ref)).data() as Game
  expect(updated.activation?.phaseTwoSeats).toEqual(['one'])
  expect(drawnTacticsCards(deck, updated, 'pc')).toEqual(deck.cards.slice(0, 6))
  await expect(playTacticsCard(code, 'pc', deck.cards[6], 10, 1)).rejects.toThrow('non è ancora stata pescata')
  await changeActivation(code, 'pc', 2, { kind: 'effect', key: units[1].key, delta: -2 })
  expect(drawnTacticsCards(deck, (await getDoc(ref)).data() as Game, 'pc')).toEqual(deck.cards.slice(0, 6))
  await playTacticsCard(code, 'pc', deck.cards[3], 10, 1)
  const played = (await getDoc(doc(phone, 'games', code, 'tacticsPlays', 'pc'))).data()
  expect(played?.order).toEqual([deck.cards[3]])
  expect((await getDoc(privateRef)).data()).toEqual(deck)
})

it('protects personal avatars and presets and can apply a saved squad and deck to a lobby', async () => {
  const pc = environment.authenticatedContext('pc').firestore()
  const phone = environment.authenticatedContext('phone').firestore()
  vi.mocked(getFirestoreService).mockReturnValue(pc as unknown as ReturnType<typeof getFirestoreService>)
  const profile = doc(pc, 'accounts', 'pc')
  const units = ['ST01-U001', 'ST01-U003', 'ST01-U006']
  const cards = ['ST01-T01', 'ST01-T02', 'ST01-T03', 'ST01-T04', 'ST01-T05', 'ST01-T06', 'ST01-T07', 'ST01-T08', 'ST01-T09']
  await saveAvatar('pc', 'young-male')
  expect((await getDoc(profile)).data()?.avatar).toBe('young-male')
  await assertFails(setDoc(profile, { avatar: 'data:image/webp;base64,UklGRg==' }))
  await assertFails(setDoc(profile, { avatar: 'custom' }))
  await assertFails(setDoc(profile, { avatar: 'https://example.com/profile.png' }))
  await assertFails(getDoc(doc(phone, 'accounts', 'pc')))
  await savePreset('pc', { id: 'test-squad', kind: 'squad', name: 'Squadra 3v3', cards: units })
  await savePreset('pc', { id: 'test-deck', kind: 'deck', name: 'Mazzo', cards })
  await assertFails(setDoc(doc(profile, 'presets', 'bad'), { kind: 'squad', name: 'Errata', cards: ['unknown', ...units.slice(1)] }))
  await assertFails(getDoc(doc(phone, 'accounts', 'pc', 'presets', 'test-deck')))

  const code = await createLobby('pc', 'PC', '3v3')
  const savedSquad = (await getDoc(doc(profile, 'presets', 'test-squad'))).data()?.cards
  const savedDeck = (await getDoc(doc(profile, 'presets', 'test-deck'))).data()?.cards
  vi.mocked(getFirestoreService).mockReturnValue(phone as unknown as ReturnType<typeof getFirestoreService>)
  await joinLobby(code, 'phone', 'Phone')
  vi.mocked(getFirestoreService).mockReturnValue(pc as unknown as ReturnType<typeof getFirestoreService>)
  await saveTacticsDeck(code, 'pc', savedDeck)
  await setReady(code, 'pc', true, savedSquad)
  await removePreset('pc', 'test-deck')
  expect((await getDoc(doc(pc, 'games', code))).data()?.playerOneSquad).toEqual(units)
  expect((await getDoc(doc(pc, 'games', code, 'tacticsDecks', 'pc'))).data()?.cards).toEqual(cards)
  await saveAvatar('pc', null)
  expect((await getDoc(profile)).data()?.avatar).toBeNull()
})

it('orders targets and synchronizes destruction, Garrison and manual VP for both players', async () => {
  const code = 'VICTORY2'
  const active = {
    ...game, code, status: 'ACTIVE', updatedAt: new Date(),
    playerOneSquad: ['EX01-U02', 'ST01-U001', 'ST01-U003'],
    playerTwoSquad: ['ST01-U002', 'ST01-U004', 'ST01-U005'],
  }
  await environment.withSecurityRulesDisabled(admin => setDoc(doc(admin.firestore(), 'games', code), active))
  const pc = environment.authenticatedContext('pc').firestore()
  const phone = environment.authenticatedContext('phone').firestore()
  const use = (db: typeof pc) => vi.mocked(getFirestoreService).mockReturnValue(db as unknown as ReturnType<typeof getFirestoreService>)
  const ref = doc(phone, 'games', code)
  const target = 'one/EX01-U02'
  use(pc)
  await changeVictory(code, 'pc', 'subtract')
  await changeActivation(code, 'pc', 0, { kind: 'start', key: target })
  const paid = await changeActivation(code, 'pc', 1, { kind: 'pay', delta: 4 })
  expect(activationQueue(paid).slice(0, 4).map(unit => unit.key)).toEqual([
    target, 'two/ST01-U004', 'one/ST01-U001', 'one/ST01-U003',
  ])
  use(phone)
  const defeated = await changeActivation(code, 'phone', 2, { kind: 'defeat', key: target })
  expect(defeated.units.at(-1)).toMatchObject({ key: target, time: 7, reserve: true })
  await expect(changeActivation(code, 'phone', 3, { kind: 'defeat', key: target })).rejects.toThrow('Effetto non valido')
  await Promise.all([changeVictory(code, 'phone', 'captured'), changeVictory(code, 'phone', 'rescued')])
  await changeVictory(code, 'phone', 'add')
  await changeVictory(code, 'phone', 'subtract')
  const saved = (await getDoc(doc(pc, 'games', code))).data()?.victory
  expect(saved.two).toEqual({ destroyed: 5, manual: 0, captured: 1, rescued: 1 })
  expect(saved.one).toBeUndefined()
  await assertFails(updateDoc(ref, { 'victory.one.manual': 1, updatedAt: serverTimestamp(), lastActionAt: serverTimestamp() }))
  await assertFails(updateDoc(ref, { 'victory.two.destroyed': 100, updatedAt: serverTimestamp(), lastActionAt: serverTimestamp() }))
})
