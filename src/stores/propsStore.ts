import { create } from 'zustand'

export type PropKind = 'chair' | 'table' | 'bench' | 'box' | 'ball' | 'plant' | 'cake' | 'parasol'

export const PROP_KINDS: { id: PropKind; label: string; icon: string }[] = [
  { id: 'chair', label: 'Chair', icon: '🪑' },
  { id: 'table', label: 'Table', icon: '🟫' },
  { id: 'bench', label: 'Bench', icon: '🛋' },
  { id: 'box', label: 'Box', icon: '📦' },
  { id: 'ball', label: 'Ball', icon: '⚽' },
  { id: 'plant', label: 'Plant', icon: '🪴' },
  { id: 'cake', label: 'Cake', icon: '🍰' },
  { id: 'parasol', label: 'Parasol', icon: '⛱' },
]

export const MAX_PROPS_PER_PLAYER = 10
export const MAX_PROPS_PER_ROOM = 60

export interface Prop {
  id: string
  kind: PropKind
  x: number
  y: number
  z: number
  yaw: number
  /** Player id of whoever placed it ('me' in solo play). */
  owner: string
}

interface PropsState {
  props: Prop[]
  selected: PropKind
  select: (k: PropKind) => void
  set: (p: Prop[]) => void
  add: (p: Prop) => void
  remove: (id: string) => void
}

export const useProps = create<PropsState>((set) => ({
  props: [],
  selected: 'chair',
  select: (selected) => set({ selected }),
  set: (props) => set({ props }),
  add: (p) => set((s) => ({ props: s.props.some((q) => q.id === p.id) ? s.props : [...s.props, p] })),
  remove: (id) => set((s) => ({ props: s.props.filter((q) => q.id !== id) })),
}))
