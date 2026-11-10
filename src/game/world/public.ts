import { WorldBuilder, C, shade, type Gap } from './builder'
import { shell, sign } from './town'

/** Hospital, police station, shrine, park, pool, beach and tree scattering. */

const door = (cx: number, w = 2.2): Gap => [cx - w / 2, cx + w / 2]

export function buildPublic(b: WorldBuilder) {
  hospital(b)
  police(b)
  shrine(b)
  park(b)
  pool(b)
  beach(b)
  scatterTrees(b, 420, 20261109)
}

function hospital(b: WorldBuilder) {
  const x0 = 128
  const x1 = 168
  const z0 = -72
  const z1 = -40
  shell(b, x0, x1, z0, z1, 5, C.white, C.roofGrey, door(148, 4), 's', C.floorTile)
  sign(b, x0, x1, z1 + 0.15, 5, C.teal)
  // Red cross on the front
  b.box(148, 3.6, z1 + 0.25, 0.5, 1.4, 0.1, C.red, false)
  b.box(148, 4.05, z1 + 0.25, 1.4, 0.5, 0.1, C.red, false)
  b.box(142, 0, -44, 5, 1.0, 1, C.woodDark) // reception
  for (let i = 0; i < 6; i++) {
    const bx = 134 + (i % 3) * 8
    const bz = -66 + Math.floor(i / 3) * 6
    b.box(bx, 0, bz, 1.1, 0.55, 2.1, C.white)
    b.box(bx, 0.55, bz - 0.8, 1.1, 0.2, 0.5, C.pink, false)
  }
  b.wallZ(z0, -52, 150, 0, 5, shade(C.white, 0.95), [door(-58, 2.4)]) // ward divider
  b.box(160, 0, -46, 4, 0.5, 0.9, C.teal) // waiting bench
  b.zone('Hospital', x0, z0, x1, z1)
}

function police(b: WorldBuilder) {
  const x0 = 172
  const x1 = 196
  const z0 = -62
  const z1 = -40
  shell(b, x0, x1, z0, z1, 4.5, C.plaster, C.roofBlue, door(184, 3), 's', C.floorTile)
  sign(b, x0, x1, z1 + 0.15, 4.5, C.roofBlue)
  b.box(184, 0, -46, 6, 1.0, 1, C.woodDark) // counter
  for (let i = 0; i < 3; i++) b.box(176 + i * 3, 0, -58, 1.6, 0.8, 0.9, C.woodDark) // desks
  // Cell with bars
  for (let i = 0; i < 7; i++) b.box(189 + i * 0.9, 0, -54, 0.1, 2.4, 0.1, C.stone)
  b.wallZ(-62, -54, 189, 0, 3.2, C.concrete)
  b.zone('Police Station', x0, z0, x1, z1)
}

function shrine(b: WorldBuilder) {
  b.rect(156, 0, -134, 160, 0.04, -98, C.stone, false) // approach path
  // Torii gate
  b.box(154.2, 0, -98, 0.5, 5, 0.5, C.red)
  b.box(161.8, 0, -98, 0.5, 5, 0.5, C.red)
  b.box(158, 4.7, -98, 10.4, 0.4, 0.7, C.black)
  b.box(158, 3.7, -98, 8, 0.3, 0.4, C.red, false)
  // Stone lanterns along the path
  for (const lz of [-108, -118, -128]) {
    for (const lx of [154, 162]) {
      b.box(lx, 0, lz, 0.6, 1.2, 0.6, C.stone)
      b.box(lx, 1.2, lz, 0.9, 0.5, 0.9, C.stone, false)
    }
  }
  b.box(152, 0, -122, 2.2, 0.8, 1.2, C.stone) // purification basin
  b.stairs(158, 0, -138, '-z', 4, 4, C.stone, 0.25, 0.5)
  b.rect(148, 0, -160, 168, 1.0, -140, C.stone)
  // Main hall on the platform
  const wall = C.woodDark
  b.wallX(152, 164, -158, 1, 3.5, wall)
  b.wallX(152, 164, -146, 1, 3.5, wall, [door(158, 4)])
  b.wallZ(-158, -146, 152, 1, 3.5, wall)
  b.wallZ(-158, -146, 164, 1, 3.5, wall)
  b.rect(150, 4.5, -160, 166, 0.4, -144, 0x4a4f5a)
  b.rect(153, 4.9, -157, 163, 0.6, -147, 0x3d424d)
  for (const px of [152.2, 163.8]) b.box(px, 1, -146, 0.4, 3.5, 0.4, C.red)
  b.box(158, 1, -155, 2, 0.8, 1, C.wood) // offering box
  b.rect(152, 1, -158, 164, 0.04, -146, C.floorWood, false)
  for (const [tx, tz] of [[146, -104], [170, -110], [146, -130], [172, -128], [144, -150], [174, -150], [152, -166], [164, -166]]) {
    b.tree(tx, tz, 1.2, tx % 2 === 0 ? 'pine' : 'sakura')
  }
  b.zone('Shrine', 120, -170, 196, -95)
}

