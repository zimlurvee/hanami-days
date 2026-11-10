import { WorldBuilder, C, WALL_H, shade, type Gap } from './builder'

/**
 * Japanese-style high school: two storeys plus a walkable rooftop, a gymnasium,
 * playground, front gate and fence.
 *
 * Main building footprint x -88..-32, z -81..-59 (north is -z, entrance faces south).
 * Layout per floor: north classroom row, a 4m corridor (z -70..-66), south row.
 * Stairs sit inside the two south-corner stair rooms, so the corridors stay open.
 */

const X0 = -88
const X1 = -32
const Z0 = -81
const Z1 = -59
const CN = -70 // corridor north wall
const CS = -66 // corridor south wall
const FLOOR_H = 4

const door = (cx: number, w = 2.2): Gap => [cx - w / 2, cx + w / 2]

// Stair geometry shared by both stair rooms: 16 steps of 0.25 rise x 0.3 run = 4.0m,
// exactly one storey. The bottom step is 1.2m from the south wall so there is a
// landing to walk onto it from; the top step meets the first-floor slab level.
const STAIR_RUN = 0.3
const STAIR_Z_START = -60.4
const STAIR_STEPS = 16
const STAIR_END_Z = STAIR_Z_START - STAIR_STEPS * STAIR_RUN // -65.2
const STAIR_W: [number, number] = [-87.5, -84.3]
const STAIR_E: [number, number] = [-35.6, -32.4]

