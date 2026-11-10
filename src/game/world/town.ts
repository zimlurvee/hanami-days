import { WorldBuilder, C, shade, type Gap } from './builder'

/**
 * Roads, commercial strip and residential area.
 *
 * Road grid (centre lines):
 *   R1  z = -30  east-west, full width
 *   R2  z =  60  east-west, full width
 *   R3  x =  40  north-south, full height
 *   R4  x = -100 north-south, south of R1
 *   R5  x =  120 north-south, south of R1
 */

const door = (cx: number, w = 2.2): Gap => [cx - w / 2, cx + w / 2]

export function buildTown(b: WorldBuilder) {
  // Ground: big grass slab, top surface at y = 0
  b.box(0, -1, 0, 400, 1, 400, C.grass)

  roads(b)
  commercial(b)
  residential(b)
  busStopsAndParking(b)
}

function roads(b: WorldBuilder) {
  const road = (x0: number, z0: number, x1: number, z1: number) => b.rect(x0, 0, z0, x1, 0.05, z1, C.road, false)
  const walk = (x0: number, z0: number, x1: number, z1: number) => b.rect(x0, 0, z0, x1, 0.07, z1, C.sidewalk, false)

  road(-200, -35, 200, -25) // R1
  road(-200, 55, 200, 65) // R2
  road(35, -200, 45, 200) // R3
  road(-105, -25, -95, 55) // R4 (north part, joins R1 and R2)
  road(-105, 65, -95, 200)
  road(115, -25, 125, 55) // R5
  road(115, 65, 125, 200)

  // Sidewalks along R1 and R2
  for (const [za, zb] of [[-37, -35], [-25, -23], [53, 55], [65, 67]]) {
    for (const [xa, xb] of [[-200, 33], [47, 200]]) walk(xa, za, xb, zb)
  }
  // Sidewalks along R3 (west and east sides)
  for (const [xa, xb] of [[33, 35], [45, 47]]) {
    walk(xa, -200, xb, -37)
    walk(xa, -23, xb, 53)
    walk(xa, 67, xb, 200)
  }

  // Dashed centre lines
  const inIntersection = (v: number, centres: number[]) => centres.some((c) => Math.abs(v - c) < 8)
  for (let x = -196; x < 196; x += 8) {
    if (inIntersection(x + 2, [40, -100, 120])) continue
    b.rect(x, 0.05, -30.12, x + 4, 0.01, -29.88, C.roadLine, false)
    b.rect(x, 0.05, 59.88, x + 4, 0.01, 60.12, C.roadLine, false)
  }
  for (let z = -196; z < 196; z += 8) {
    if (inIntersection(z + 2, [-30, 60])) continue
    b.rect(39.88, 0.05, z, 40.12, 0.01, z + 4, C.roadLine, false)
  }
  for (let z = -16; z < 190; z += 8) {
    if (inIntersection(z + 2, [60])) continue
    b.rect(-100.12, 0.05, z, -99.88, 0.01, z + 4, C.roadLine, false)
    b.rect(119.88, 0.05, z, 120.12, 0.01, z + 4, C.roadLine, false)
  }
  // Zebra crossing over R3 at R1
  for (let i = 0; i < 8; i++) b.rect(36 + i * 1.2, 0.05, -34, 36.6 + i * 1.2, 0.01, -26, C.roadLine, false)
}

/** Hollow single-room shop shell. Front wall (with door) faces `front`. */
export function shell(
  b: WorldBuilder,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  h: number,
  wall: number,
  roof: number,
  doorGap: Gap,
  front: 'n' | 's',
  floor: number,
) {
  b.wallX(x0, x1, z0, 0, h, wall, front === 'n' ? [doorGap] : [])
  b.wallX(x0, x1, z1, 0, h, wall, front === 's' ? [doorGap] : [])
  b.wallZ(z0, z1, x0, 0, h, wall)
  b.wallZ(z0, z1, x1, 0, h, wall)
  b.rect(x0 - 0.3, h, z0 - 0.3, x1 + 0.3, 0.35, z1 + 0.3, roof)
  b.rect(x0, 0, z0, x1, 0.04, z1, floor, false)
  // Windows flanking the door on the front face
  const fz = front === 'n' ? z0 - 0.17 : z1 + 0.17
  for (const wx of [x0 + (doorGap[0] - x0) / 2, doorGap[1] + (x1 - doorGap[1]) / 2]) {
    b.box(wx, 1.0, fz, Math.min(3, (x1 - x0) / 4), 1.5, 0.06, C.glass, false)
  }
}

