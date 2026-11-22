export const avatars = [
  { id: 'young-male', label: 'Pilota giovane · uomo', src: '/avatars/young-male.webp' },
  { id: 'young-female', label: 'Pilota giovane · donna', src: '/avatars/young-female.webp' },
  { id: 'aggressive-male', label: 'Pilota giovane aggressivo · uomo', src: '/avatars/aggressive-male.webp' },
  { id: 'aggressive-female', label: 'Pilota giovane aggressivo · donna', src: '/avatars/aggressive-female.webp' },
  { id: 'veteran-male', label: 'Pilota veterano · uomo', src: '/avatars/veteran-male.webp' },
  { id: 'veteran-female', label: 'Pilota veterano · donna', src: '/avatars/veteran-female.webp' },
  { id: 'robot-male', label: 'Robot · uomo', src: '/avatars/robot-male.webp' },
  { id: 'robot-female', label: 'Robot · donna', src: '/avatars/robot-female.webp' },
  { id: 'mystery', label: 'Punto interrogativo' },
] as const

export type AvatarId = typeof avatars[number]['id']

export function findAvatar(id: unknown) {
  return avatars.find(avatar => avatar.id === id)
}