export function buildSchool(b: WorldBuilder) {
  const wallC = C.plaster
  const trim = C.schoolBlue

  // ---- Floors, exterior walls, interior walls --------------------------------
  const northBounds: Record<number, number[]> = {
    0: [-88, -80, -72, -64, -52, -42, -32],
    1: [-88, -80, -72, -64, -56, -48, -40, -32],
  }
  const southGaps: Record<number, Gap[]> = {
    0: [[-83.5, -81.5], door(-72), [-64, -56], door(-48), [-38.5, -36.5]],
    1: [STAIR_W, door(-72), door(-60), door(-48), STAIR_E],
  }
  const southDividers = [-80, -64, -56, -40]

  for (let f = 0; f < 2; f++) {
    const y = f * FLOOR_H
    // Exterior shell
    b.wallX(X0, X1, Z0, y, WALL_H, wallC)
    b.wallX(X0, X1, Z1, y, WALL_H, wallC, f === 0 ? [[-62, -58]] : [])
    b.wallZ(Z0, Z1, X0, y, WALL_H, wallC)
    b.wallZ(Z0, Z1, X1, y, WALL_H, wallC)
    // Coloured trim band under the slab
    b.rect(X0 - 0.05, y + 3.4, Z0 - 0.05, X1 + 0.05, 0.3, Z0 + 0.1, trim, false)
    b.rect(X0 - 0.05, y + 3.4, Z1 - 0.1, X1 + 0.05, 0.3, Z1 + 0.05, trim, false)
    // Windows (visual only)
    for (let wx = X0 + 3; wx < X1 - 1; wx += 4) {
      b.box(wx, y + 1.2, Z0 - 0.17, 2, 1.4, 0.06, C.glass, false)
      if (!(f === 0 && Math.abs(wx + 60) < 3.5)) b.box(wx, y + 1.2, Z1 + 0.17, 2, 1.4, 0.06, C.glass, false)
    }

    // Corridor walls with a doorway per room
    const nb = northBounds[f]
    const northDoors: Gap[] = []
    for (let i = 0; i < nb.length - 1; i++) northDoors.push(door((nb[i] + nb[i + 1]) / 2))
    b.wallX(X0, X1, CN, y, WALL_H, shade(wallC, 0.97), northDoors)
    b.wallX(X0, X1, CS, y, WALL_H, shade(wallC, 0.97), southGaps[f])
    // Room dividers
    for (let i = 1; i < nb.length - 1; i++) b.wallZ(Z0, CN, nb[i], y, WALL_H, shade(wallC, 0.95))
    for (const dx of southDividers) b.wallZ(CS, Z1, dx, y, WALL_H, shade(wallC, 0.95))

    // Floor tint (visual only)
    const fy = y
    b.rect(X0, fy, CN, X1, 0.04, CS, 0xf0e6d2, false) // corridor
    for (let i = 0; i < nb.length - 1; i++) {
      b.rect(nb[i], fy, Z0, nb[i + 1], 0.04, CN, f === 0 ? C.floorWood : shade(C.floorWood, 1.04), false)
    }
    b.rect(-80, fy, CS, -32, 0.04, Z1, C.floorTile, false)
  }

  // ---- First-floor slab with two stairwell openings --------------------------
  const sy = FLOOR_H - 0.3
  const slab = (a: number, zA: number, bX: number, zB: number) => b.rect(a, sy, zA, bX, 0.3, zB, shade(C.plaster, 0.9))
  slab(X0, Z0, X1, CS) // north row + corridor
  slab(X0, CS, X1, STAIR_END_Z) // south row, top band
  slab(X0, STAIR_END_Z, STAIR_W[0], STAIR_Z_START)
  slab(STAIR_W[1], STAIR_END_Z, STAIR_E[0], STAIR_Z_START)
  slab(STAIR_E[1], STAIR_END_Z, X1, STAIR_Z_START)
  slab(X0, STAIR_Z_START, X1, Z1)

  // Stairs: 16 steps climbing north, top step level with the first-floor slab
  const stairColor = 0xe9c9a0
  b.stairs((STAIR_W[0] + STAIR_W[1]) / 2, 0, STAIR_Z_START, '-z', STAIR_STEPS, STAIR_W[1] - STAIR_W[0], stairColor, 0.25, STAIR_RUN)
  b.stairs((STAIR_E[0] + STAIR_E[1]) / 2, 0, STAIR_Z_START, '-z', STAIR_STEPS, STAIR_E[1] - STAIR_E[0], stairColor, 0.25, STAIR_RUN)

  // ---- Roof, parapet and outside stairs to the rooftop -----------------------
  b.rect(X0 - 0.4, 7.7, Z0 - 0.4, X1 + 0.4, 0.3, Z1 + 0.4, C.roofBlue)
  const roofC = shade(C.concrete, 1.05)
  b.wallX(X0, X1, Z0 + 0.1, 8, 1.1, roofC, [], 0.2)
  b.wallX(X0, X1, Z1 - 0.1, 8, 1.1, roofC, [], 0.2)
  b.wallZ(Z0, Z1, X0 + 0.1, 8, 1.1, roofC, [], 0.2)
  b.wallZ(Z0, Z1, X1 - 0.1, 8, 1.1, roofC, [[-72.5, -70.5]], 0.2)
  // 32 steps x 0.25 = 8m, running north along the east wall
  b.stairs(-31, 0, -58.5, '-z', 32, 2, 0xd8d2c8)
  // Rooftop props
  b.box(-45, 8, -75, 2.4, 0.6, 2.4, C.stone) // tank base
  b.box(-45, 8.6, -75, 2, 1.8, 2, C.white)
  b.box(-70, 8, -76, 1.2, 1.9, 0.9, C.red) // vending machine
  b.box(-58, 8, -64, 2.2, 0.5, 0.7, C.wood) // benches
  b.box(-50, 8, -64, 2.2, 0.5, 0.7, C.wood)
  b.box(-40, 8, -64, 0.25, 4, 0.25, C.stone) // antenna

  // ---- Room furniture --------------------------------------------------------
  const rooms0 = northBounds[0]
  const rooms1 = northBounds[1]
  // Ground floor north row
  classroom(b, rooms0[0], rooms0[1], Z0, CN, 0, 3)
  classroom(b, rooms0[1], rooms0[2], Z0, CN, 0, 3)
  classroom(b, rooms0[2], rooms0[3], Z0, CN, 0, 3)
  teachersRoom(b, rooms0[3], rooms0[4], Z0, CN, 0)
  scienceLab(b, rooms0[4], rooms0[5], Z0, CN, 0)
  computerLab(b, rooms0[5], rooms0[6], Z0, CN, 0)
  // Ground floor south row
  library(b, -80, -64, CS, Z1, 0)
  entranceHall(b, -64, -56, CS, Z1, 0)
  cafeteria(b, -56, -40, CS, Z1, 0)
  // First floor
  for (let i = 0; i < rooms1.length - 1; i++) classroom(b, rooms1[i], rooms1[i + 1], Z0, CN, FLOOR_H, 2)
  artRoom(b, -80, -64, CS, Z1, FLOOR_H)
  clubRoom(b, -64, -56, CS, Z1, FLOOR_H)
  musicRoom(b, -56, -40, CS, Z1, FLOOR_H)

  // ---- Gym, playground, grounds ---------------------------------------------
  gym(b)
  playground(b)
  grounds(b)

  // Room names for the HUD. The smallest matching zone wins in locationAt().
  const g0 = -1
  const g1 = 3.9
  const u0 = 4
  const u1 = 7.9
  b.zone('Classroom 1-A', rooms0[0], Z0, rooms0[1], CN, g0, g1)
  b.zone('Classroom 1-B', rooms0[1], Z0, rooms0[2], CN, g0, g1)
  b.zone('Classroom 1-C', rooms0[2], Z0, rooms0[3], CN, g0, g1)
  b.zone("Teachers' Room", rooms0[3], Z0, rooms0[4], CN, g0, g1)
  b.zone('Science Laboratory', rooms0[4], Z0, rooms0[5], CN, g0, g1)
  b.zone('Computer Laboratory', rooms0[5], Z0, rooms0[6], CN, g0, g1)
  b.zone('Library', -80, CS, -64, Z1, g0, g1)
  b.zone('Entrance Hall', -64, CS, -56, Z1, g0, g1)
  b.zone('Cafeteria', -56, CS, -40, Z1, g0, g1)
  b.zone('School Hallway', X0, CN, X1, CS, g0, g1)
  for (let i = 0; i < rooms1.length - 1; i++) {
    b.zone(`Classroom 2-${'ABCDEFG'[i]}`, rooms1[i], Z0, rooms1[i + 1], CN, u0, u1)
  }
  b.zone('Art Room', -80, CS, -64, Z1, u0, u1)
  b.zone('Club Room', -64, CS, -56, Z1, u0, u1)
  b.zone('Music Room', -56, CS, -40, Z1, u0, u1)
  b.zone('Upper Hallway', X0, CN, X1, CS, u0, u1)

  // Zones (smaller zones listed first win in the lookup)
  b.zone('School Rooftop', X0, Z0, X1, Z1, 7.5, 20)
  b.zone('Gymnasium', -22, -92, 2, -70)
  b.zone('School Building', X0, Z0, X1, Z1)
  b.zone('School Playground', -100, -110, -45, -82)
  b.zone('School Entrance', -100, -58, 3, -40)
  b.zone('Japanese High School', -100, -110, 3, -40)
}

