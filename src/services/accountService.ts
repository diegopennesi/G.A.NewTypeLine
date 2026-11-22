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

export function watchAvatar(uid: string, onAvatar: (avatar: string | null) => void, onError: (error: Error) => void) {
  return onSnapshot(doc(getFirestoreService(), 'accounts', uid), snapshot => onAvatar(snapshot.data()?.avatar ?? null), onError)
}

export async function saveAvatar(uid: string, avatar: string | null) {
  await setDoc(doc(getFirestoreService(), 'accounts', uid), { avatar })
}

export async function prepareAvatar(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
    throw new Error('Scegli un’immagine JPEG, PNG o WebP fino a 8 MB.')
  }
  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 128
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Impossibile leggere l’immagine.')
    const side = Math.min(bitmap.width, bitmap.height)
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 128, 128)
    const image = canvas.toDataURL('image/webp', .82)
    if (!image.startsWith('data:image/webp;base64,') || image.length > 45000) {
      throw new Error('Impossibile preparare l’immagine del profilo.')
    }
    return image
  } finally {
    bitmap.close()
  }
}
