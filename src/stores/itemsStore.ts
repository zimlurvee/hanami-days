import { create } from 'zustand'

export type ItemId = 'cap' | 'glasses' | 'bag' | 'ribbon' | 'headphones'

export const ITEMS: { id: ItemId; label: string; icon: string }[] = [
  { id: 'cap', label: 'Cap', icon: '🧢' },
  { id: 'glasses', label: 'Glasses', icon: '👓' },
  { id: 'bag', label: 'Backpack', icon: '🎒' },
  { id: 'ribbon', label: 'Hair ribbon', icon: '🎀' },
  { id: 'headphones', label: 'Headphones', icon: '🎧' },
]
export const MAX_ITEMS = 4

const KEY = 'hanami.items'
const load = (): ItemId[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(v) ? v.filter((x) => ITEMS.some((i) => i.id === x)).slice(0, MAX_ITEMS) : []
  } catch {
    return []
  }
}

interface ItemsState {
  worn: ItemId[]
  toggle: (id: ItemId) => void
}

export const useItems = create<ItemsState>((set, get) => ({
  worn: load(),
  toggle: (id) => {
    const cur = get().worn
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-MAX_ITEMS)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private mode */ }
    set({ worn: next })
  },
}))