export function sign(b: WorldBuilder, x0: number, x1: number, z: number, h: number, color: number) {
  b.rect(x0 + 0.5, h - 1.1, z - 0.2, x1 - 0.5, 0.9, z + 0.2, color, false)
}

function commercial(b: WorldBuilder) {
  // North side of R1, shops face south (door on z = -40 wall).
  const z0 = -64
  const z1 = -40
  const H = 4.5

  // Convenience store
  shell(b, 48, 65.6, z0, z1, H, C.plaster, C.roofBlue, door(56.8, 2.6), 's', C.floorTile)
  sign(b, 48, 65.6, z1 + 0.15, H, C.teal)
  for (const dz of [-60, -57, -54]) b.box(54, 0, dz, 6, 1.7, 0.6, C.white)
  b.box(62, 0, -44, 3, 1.0, 1, C.orange) // counter
  b.box(64.6, 0, -58, 0.8, 2, 3, C.glass) // fridge

  // Restaurant
  shell(b, 66, 83.6, z0, z1, H, C.plasterWarm, C.roofRed, door(74.8, 2.6), 's', C.floorWood)
  sign(b, 66, 83.6, z1 + 0.15, H, C.red)
  for (let i = 0; i < 4; i++) {
    const tx = 70 + (i % 2) * 6
    const tz = -54 + Math.floor(i / 2) * 5
    b.box(tx, 0, tz, 1.6, 0.75, 1.6, C.wood)
    b.box(tx - 1.3, 0, tz, 0.5, 0.5, 0.5, C.orange)
    b.box(tx + 1.3, 0, tz, 0.5, 0.5, 0.5, C.orange)
  }
  b.box(79, 0, -61, 6, 1.0, 1, C.woodDark) // bar

  // Clothing shop
  shell(b, 84, 101.6, z0, z1, H, C.plaster, C.roofGreen, door(92.8, 2.6), 's', 0xf3e8f2)
  sign(b, 84, 101.6, z1 + 0.15, H, C.pink)
  for (let i = 0; i < 4; i++) b.box(89 + i * 3, 0, -58, 0.2, 1.6, 2.4, C.lavender)
  b.box(94, 0, -46, 3, 1, 1, C.woodDark)
  b.box(99.5, 0, -52, 0.15, 2.2, 1.4, C.glass, false) // mirror

  // Café
  shell(b, 102, 119.6, z0, z1, H, C.plasterWarm, C.roofRed, door(110.8, 2.6), 's', C.floorWood)
  sign(b, 102, 119.6, z1 + 0.15, H, C.yellow)
  for (let i = 0; i < 3; i++) {
    b.box(107 + i * 4, 0, -52, 1.2, 0.75, 1.2, C.white)
    b.box(107 + i * 4, 0, -50.2, 0.5, 0.5, 0.5, C.pink)
  }
  b.box(112, 0, -61, 7, 1.0, 1, C.teal) // counter
  b.box(116, 0, -48, 2.4, 0.5, 1, C.pink) // sofa

  // Supermarket (south of R1, faces north)
  shell(b, 48, 90, -20, 4, 5, C.plaster, C.roofBlue, door(69, 4), 'n', C.floorTile)
  sign(b, 48, 90, -20.15, 5, C.orange)
  for (let i = 0; i < 6; i++) b.box(70, 0, -14 + i * 3, 14, 1.6, 0.6, C.white)
  for (let i = 0; i < 3; i++) b.box(54 + i * 3.5, 0, -16, 1.2, 1.0, 2.2, C.teal) // checkouts

  b.zone('Convenience Store', 48, z0, 65.6, z1)
  b.zone('Restaurant', 66, z0, 83.6, z1)
  b.zone('Clothing Shop', 84, z0, 101.6, z1)
  b.zone('Cafe', 102, z0, 119.6, z1)
  b.zone('Supermarket', 48, -20, 90, 4)
  b.zone('Shopping Street', 46, -66, 122, -23)
}

