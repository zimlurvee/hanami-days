/**
 * Data model for how a character looks. The Phase 2 character editor will edit
 * this object and the multiplayer layer will sync it; Avatar.tsx renders it.
 */
export type HairStyle = 'short' | 'long' | 'twin' | 'bun'

export interface Appearance {
  skin: number
  hair: number
  hairStyle: HairStyle
  eye: number
  top: number
  bottom: number
  shoes: number
  /** Skirt instead of trousers. */
  skirt: boolean
}

export const DEFAULT_APPEARANCE: Appearance = {
  skin: 0xffdcc2,
  hair: 0x4a3426,
  hairStyle: 'short',
  eye: 0x3b2a22,
  top: 0xffffff,
  bottom: 0x35457a,
  shoes: 0x2b2b33,
  skirt: false,
}
