import { create } from 'zustand'

export type Screen = 'menu' | 'settings' | 'credits' | 'profile' | 'multiplayer' | 'characterEdit' | 'playing'

interface AppState {
  screen: Screen
  /** Screen to return to when leaving settings (menu or pause overlay). */
  settingsReturn: 'menu' | 'playing'
  paused: boolean
  toast: string | null
  go: (screen: Screen) => void
  openSettings: (from: 'menu' | 'playing') => void
  closeSettings: () => void
  setPaused: (paused: boolean) => void
  showToast: (msg: string) => void
}

/** True while the 3D game is mounted (playing, or settings opened from the pause menu). */
export function isGameActive(): boolean {
  const a = useApp.getState()
  return a.screen === 'playing' || (a.screen === 'settings' && a.settingsReturn === 'playing')
}

let toastTimer: number | undefined

export const useApp = create<AppState>((set, get) => ({
  screen: 'menu',
  settingsReturn: 'menu',
  paused: false,
  toast: null,
  go: (screen) => set({ screen, paused: false }),
  openSettings: (from) => set({ screen: 'settings', settingsReturn: from }),
  closeSettings: () => {
    const back = get().settingsReturn
    set({ screen: back, paused: back === 'playing' })
  },
  setPaused: (paused) => set({ paused }),
  showToast: (msg) => {
    window.clearTimeout(toastTimer)
    set({ toast: msg })
    toastTimer = window.setTimeout(() => set({ toast: null }), 2600)
  },
}))
