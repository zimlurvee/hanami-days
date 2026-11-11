import { create } from 'zustand'

export type Screen = 'menu' | 'settings' | 'credits' | 'multiplayer' | 'characterEdit' | 'playing'

export type CharaTab = 'camera' | 'chara' | 'pose' | 'item'

interface AppState {
  screen: Screen
  /** Screen to return to when leaving settings (menu or pause overlay). */
  settingsReturn: 'menu' | 'playing'
  paused: boolean
  toast: string | null
  /** The chat box is open (typing), so losing the mouse lock must not pause the game. */
  chatOpen: boolean
  setChatOpen: (open: boolean) => void
  /** The in-game Chara Edit panel (camera, character, pose, item). The game keeps running behind it. */
  charaEdit: null | CharaTab
  setCharaEdit: (tab: null | CharaTab) => void
  /** Photo mode: HUD hidden. */
  photo: boolean
  setPhoto: (on: boolean) => void
  /** Which page the in-game Menu opens on. */
  menuPage: string
  setMenuPage: (p: string) => void
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
  chatOpen: false,
  setChatOpen: (chatOpen) => set({ chatOpen }),
  charaEdit: null,
  setCharaEdit: (charaEdit) => set({ charaEdit }),
  photo: false,
  setPhoto: (photo) => set({ photo }),
  menuPage: 'home',
  setMenuPage: (menuPage) => set({ menuPage }),
  go: (screen) => set({ screen, paused: false, chatOpen: false, charaEdit: null, photo: false }),
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
