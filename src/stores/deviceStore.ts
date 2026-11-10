import { create } from 'zustand'

export type Device = 'pc' | 'mobile'
const KEY = 'hanami.device'

function read(): Device | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'pc' || v === 'mobile' ? v : null
  } catch {
    return null
  }
}

/** A best guess from the browser, used only to pre-highlight a choice on the first screen. */
export function guessDevice(): Device {
  try {
    return window.matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0 ? 'mobile' : 'pc'
  } catch {
    return 'pc'
  }
}

const apply = (d: Device | null) => {
  if (d) document.documentElement.dataset.device = d
  else delete document.documentElement.dataset.device
}

interface DeviceState {
  /** null until the player picks one on first launch. */
  device: Device | null
  setDevice: (d: Device) => void
}

const initial = read()
apply(initial)

export const useDevice = create<DeviceState>((set) => ({
  device: initial,
  setDevice: (device) => {
    try { localStorage.setItem(KEY, device) } catch { /* private mode */ }
    apply(device)
    set({ device })
  },
}))

export const isMobile = () => useDevice.getState().device === 'mobile'
