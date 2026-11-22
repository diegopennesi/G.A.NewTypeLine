import { findAvatar, type AvatarId } from '../data/avatars'
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { getFirestoreService } from './firestoreService'

export type Preset = { id: string; kind: 'squad' | 'deck'; name: string; cards: string[] }

export function watchPresets(uid: string, onPresets: (presets: Preset[]) => void, onError: (error: Error) => void) {
  return onSnapshot(collection(getFirestoreService(), 'accounts', uid, 'presets'), snapshot => {
    onPresets(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as Preset))
      .sort((a, b) => a.name.localeCompare(b.name, 'it')))
  }, onError)
}

export async function savePreset(uid: string, preset: Preset) {
  const size = preset.cards.length
  const name = preset.name.trim()
  if (!name || name.length > 48 || new Set(preset.cards).size !== size ||
      !(preset.kind === 'deck' ? size === 9 : size === 3 || size === 5)) {
    throw new Error('Controlla il nome e il numero di carte.')
  }
  await setDoc(doc(getFirestoreService(), 'accounts', uid, 'presets', preset.id), {
    kind: preset.kind, name, cards: preset.cards,
  })
}

export async function removePreset(uid: string, id: string) {
  await deleteDoc(doc(getFirestoreService(), 'accounts', uid, 'presets', id))
}

export function watchAvatar(uid: string, onAvatar: (avatar: AvatarId | null) => void, onError: (error: Error) => void) {
  return onSnapshot(doc(getFirestoreService(), 'accounts', uid), snapshot => onAvatar(findAvatar(snapshot.data()?.avatar)?.id ?? null), onError)
}

export async function saveAvatar(uid: string, avatar: AvatarId | null) {
  await setDoc(doc(getFirestoreService(), 'accounts', uid), { avatar })
}

export function watchLobbyAvatar(code: string, uid: string, onAvatar: (avatar: AvatarId | null) => void) {
  return onSnapshot(doc(getFirestoreService(), 'games', code, 'playerAvatars', uid),
    snapshot => onAvatar(findAvatar(snapshot.data()?.avatar)?.id ?? null), () => onAvatar(null))
}

export async function shareLobbyAvatar(code: string, uid: string, avatar: AvatarId | null) {
  await setDoc(doc(getFirestoreService(), 'games', code, 'playerAvatars', uid), { avatar })
}