const WALLS = [C.plaster, 0xf7d9d9, 0xdff0e6, 0xe3ecf9, 0xfff1c9, 0xf5e3d2]
const ROOFS = [C.roofRed, C.roofBlue, C.roofGreen, C.roofGrey, 0xb8665a]

function house(b: WorldBuilder, x: number, z0: number, i: number) {
  const w = 12
  const d = 10
  const h = 3
  const wall = WALLS[i % WALLS.length]
  const roof = ROOFS[(i * 3 + 1) % ROOFS.length]
  shell(b, x, x + w, z0, z0 + d, h, wall, roof, door(x + w / 2), 'n', C.floorWood)
  // Interior divider with an opening, stepped roof ridge
  b.wallZ(z0, z0 + d, x + w * 0.62, 0, h, shade(wall, 0.96), [door(z0 + d / 2)])
  b.rect(x + 1.5, h + 0.35, z0 + 1.5, x + w - 1.5, 0.7, z0 + d - 1.5, shade(roof, 0.92))
  b.rect(x + 3.5, h + 1.05, z0 + 3, x + w - 3.5, 0.6, z0 + d - 3, shade(roof, 0.85))
  // Furniture
  b.box(x + 1.2, 0, z0 + d - 2, 1.1, 0.5, 2.0, C.pink) // bed
  b.box(x + 3.6, 0, z0 + d - 1, 1.6, 0.75, 0.9, C.wood) // desk
  b.box(x + 8.5, 0, z0 + 3, 2.4, 0.5, 1, C.teal) // sofa
  b.box(x + 8.5, 0, z0 + d - 1, 1.6, 0.9, 0.5, C.black) // TV unit
  // Front garden
  b.box(x + 1.5, 0, z0 - 1.2, 1.2, 0.3, 0.8, C.pink, false)
  b.box(x + w - 1.5, 0, z0 - 1.2, 1.2, 0.3, 0.8, C.yellow, false)
  b.rect(x + w / 2 - 0.9, 0, z0 - 3, x + w / 2 + 0.9, 0.03, z0, C.sidewalk, false)
}

function apartment(b: WorldBuilder, x0: number, x1: number, z0: number, z1: number, color: number) {
  // Hollow lobby on the ground floor, solid block above
  b.wallX(x0, x1, z0, 0, 4, color, [door((x0 + x1) / 2, 3)])
  b.wallX(x0, x1, z1, 0, 4, color)
  b.wallZ(z0, z1, x0, 0, 4, color)
  b.wallZ(z0, z1, x1, 0, 4, color)
  b.rect(x0, 0, z0, x1, 0.04, z1, C.floorTile, false)
  b.box((x0 + x1) / 2, 0, z1 - 1.5, 4, 1, 0.8, C.woodDark) // reception
  b.rect(x0 - 0.2, 4, z0 - 0.2, x1 + 0.2, 12, z1 + 0.2, color)
  b.rect(x0 - 0.4, 16, z0 - 0.4, x1 + 0.4, 0.5, z1 + 0.4, C.roofGrey)
  for (let fl = 0; fl < 3; fl++) {
    for (let wx = x0 + 2; wx < x1 - 1; wx += 3.5) {
      b.box(wx, 5.4 + fl * 3.6, z0 - 0.25, 1.8, 1.6, 0.06, C.glass, false)
      b.box(wx, 5.4 + fl * 3.6, z1 + 0.25, 1.8, 1.6, 0.06, C.glass, false)
      b.box(wx, 4.9 + fl * 3.6, z0 - 0.6, 2.2, 0.15, 0.9, C.stone, false) // balcony
    }
  }
  b.zone('Apartments', x0, z0, x1, z1)
}

