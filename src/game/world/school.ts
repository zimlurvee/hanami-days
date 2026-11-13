import { WorldBuilder } from './builder'

/**
 * The school itself is a model (public/school, see SchoolModel.tsx), baked from
 * "School Zimlurvee Blend" by Joaquito (School Creator V2, CC-BY 4.0).
 * This file only registers what the rest of the world needs to know about it:
 * named zones (HUD location, missions), minimap blocks, and a keep-out area so
 * the random tree scatter does not plant trees inside the grounds.
 *
 * The model is placed by tools/school/bake_school.py: front gate at (-38, -47)
 * facing south, grounds run north to z = -199.
 */
export function buildSchool(b: WorldBuilder) {
  // Minimap blocks (not drawn in 3D, no collision). Grass first so the buildings sit on top of it.
  const block = (x0: number, z0: number, x1: number, z1: number, color: number) =>
    b.rect(x0, 0, z0, x1, 0.1, z1, color, false, false)
  block(-108, -200, 44, -44, 0x8fcf6d)
  block(-90, -192, -52, -155, 0x6fa83a) // west field
  block(1, -192, 38, -155, 0x6fa83a) // east field
  block(-83, -146, 7, -138, 0xc2563b) // running track
  block(-81, -137, 4, -59, 0xb9bcc0) // main building and courtyard
  block(-33, -195, -7, -147, 0xc77d97) // gymnasium
  block(6, -127, 31, -84, 0x2f7fa6) // pool building
  block(-107, -75, -80, -46, 0x6b8f3a) // hedge maze

  b.zone('Japanese High School', -108, -200, 44, -44)
  b.zone('School Entrance', -60, -62, -16, -44)
  b.zone('Entrance Hall', -50, -76, -26, -58, -1, 6)
  b.zone('School Building', -81, -137, 4, -58, -1, 6)
  b.zone('School Courtyard', -57, -118, -11, -79, -1, 6)
  b.zone('School Hallway', -81, -137, 4, -58, 2, 6)
  b.zone('School Rooftop', -81, -137, 4, -58, 6.2, 30)
  b.zone('Gymnasium', -33, -195, -7, -147)
  b.zone('School Pool', 6, -127, 31, -84)
  b.zone('Running Track', -83, -146, 7, -138)
  b.zone('School Playground', -92, -195, 40, -137)
  b.zone('Hedge Maze', -107, -75, -80, -46)
}
