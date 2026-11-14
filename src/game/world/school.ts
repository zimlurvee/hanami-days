import { WorldBuilder } from './builder'

/**
 * The school itself is a model (public/school, see SchoolModel.tsx), baked from
 * "School Zimlurvee Blend" by Joaquito (School Creator V2, CC-BY 4.0).
 * This file only registers what the rest of the world needs to know about it:
 * named zones (HUD location, missions), minimap blocks, and a keep-out area so
 * the random tree scatter does not plant trees inside the grounds.
 *
 * The model is placed by tools/school/bake_school.py: front gate at (-29, -47)
 * facing south, grounds run north to about z = -214 (the map extends to -220 there).
 */
/**
 * Footprints of the big buildings (x0, z0, x1, z1) and the height below which things count as "inside".
 * SchoolModel hides the small props of a building while the player is away from it (poor man's occlusion culling).
 */
export const SCHOOL_BUILDINGS = [
  { name: 'School Building', x0: -76.8, z0: -147.0, x1: 17.7, z1: -59.2, top: 9 },
  { name: 'Gymnasium', x0: -23.4, z0: -211.4, x1: 5.4, z1: -158.1, top: 12 },
  { name: 'School Pool', x0: 19.9, z0: -135.9, x1: 47.7, z1: -88.1, top: 12 },
]

export function buildSchool(b: WorldBuilder) {
  // Minimap blocks (not drawn in 3D, no collision). Grass first so the buildings sit on top of it.
  const block = (x0: number, z0: number, x1: number, z1: number, color: number) =>
    b.rect(x0, 0, z0, x1, 0.1, z1, color, false, false)
  block(-106.8, -217.0, 62.1, -43.7, 0x8fcf6d)
  block(-86.8, -208.1, -44.6, -167.0, 0x6fa83a) // west field
  block(14.3, -208.1, 55.4, -167.0, 0x6fa83a) // east field
  block(-79.0, -157.0, 21.0, -148.1, 0xc2563b) // running track
  block(-76.8, -147.0, 17.7, -60.3, 0xb9bcc0) // main building and courtyard
  block(-23.4, -211.4, 5.4, -158.1, 0xc77d97) // gymnasium
  block(19.9, -135.9, 47.7, -88.1, 0x2f7fa6) // pool building
  block(-105.7, -78.1, -75.7, -45.9, 0x6b8f3a) // hedge maze

  b.zone('Japanese High School', -106.8, -217.0, 62.1, -43.7)
  b.zone('School Entrance', -53.4, -63.7, -4.6, -43.7)
  b.zone('Entrance Hall', -42.3, -79.2, -15.7, -59.2, -1.11, 6.67)
  b.zone('School Building', -76.8, -147.0, 17.7, -59.2, -1.11, 6.67)
  b.zone('School Courtyard', -50.1, -125.9, 1.0, -82.6, -1.11, 6.67)
  b.zone('School Hallway', -76.8, -147.0, 17.7, -59.2, 2.22, 6.67)
  b.zone('School Rooftop', -76.8, -147.0, 17.7, -59.2, 6.89, 33.33)
  b.zone('Gymnasium', -23.4, -211.4, 5.4, -158.1)
  b.zone('School Pool', 19.9, -135.9, 47.7, -88.1)
  b.zone('Running Track', -79.0, -157.0, 21.0, -148.1)
  b.zone('School Playground', -89.0, -211.4, 57.7, -147.0)
  b.zone('Hedge Maze', -105.7, -78.1, -75.7, -45.9)
}