function smallShop(b: WorldBuilder, x0: number, x1: number, color: number, signColor: number, name: string) {
  const z0 = 8
  const z1 = 20
  shell(b, x0, x1, z0, z1, 3.8, C.plaster, color, door((x0 + x1) / 2, 2.4), 'n', C.floorWood)
  sign(b, x0, x1, z0 - 0.15, 3.8, signColor)
  b.box((x0 + x1) / 2, 0, z0 + 3, 4, 1, 0.9, C.woodDark)
  b.box(x0 + 2, 0, z1 - 1.2, 0.8, 1.8, 3.4, C.white)
  b.box(x1 - 2, 0, z1 - 1.2, 0.8, 1.8, 3.4, C.white)
  b.zone(name, x0, z0, x1, z1)
}

function residential(b: WorldBuilder) {
  let n = 0
  // Row A: north of the residential block, doors face R1
  for (let i = 0; i < 5; i++) house(b, -190 + i * 16, -20, n++)
  for (let i = 0; i < 7; i++) house(b, -88 + i * 16, -20, n++)
  // Row B: south of R2, doors face R2
  for (let i = 0; i < 5; i++) house(b, -190 + i * 16, 70, n++)
  for (let i = 0; i < 7; i++) house(b, -88 + i * 16, 70, n++)
  // Street trees in the gaps between houses
  for (let i = 0; i < 7; i++) {
    b.tree(-88 + i * 16 + 14, -17, 0.9, 'sakura')
    b.tree(-88 + i * 16 + 14, 73, 0.9, 'sakura')
  }

  apartment(b, -90, -70, 4, 22, 0xf4d4c4)
  apartment(b, -60, -40, 4, 22, 0xcfe3f5)
  smallShop(b, -30, -16, C.roofRed, C.pink, 'Bakery')
  smallShop(b, -14, 0, C.roofGreen, C.teal, 'Flower Shop')
  smallShop(b, 2, 16, C.roofBlue, C.yellow, 'Book Store')

  b.zone('Residential Area', -200, -25, 34, 90)
}

function busStopsAndParking(b: WorldBuilder) {
  const stop = (x: number, z: number, faceSouth: boolean) => {
    const dz = faceSouth ? 1 : -1
    b.rect(x - 1.8, 2.4, z - 0.8, x + 1.8, 0.15, z + 0.8, C.teal) // roof
    b.box(x - 1.7, 0, z, 0.1, 2.4, 1.4, C.stone)
    b.box(x + 1.7, 0, z, 0.1, 2.4, 1.4, C.stone)
    b.box(x, 0, z - dz * 0.6, 3.4, 2.4, 0.08, C.glass, false) // back panel
    b.box(x, 0, z - dz * 0.35, 2.4, 0.45, 0.5, C.wood) // bench
    b.box(x + 2.4, 0, z + dz * 0.8, 0.1, 2.6, 0.1, C.stone) // sign post
    b.box(x + 2.4, 2.4, z + dz * 0.8, 0.5, 0.4, 0.06, C.red, false)
  }
  stop(20, -36.2, true)
  stop(70, -36.2, true)
  stop(-40, -23.8, false)
  stop(60, 53.8, false)
  b.spawn('bus', 12, -31.5, Math.PI / 2)

  // Parking next to the supermarket
  b.rect(92, 0, -20, 113, 0.05, 4, 0x555b66, false)
  for (let i = 0; i < 8; i++) b.rect(93.5 + i * 2.5, 0.05, -18, 93.6 + i * 2.5, 0.01, -13, C.roadLine, false)
  for (let i = 0; i < 4; i++) b.spawn('car', 94.7 + i * 2.5 * 2, -15.5, 0)
  b.spawn('motorcycle', 100, -2, 0)
  b.spawn('bicycle', -56, -37, 0)
  b.spawn('bicycle', -64, -37, 0)
  b.zone('Parking Area', 92, -20, 113, 4)
}
