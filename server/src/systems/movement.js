import { MOVEMENT, WORLD } from '../config.js'
import { clamp, isNum } from './validation.js'

/**
 * Server-side movement check. The client is trusted to simulate its own physics
 * (walls, stairs) but not to teleport or speed hack, so we meter how far each
 * player may travel. A distance "bank" refills at maxHSpeed and absorbs lag bursts.
 *
 * Returns { ok: true } and mutates the player, or { ok: false } and leaves it unchanged.
 */
export function applyMove(p, m, now = Date.now()) {
  if (![m.x, m.y, m.z, m.yaw].every(isNum)) return { ok: false, reason: 'bad' }
  if (Math.abs(m.x) > WORLD.half || Math.abs(m.z) > WORLD.half || m.y < -30 || m.y > 80) {
    return { ok: false, reason: 'bounds' }
  }

  const dt = clamp((now - p.lastMoveAt) / 1000, 0, 1)
  p.lastMoveAt = now
  p.budget = Math.min(MOVEMENT.maxBudget, p.budget + MOVEMENT.maxHSpeed * dt)

  const dist = Math.hypot(m.x - p.x, m.z - p.z)
  const dy = Math.abs(m.y - p.y)
  if (dist > p.budget || dy > MOVEMENT.maxVSpeed * dt + 2) return { ok: false, reason: 'speed' }

  p.budget -= dist
  p.x = m.x
  p.y = m.y
  p.z = m.z
  p.yaw = m.yaw
  p.speed = clamp(isNum(m.sp) ? m.sp : 0, 0, 12)
  p.grounded = !!m.g
  p.vy = clamp(isNum(m.vy) ? m.vy : 0, -40, 20)
  return { ok: true }
}

export function resetToSpawn(p, now = Date.now()) {
  p.x = WORLD.spawn.x + (Math.random() - 0.5) * 4
  p.y = WORLD.spawn.y
  p.z = WORLD.spawn.z + (Math.random() - 0.5) * 4
  p.yaw = 0
  p.speed = 0
  p.grounded = true
  p.vy = 0
  p.budget = MOVEMENT.maxBudget
  p.lastMoveAt = now
}
