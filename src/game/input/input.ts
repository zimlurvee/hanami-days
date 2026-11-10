import { useSettings, type KeyAction } from '@/stores/settingsStore'
import { useApp } from '@/stores/appStore'
import { runtime } from '@/game/runtime'

const down = new Set<string>()
let jumpQueued = false
let interactQueued = false
let attached = false
let canvasEl: HTMLElement | null = null
let dragging = false

export function isDown(action: KeyAction): boolean {
  const code = useSettings.getState().settings.keys[action]
  return down.has(code)
}

export function consumeJump(): boolean {
  const v = jumpQueued
  jumpQueued = false
  return v
}

export function consumeInteract(): boolean {
  const v = interactQueued
  interactQueued = false
  return v
}

function inPlay(): boolean {
  const a = useApp.getState()
  return a.screen === 'playing' && !a.paused
}

function onKeyDown(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

  if (e.code === 'Escape') {
    const app = useApp.getState()
    // While the pointer is locked the browser consumes Esc and fires
    // pointerlockchange instead, which pauses the game (see onLockChange).
    if (app.screen === 'playing' && !document.pointerLockElement) {
      app.setPaused(!app.paused)
    }
    return
  }
  if (!inPlay()) return
  if (e.repeat) return
  down.add(e.code)
  const keys = useSettings.getState().settings.keys
  if (e.code === keys.jump) jumpQueued = true
  if (e.code === keys.interact) interactQueued = true
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault()
}

function onKeyUp(e: KeyboardEvent) {
  down.delete(e.code)
}

function onBlur() {
  down.clear()
  dragging = false
}

function onMouseMove(e: MouseEvent) {
  if (!inPlay()) return
  if (!dragging && document.pointerLockElement !== canvasEl) return
  const s = useSettings.getState().settings
  const k = 0.0025 * s.mouseSensitivity
  runtime.cam.yaw -= e.movementX * k
  runtime.cam.pitch += e.movementY * k * (s.invertY ? -1 : 1)
  runtime.cam.pitch = Math.max(-0.2, Math.min(1.25, runtime.cam.pitch))
}

function onMouseDown(e: MouseEvent) {
  if (!inPlay() || !canvasEl) return
  if (e.target !== canvasEl) return
  dragging = true
  canvasEl.requestPointerLock?.()
}

function onMouseUp() {
  dragging = false
}

function onLockChange() {
  if (document.pointerLockElement) return
  dragging = false
  const app = useApp.getState()
  if (app.screen === 'playing' && !app.paused) app.setPaused(true)
}

function onWheel(e: WheelEvent) {
  if (!inPlay()) return
  const z = runtime.cam.zoom * (1 + Math.sign(e.deltaY) * 0.08)
  runtime.cam.zoom = Math.max(0.35, Math.min(2.4, z))
}

/** Call once with the R3F canvas DOM element when gameplay mounts. Returns a cleanup. */
export function attachInput(canvas: HTMLElement): () => void {
  canvasEl = canvas
  if (!attached) {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('wheel', onWheel, { passive: true })
    document.addEventListener('pointerlockchange', onLockChange)
    attached = true
  }
  return () => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', onBlur)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mousedown', onMouseDown)
    window.removeEventListener('mouseup', onMouseUp)
    window.removeEventListener('wheel', onWheel)
    document.removeEventListener('pointerlockchange', onLockChange)
    attached = false
    canvasEl = null
    down.clear()
    if (document.pointerLockElement) document.exitPointerLock()
  }
}

/** Must be called from a user gesture (a click handler). */
export function lockPointer() {
  canvasEl?.requestPointerLock?.()
}

export function releasePointer() {
  dragging = false
  if (document.pointerLockElement) document.exitPointerLock()
}
