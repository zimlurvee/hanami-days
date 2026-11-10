import { create } from 'zustand'

export type Quality = 'low' | 'medium' | 'high' | 'ultra'

export type KeyAction =
  | 'forward'
  | 'back'
  | 'left'
  | 'right'
  | 'jump'
  | 'run'
  | 'interact'
  | 'map'

export interface Settings {
  // Graphics
  quality: Quality
  shadows: boolean
  antialias: boolean
  renderDistance: number
  resolutionScale: number
  postProcessing: boolean
  // Controls
  mouseSensitivity: number
  invertY: boolean
  keys: Record<KeyAction, string>
  // Gameplay
  showPlayerNames: boolean
  showInteractionPrompts: boolean
  showMinimap: boolean
  cameraDistance: number
}

export const QUALITY_PRESETS: Record<
  Quality,
  Pick<Settings, 'shadows' | 'antialias' | 'renderDistance' | 'resolutionScale' | 'postProcessing'>
> = {
  low: { shadows: false, antialias: false, renderDistance: 120, resolutionScale: 0.6, postProcessing: false },
  medium: { shadows: true, antialias: false, renderDistance: 200, resolutionScale: 0.85, postProcessing: false },
  high: { shadows: true, antialias: true, renderDistance: 320, resolutionScale: 1, postProcessing: true },
  ultra: { shadows: true, antialias: true, renderDistance: 480, resolutionScale: 1.25, postProcessing: true },
}

export const DEFAULT_KEYS: Record<KeyAction, string> = {
  forward: 'KeyW',
  back: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  jump: 'Space',
  run: 'ShiftLeft',
  interact: 'KeyE',
  map: 'KeyM',
}

export const DEFAULT_SETTINGS: Settings = {
  quality: 'high',
  ...QUALITY_PRESETS.high,
  mouseSensitivity: 1,
  invertY: false,
  keys: { ...DEFAULT_KEYS },
  showPlayerNames: true,
  showInteractionPrompts: true,
  showMinimap: true,
  cameraDistance: 6,
}

const STORAGE_KEY = 'hanami-days:settings:v1'

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      keys: { ...DEFAULT_KEYS, ...(parsed.keys ?? {}) },
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function persist(s: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    /* storage unavailable, keep in memory only */
  }
}

interface SettingsState {
  settings: Settings
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  setKey: (action: KeyAction, code: string) => void
  applyQuality: (q: Quality) => void
  reset: () => void
}

export const useSettings = create<SettingsState>((set, get) => ({
  settings: load(),
  set: (key, value) => {
    const next = { ...get().settings, [key]: value }
    persist(next)
    set({ settings: next })
  },
  setKey: (action, code) => {
    const cur = get().settings
    const keys = { ...cur.keys }
    // Swap if another action already uses this key, so no two actions collide.
    const clash = (Object.keys(keys) as KeyAction[]).find((a) => keys[a] === code && a !== action)
    if (clash) keys[clash] = keys[action]
    keys[action] = code
    const next = { ...cur, keys }
    persist(next)
    set({ settings: next })
  },
  applyQuality: (q) => {
    const next = { ...get().settings, quality: q, ...QUALITY_PRESETS[q] }
    persist(next)
    set({ settings: next })
  },
  reset: () => {
    persist(DEFAULT_SETTINGS)
    set({ settings: { ...DEFAULT_SETTINGS, keys: { ...DEFAULT_KEYS } } })
  },
}))
