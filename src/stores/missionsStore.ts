import { create } from 'zustand'

export interface Mission {
  id: string
  title: string
  reward: number
  /** Matches runtime.locationName when this is a "visit" mission. */
  visit?: string[]
}

export const MISSIONS: Mission[] = [
  { id: 'school', title: 'Visit the school', reward: 200, visit: ['School Entrance', 'Entrance Hall', 'School Building', 'School Playground'] },
  { id: 'rooftop', title: 'Go up to the school rooftop', reward: 400, visit: ['School Rooftop'] },
  { id: 'cafe', title: 'Visit the cafe', reward: 300, visit: ['Cafe'] },
  { id: 'park', title: 'Walk in the city park', reward: 300, visit: ['City Park', 'Playground'] },
  { id: 'shrine', title: 'Visit the shrine', reward: 300, visit: ['Shrine'] },
  { id: 'beach', title: 'Go to the beach', reward: 400, visit: ['Beach'] },
  { id: 'pool', title: 'Visit the swimming pool', reward: 300, visit: ['Swimming Pool'] },
  { id: 'hospital', title: 'Find the hospital', reward: 200, visit: ['Hospital'] },
  { id: 'pose', title: 'Strike a pose', reward: 200 },
  { id: 'prop', title: 'Place a prop', reward: 200 },
  { id: 'item', title: 'Wear an accessory', reward: 200 },
  { id: 'chat', title: 'Say hello in a room', reward: 200 },
  { id: 'friend', title: 'Play with someone else online', reward: 500 },
]

const KEY = 'hanami.missions'
interface Saved { money: number; done: string[] }
const load = (): Saved => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (v && typeof v.money === 'number' && Array.isArray(v.done)) return v
  } catch { /* ignore */ }
  return { money: 5000, done: [] }
}

interface MissionsState extends Saved {
  /** Called whenever the player does something a mission might care about. Pays once. */
  complete: (id: string) => boolean
}

export const useMissions = create<MissionsState>((set, get) => ({
  ...load(),
  complete: (id) => {
    const m = MISSIONS.find((x) => x.id === id)
    if (!m || get().done.includes(id)) return false
    const next = { money: get().money + m.reward, done: [...get().done, id] }
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private mode */ }
    set(next)
    return true
  },
}))
