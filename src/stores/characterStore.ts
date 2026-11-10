import { create } from 'zustand'
import type { CharacterId } from '@/game/characters/models'

const KEY = 'hanami-days:character:v1'
const VALID: CharacterId[] = ['student', 'schoolgirl', 'oc']

function load(): CharacterId {
  try {
    const v = localStorage.getItem(KEY) as CharacterId | null
    if (v && VALID.includes(v)) return v
  } catch {
    /* storage unavailable */
  }
  return 'schoolgirl'
}

const SIZE_KEY = 'hanami-days:character-size:v1'
export const SIZE_MIN = 0.7
export const SIZE_MAX = 1.3

function loadSize(): number {
  try {
    const v = Number(localStorage.getItem(SIZE_KEY))
    if (v >= SIZE_MIN && v <= SIZE_MAX) return v
  } catch {
    /* storage unavailable */
  }
  return 1
}

interface CharacterState {
  model: CharacterId
  /** Multiplier on top of each model's own height, 0.7 to 1.3. */
  size: number
  setModel: (m: CharacterId) => void
  setSize: (s: number) => void
}

/** Which character model the local player uses. Account sync arrives in Phase 2. */
export const useCharacter = create<CharacterState>((set) => ({
  model: load(),
  size: loadSize(),
  setSize: (size) => {
    const v = Math.min(SIZE_MAX, Math.max(SIZE_MIN, size))
    try {
      localStorage.setItem(SIZE_KEY, String(v))
    } catch {
      /* ignore */
    }
    set({ size: v })
  },
  setModel: (model) => {
    try {
      localStorage.setItem(KEY, model)
    } catch {
      /* ignore */
    }
    set({ model })
  },
}))
