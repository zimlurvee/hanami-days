import { useEffect, useRef } from 'react'
import { getWorld, WORLD_HALF } from '@/game/world'
import { runtime } from '@/game/runtime'

const PX_PER_M = 2 // resolution of the pre-rendered map
const VIEW_M = 100 // metres visible across the minimap
const hex = (c: number) => '#' + c.toString(16).padStart(6, '0')

/** Draws the whole town top-down once, into an offscreen canvas. */
function renderMap(): HTMLCanvasElement {
  const size = WORLD_HALF * 2 * PX_PER_M
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const g = cv.getContext('2d')!
  const w = getWorld()
  const px = (v: number) => (v + WORLD_HALF) * PX_PER_M

  g.fillStyle = '#9bdc7a'
  g.fillRect(0, 0, size, size)

  const boxes = w.boxes.filter((b) => b.y > -0.5).sort((a, b) => a.y + a.h - (b.y + b.h))
  for (const b of boxes) {
    g.fillStyle = hex(b.color)
    g.fillRect(px(b.x - b.w / 2), px(b.z - b.d / 2), b.w * PX_PER_M, b.d * PX_PER_M)
  }
  for (const wt of w.waters) {
    g.fillStyle = hex(wt.color)
    g.fillRect(px(wt.x0), px(wt.z0), (wt.x1 - wt.x0) * PX_PER_M, (wt.z1 - wt.z0) * PX_PER_M)
  }
  for (const t of w.trees) {
    g.fillStyle = t.kind === 'sakura' || t.kind === 'cherry' ? '#ffb7d1' : '#58b75c'
    g.beginPath()
    g.arc(px(t.x), px(t.z), 2.4 * t.scale * PX_PER_M * 0.5, 0, Math.PI * 2)
    g.fill()
  }
  return cv
}

export function Minimap({ size = 160 }: { size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const g = canvas.getContext('2d')!
    const map = renderMap()
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr

    const draw = () => {
      const { x, z, yaw } = runtime.player
      const cam = runtime.cam.yaw
      const S = size * dpr
      const srcSize = VIEW_M * PX_PER_M
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.clearRect(0, 0, S, S)
      g.save()
      g.beginPath()
      g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2)
      g.clip()
      g.fillStyle = '#7fcf67'
      g.fillRect(0, 0, S, S)
      g.translate(S / 2, S / 2)
      g.rotate(cam) // camera forward is always "up"
      g.drawImage(
        map,
        (x + WORLD_HALF) * PX_PER_M - srcSize / 2,
        (z + WORLD_HALF) * PX_PER_M - srcSize / 2,
        srcSize,
        srcSize,
        -S / 2,
        -S / 2,
        S,
        S,
      )
      g.restore()

      // Player arrow, pointing the way the character faces
      g.save()
      g.translate(S / 2, S / 2)
      g.rotate(Math.PI - yaw + cam)
      g.fillStyle = '#e9568a'
      g.strokeStyle = '#fff'
      g.lineWidth = 2 * dpr
      const r = 8 * dpr
      g.beginPath()
      g.moveTo(0, -r)
      g.lineTo(r * 0.7, r * 0.8)
      g.lineTo(0, r * 0.4)
      g.lineTo(-r * 0.7, r * 0.8)
      g.closePath()
      g.fill()
      g.stroke()
      g.restore()
    }

    draw()
    const id = window.setInterval(draw, 66)
    return () => window.clearInterval(id)
  }, [size])

  return <canvas ref={ref} className="minimap" style={{ width: size, height: size }} aria-label="Mini-map" />
}