// ---------------------------------------------------------------------------
// Furniture helpers
// ---------------------------------------------------------------------------

function classroom(b: WorldBuilder, x0: number, x1: number, z0: number, z1: number, y: number, rows: number) {
  const cx = (x0 + x1) / 2
  b.box(cx, y + 1.0, z0 + 0.2, Math.min(5, x1 - x0 - 1), 1.3, 0.1, C.boardGreen, false)
  b.box(cx, y, z0 + 1.8, 1.6, 0.8, 0.7, C.woodDark)
  const cols = Math.floor((x1 - x0 - 1) / 1.7)
  const sx = cx - ((cols - 1) * 1.7) / 2
  for (let r = 0; r < rows; r++) {
    const zz = z0 + 4.4 + r * 2.3
    for (let c = 0; c < cols; c++) {
      const xx = sx + c * 1.7
      b.box(xx, y, zz, 1.0, 0.75, 0.6, C.wood)
      b.box(xx, y, zz + 0.75, 0.45, 0.5, 0.45, C.orange)
    }
  }
}

function teachersRoom(b: WorldBuilder, x0: number, x1: number, z0: number, z1: number, y: number) {
  const cx = (x0 + x1) / 2
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const xx = cx + (c - 1) * 3.4
      const zz = z0 + 4 + r * 3
      b.box(xx, y, zz, 1.6, 0.8, 0.8, C.woodDark)
      b.box(xx, y, zz + 0.9, 0.5, 0.5, 0.5, C.black)
    }
  }
  b.box(cx, y, z0 + 0.6, 6, 1.9, 0.5, C.stone) // cabinets
}

