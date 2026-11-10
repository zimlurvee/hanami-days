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

interface CharacterState {
  model: CharacterId
  setModel: (m: CharacterId) => void
}

/** Which character model the local player uses. Account sync arrives in Phase 2. */
export const useCharacter = create<CharacterState>((set) => ({
  model: load(),
  setModel: (model) => {
    try {
      localStorage.setItem(KEY, model)
    } catch {
      /* ignore */
    }
    set({ model })
  },
}))
