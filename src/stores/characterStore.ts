import { create } from 'zustand'
import type { CharacterId } from '@/game/characters/models'

/** The OC is the only playable character, drawn at 115% of its natural height. */
export const CHARACTER_SIZE = 1.15

interface CharacterState {
  model: CharacterId
  size: number
  setModel: (m: CharacterId) => void
}

export const useCharacter = create<CharacterState>((set) => ({
  model: 'oc',
  size: CHARACTER_SIZE,
  setModel: (model) => set({ model }),
}))