function scienceLab(b: WorldBuilder, x0: number, x1: number, z0: number, z1: number, y: number) {
  const cx = (x0 + x1) / 2
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      b.box(cx + (c - 0.5) * 4, y, z0 + 4.5 + r * 3, 3, 0.95, 1.1, C.white)
      b.box(cx + (c - 0.5) * 4, y + 0.95, z0 + 4.5 + r * 3, 0.4, 0.3, 0.4, C.teal, false)
    }
  }
  b.box(cx, y, z0 + 0.5, 4, 1, 0.7, C.stone) // sink counter
  b.box(cx, y + 1.0, z0 + 0.2, 4, 1.3, 0.1, C.boardGreen, false)
}

function computerLab(b: WorldBuilder, x0: number, x1: number, z0: number, z1: number, y: number) {
  const cx = (x0 + x1) / 2
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      const xx = cx + (c - 1.5) * 2.1
      const zz = z0 + 3.6 + r * 3.2
      b.box(xx, y, zz, 1.5, 0.75, 0.8, C.white)
      b.box(xx, y + 0.75, zz - 0.1, 0.7, 0.5, 0.08, C.black, false)
      b.box(xx, y, zz + 0.85, 0.45, 0.5, 0.45, C.lavender)
    }
  }
}

function library(b: WorldBuilder, x0: number, x1: number, z0: number, z1: number, y: number) {
  const cx = (x0 + x1) / 2
  for (const dx of [3, 8, 13]) b.box(x0 + dx, y, z1 - 0.5, 4.5, 2.2, 0.5, C.woodDark)
  for (const dx of [3.5, 12.5]) b.box(x0 + dx, y, z0 + 3.2, 4.5, 2.0, 0.5, C.woodDark)
  b.box(cx, y, z0 + 3.2, 3, 0.8, 1.2, C.wood)
  b.box(cx, y, z0 + 2.2, 2.8, 0.45, 0.4, C.orange)
  b.box(cx, y, z0 + 4.2, 2.8, 0.45, 0.4, C.orange)
}

function entranceHall(b: WorldBuilder, x0: number, x1: number, z0: number, z1: number, y: number) {
  b.box(x0 + 0.5, y, (z0 + z1) / 2, 0.6, 1.8, 3, C.stone) // shoe lockers
  b.box(x1 - 0.5, y, (z0 + z1) / 2, 0.6, 1.8, 3, C.stone)
}

function cafeteria(b: WorldBuilder, x0: number, x1: number, z0: number, z1: number, y: number) {
  const cz = (z0 + z1) / 2 - 0.3
  for (const dx of [3.2, 8, 12.8]) {
    b.box(x0 + dx, y, cz, 1.2, 0.8, 4.2, C.wood)
    b.box(x0 + dx - 1.0, y, cz, 0.4, 0.45, 4.2, C.orange)
    b.box(x0 + dx + 1.0, y, cz, 0.4, 0.45, 4.2, C.orange)
  }
  b.box((x0 + x1) / 2, y, z1 - 0.5, 8, 1.0, 0.7, C.teal)
}

function artRoom(b: WorldBuilder, x0: number, x1: number, z0: number, z1: number, y: number) {
  for (const dx of [3, 6.5, 10, 13]) b.box(x0 + dx, y, z1 - 1.8, 2, 0.8, 1.2, C.wood)
  for (const dx of [2, 8, 14]) b.box(x0 + dx, y, z0 + 1.2, 0.8, 1.5, 0.15, C.yellow)
}

function clubRoom(b: WorldBuilder, x0: number, x1: number, z0: number, z1: number, y: number) {
  const cx = (x0 + x1) / 2
  b.box(cx, y, z1 - 0.9, 3, 0.5, 1, C.pink)
  b.box(cx, y, z1 - 2.6, 1.6, 0.4, 0.8, C.wood)
}

function musicRoom(b: WorldBuilder, x0: number, x1: number, z0: number, z1: number, y: number) {
  b.box(x0 + 3, y, z1 - 1.2, 1.7, 1.1, 0.8, C.black) // piano
  for (let i = 0; i < 5; i++) b.box(x0 + 6 + i * 1.8, y, z0 + 3.6, 0.5, 0.5, 0.5, C.orange)
}

