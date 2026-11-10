import { WorldBuilder } from './builder'
import { buildTown } from './town'
import { buildSchool } from './school'
import { buildPublic } from './public'
import { buildDistricts } from './districts'

export const WORLD_HALF = 200
/** Just inside the school gate, facing south toward the road. */
export const PLAYER_SPAWN = { x: -60, y: 0.5, z: -47 }

let cached: WorldBuilder | null = null

/** Builds the whole town once. Deterministic, so every client gets the same world. */
export function getWorld(): WorldBuilder {
  if (cached) return cached
  const b = new WorldBuilder()
  buildTown(b)
  buildSchool(b)
  buildDistricts(b) // before buildPublic so its tree scatter avoids the new buildings
  buildPublic(b)
  cached = b
  return b
}

/** Name of the most specific zone containing a position. */
export function locationAt(x: number, y: number, z: number): string {
  const w = getWorld()
  let best: { name: string; area: number } | null = null
  for (const zn of w.zones) {
    if (x < zn.x0 || x > zn.x1 || z < zn.z0 || z > zn.z1 || y < zn.y0 || y > zn.y1) continue
    const area = (zn.x1 - zn.x0) * (zn.z1 - zn.z0)
    if (!best || area < best.area) best = { name: zn.name, area }
  }
  return best?.name ?? 'Hanami Town'
}

export * from './builder'
