import { create } from 'zustand'

export type ItemId = 'cap' | 'glasses' | 'bag' | 'ribbon' | 'headphones'

export const ITEMS: { id: ItemId; label: string; icon: string; price: number }[] = [
  { id: 'cap', label: 'Cap', icon: '🧢', price: 300 },
  { id: 'glasses', label: 'Glasses', icon: '👓', price: 500 },
  { id: 'bag', label: 'Backpack', icon: '🎒', price: 800 },
  { id: 'ribbon', label: 'Hair ribbon', icon: '🎀', price: 400 },
  { id: 'headphones', label: 'Headphones', icon: '🎧', price: 1200 },
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

const OWN_KEY = 'hanami.owned'
const loadOwned = (worn: ItemId[]): ItemId[] => {
  try {
    const v = JSON.parse(localStorage.getItem(OWN_KEY) || 'null')
    if (Array.isArray(v)) return v.filter((x) => ITEMS.some((i) => i.id === x))
  } catch { /* ignore */ }
  return worn // players who already wear something keep it
}

interface ItemsState {
  worn: ItemId[]
  owned: ItemId[]
  /** Buy an item with the given money callback result already checked. */
  grant: (id: ItemId) => void
  toggle: (id: ItemId) => void
}

const initialWorn = load()
export const useItems = create<ItemsState>((set, get) => ({
  worn: initialWorn,
  owned: loadOwned(initialWorn),
  grant: (id) => {
    const next = get().owned.includes(id) ? get().owned : [...get().owned, id]
    try { localStorage.setItem(OWN_KEY, JSON.stringify(next)) } catch { /* private mode */ }
    set({ owned: next })
  },
  toggle: (id) => {
    if (!get().owned.includes(id) && !get().worn.includes(id)) return
    const cur = get().worn
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-MAX_ITEMS)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* private mode */ }
    set({ worn: next })
  },
}))