function park(b: WorldBuilder) {
  b.rect(52, 0, 10, 114, 0.03, 52, 0xaee38f, false)
  b.rect(81, 0.03, 10, 85, 0.03, 52, C.sidewalk, false) // paths
  b.rect(52, 0.03, 30, 114, 0.03, 34, C.sidewalk, false)
  b.water(90, 36, 108, 50, 0.06, 0x7fd3e8) // pond
  // Benches
  for (const [bx, bz] of [[78, 32], [88, 32], [78, 20], [88, 20], [96, 32], [110, 32]]) {
    b.box(bx, 0, bz, 2, 0.45, 0.6, C.wood)
    b.box(bx, 0.45, bz + 0.25, 2, 0.5, 0.1, C.woodDark)
  }
  // Playground: swings, sandbox, climbing frame
  for (const sx of [58, 64]) {
    b.box(sx, 0, 14, 0.15, 2.4, 0.15, C.red)
    b.box(sx, 0, 18, 0.15, 2.4, 0.15, C.red)
    b.box(sx, 2.3, 16, 0.2, 0.15, 4.2, C.red)
  }
  b.box(61, 0.5, 15.2, 0.5, 0.1, 0.35, C.yellow, false)
  b.box(61, 0.5, 16.8, 0.5, 0.1, 0.35, C.yellow, false)
  b.rect(68, 0, 12, 73, 0.2, 17, C.sandDark)
  for (const [gx, gz] of [[58, 24], [62, 24], [58, 28], [62, 28]]) b.box(gx, 0, gz, 0.2, 2, 0.2, C.teal)
  b.rect(58, 2, 24, 62.2, 0.15, 28.2, C.teal)
  b.rect(52, 0, 10, 76, 0.01, 30, 0xf4e5b5, false)
  for (const [tx, tz] of [[54, 12], [54, 50], [72, 12], [112, 12], [112, 50], [70, 50], [96, 14], [100, 14], [66, 36], [74, 44]]) {
    b.tree(tx, tz, 1.1, 'sakura')
  }
  b.zone('Playground', 52, 10, 76, 30)
  b.zone('City Park', 52, 10, 114, 52)
}

function pool(b: WorldBuilder) {
  const deck = 0xdfe9ee
  b.rect(130, 0, 12, 170, 0.3, 18, deck)
  b.rect(130, 0, 40, 170, 0.3, 46, deck)
  b.rect(130, 0, 18, 138, 0.3, 40, deck)
  b.rect(162, 0, 18, 170, 0.3, 40, deck)
  b.water(138, 18, 162, 40, 0.22, 0x59c9ec)
  for (let i = 1; i < 4; i++) b.rect(138, 0.2, 18 + i * 5.5, 162, 0.05, 18.15 + i * 5.5, C.red, false) // lane ropes
  // Changing rooms
  shell(b, 132, 146, 2, 12, 3.6, C.plaster, C.teal, door(139, 2.4), 's', C.floorTile)
  for (let i = 0; i < 3; i++) b.box(134 + i * 4, 0, 4, 0.6, 1.8, 3, C.teal)
  for (const px of [150, 156, 162]) b.box(px, 0.3, 14.5, 0.9, 0.5, 0.9, C.orange) // loungers
  b.zone('Swimming Pool', 130, 2, 170, 46)
}

function beach(b: WorldBuilder) {
  b.rect(-200, 0, 118, 200, 0.03, 175, C.sand, false)
  b.rect(-200, 0, 118, 200, 0.05, 124, 0xdac38a, false)
  b.water(-200, 175, 200, 200, 0.05, 0x4cc9f0)
  const colors = [C.red, C.yellow, C.teal, C.pink, C.orange]
  for (let i = 0; i < 9; i++) {
    const ux = -80 + i * 22
    b.box(ux, 0, 140, 0.1, 2.4, 0.1, C.white)
    b.box(ux, 2.3, 140, 2.8, 0.12, 2.8, colors[i % colors.length], false)
    b.box(ux + 1.8, 0, 142.2, 1.2, 0.06, 2, colors[(i + 2) % colors.length], false) // towel
  }
  // Volleyball net
  b.box(-30, 0, 160, 0.12, 2.4, 0.12, C.stone)
  b.box(-18, 0, 160, 0.12, 2.4, 0.12, C.stone)
  b.box(-24, 1.6, 160, 12, 0.7, 0.04, C.white, false)
  // Lifeguard tower
  for (const [lx, lz] of [[30.2, 150.2], [32.8, 150.2], [30.2, 153.2], [32.8, 153.2]]) b.box(lx, 0, lz, 0.2, 2, 0.2, C.wood)
  b.rect(30, 2.0, 150, 33, 0.25, 153.4, C.white)
  b.rect(29.8, 4.6, 149.8, 33.2, 0.2, 153.6, C.red)
  b.stairs(31.5, 0, 157, '-z', 9, 1.4, C.wood)
  b.zone('Beach', -200, 118, 200, 200)
}

/** Deterministic tree scatter (same seed gives the same forest for every player). */
function scatterTrees(b: WorldBuilder, count: number, seed: number) {
  let s = seed >>> 0
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const solid = b.boxes.filter((bx) => bx.y > -0.5)
  const taken = b.trees
  let placed = 0
  let tries = 0
  while (placed < count && tries < count * 25) {
    tries++
    const x = -194 + rand() * 388
    const z = -194 + rand() * 306 // stays north of the beach
    const pad = 2.6
    let blocked = false
    for (const bx of solid) {
      if (Math.abs(x - bx.x) < bx.w / 2 + pad && Math.abs(z - bz(bx)) < bx.d / 2 + pad) {
        blocked = true
        break
      }
    }
    if (blocked) continue
    for (const t of taken) {
      if ((x - t.x) ** 2 + (z - t.z) ** 2 < 25) {
        blocked = true
        break
      }
    }
    if (blocked) continue
    const r = rand()
    b.tree(x, z, 0.8 + rand() * 0.6, r < 0.55 ? 'sakura' : r < 0.85 ? 'round' : 'pine')
    placed++
  }
}

const bz = (bx: { z: number }) => bx.z