// ---------------------------------------------------------------------------
// Gym, playground, grounds
// ---------------------------------------------------------------------------

function gym(b: WorldBuilder) {
  const x0 = -22
  const x1 = 2
  const z0 = -92
  const z1 = -70
  const wall = shade(C.plasterWarm, 1)
  b.wallX(x0, x1, z0, 0, 8, wall)
  b.wallX(x0, x1, z1, 0, 8, wall, [[-12, -8]])
  b.wallZ(z0, z1, x0, 0, 8, wall)
  b.wallZ(z0, z1, x1, 0, 8, wall)
  b.rect(x0 - 0.4, 8, z0 - 0.4, x1 + 0.4, 0.4, z1 + 0.4, C.roofGreen)
  b.rect(x0, 0, z0, x1, 0.04, z1, C.floorGym, false)
  // Court lines
  b.rect(x0 + 2, 0.04, -81.1, x1 - 2, 0.02, -80.9, C.white, false)
  b.rect(x0 + 2, 0.04, -88, x1 - 2, 0.02, -87.9, C.white, false)
  b.rect(x0 + 2, 0.04, -74, x1 - 2, 0.02, -73.9, C.white, false)
  // Hoops
  for (const hx of [x0 + 1.2, x1 - 1.2]) {
    b.box(hx, 0, -81, 0.15, 3.0, 0.15, C.stone)
    b.box(hx, 3.0, -81, 0.1, 1.05, 1.8, C.white, false)
    b.box(hx > -10 ? hx - 0.35 : hx + 0.35, 3.05, -81, 0.5, 0.05, 0.5, C.orange, false)
  }
  // Upper windows
  for (let wx = x0 + 3; wx < x1 - 1; wx += 4) {
    b.box(wx, 5, z0 - 0.17, 2.4, 1.2, 0.06, C.glass, false)
    b.box(wx, 5, z1 + 0.17, 2.4, 1.2, 0.06, C.glass, false)
  }
}

function playground(b: WorldBuilder) {
  b.rect(-98, 0, -108, -48, 0.03, -86, 0xd98f65, false) // dirt track
  b.rect(-92, 0.03, -104, -54, 0.03, -90, 0x8fd16b, false) // field
  for (const gx of [-92.6, -53.4]) {
    b.box(gx, 0, -99.2, 0.15, 2.2, 0.15, C.white)
    b.box(gx, 0, -94.8, 0.15, 2.2, 0.15, C.white)
    b.box(gx, 2.2, -97, 0.15, 0.15, 4.6, C.white, false)
  }
  b.box(-76, 0, -84.5, 2.2, 0.5, 0.6, C.wood) // benches
  b.box(-70, 0, -84.5, 2.2, 0.5, 0.6, C.wood)
}

function grounds(b: WorldBuilder) {
  const fence = 0xe4e8ee
  b.wallX(-100, 3, -110, 0, 1.5, fence, [], 0.15)
  b.wallX(-100, 3, -40, 0, 1.5, fence, [[-63, -57]], 0.15)
  b.wallZ(-110, -40, -100, 0, 1.5, fence, [], 0.15)
  b.wallZ(-110, -40, 3, 0, 1.5, fence, [], 0.15)
  // Gate pillars and path
  for (const px of [-63.4, -56.6]) b.box(px, 0, -40, 0.6, 2.2, 0.6, C.stone)
  b.rect(-62, 0, -59, -58, 0.03, -34, C.sidewalk, false)
  // Bike shed
  b.rect(-26, 2.2, -58, -12, 0.2, -52, C.roofGrey)
  for (const px of [-26, -12]) for (const pz of [-58, -52]) b.box(px, 0, pz, 0.2, 2.2, 0.2, C.stone)
  // Sakura trees in the front yard and around the compound
  for (const [tx, tz] of [[-78, -50], [-70, -45], [-50, -50], [-42, -45], [-90, -52], [-18, -64], [-8, -60]]) {
    b.tree(tx, tz, 1.1, 'sakura')
  }
  for (const [tx, tz] of [[-96, -88], [-96, -62], [-30, -104], [-8, -100]]) b.tree(tx, tz, 1, 'round')
}
