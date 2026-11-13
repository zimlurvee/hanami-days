import { WorldBuilder, C } from './builder'

/**
 * Two districts built from Kenney's CC0 City Kit models (kenney.nl):
 *  - Sunny Hills Suburb (south-east), reached along R2/R5 then the east-west street at z = 92
 *  - Industrial District (north-west), reached by the service road leaving R1 at x = -108
 * The models are solid, non-enterable buildings; roads and sidewalks are plain boxes.
 */

const SUB = 'suburban/building-type-'
const IND = 'industrial/'
const SUB_COLOR = 0xe3b9a0
const IND_COLOR = 0x9aa3ad

export function buildDistricts(b: WorldBuilder) {
  suburb(b)
  industrial(b)
}

function suburb(b: WorldBuilder) {
  const road = (x0: number, z0: number, x1: number, z1: number) => b.rect(x0, 0, z0, x1, 0.05, z1, C.road, false)
  const walk = (x0: number, z0: number, x1: number, z1: number) => b.rect(x0, 0, z0, x1, 0.07, z1, C.sidewalk, false)

  road(125, 88, 198, 96) // main street, joins R5 at x = 125
  walk(125, 86, 198, 88)
  walk(125, 96, 198, 98)
  for (let x = 128; x < 196; x += 8) b.rect(x, 0.05, 91.9, x + 4, 0.01, 92.1, C.roadLine, false)

  const lots = [134, 150, 166, 182]
  const north = ['a', 'e', 'j', 'n']
  const south = ['c', 'g', 'l', 't']
  lots.forEach((x, i) => {
    b.model(SUB + north[i], x, 78, Math.PI, 8, SUB_COLOR) // fronts face south, toward the street
    b.model(SUB + south[i], x, 106, 0, 8, SUB_COLOR) // fronts face north
  })
  // Trees in the gaps between houses
  for (const x of [142, 158, 174, 190]) {
    b.tree(x, 80, 1, 'sakura')
    b.tree(x, 104, 1, 'round')
  }
  b.spawn('car', 140, 92, 0)
  b.spawn('car', 176, 92, Math.PI)
  b.zone('Sunny Hills Suburb', 125, 68, 200, 116)
}

function industrial(b: WorldBuilder) {
  const road = (x0: number, z0: number, x1: number, z1: number) => b.rect(x0, 0, z0, x1, 0.05, z1, 0x3f444e, false)

  road(-112, -150, -104, -35) // service road north from R1
  road(-198, -155, -104, -145) // east-west industrial street
  for (let z = -40; z > -146; z -= 8) b.rect(-108.1, 0.05, z - 4, -107.9, 0.01, z, C.roadLine, false)
  for (let x = -110; x > -196; x -= 8) b.rect(x - 4, 0.05, -150.1, x, 0.01, -149.9, C.roadLine, false)

  // North side of the street (z < -155), fronts toward +z
  b.model(IND + 'building-a', -185, -165, 0, 8, IND_COLOR)
  b.model(IND + 'building-c', -157, -165, 0, 8, IND_COLOR)
  b.model(IND + 'building-e', -130, -165, 0, 8, IND_COLOR)
  // South side (z > -145), fronts toward -z
  b.model(IND + 'building-g', -185, -132, Math.PI, 8, IND_COLOR)
  b.model(IND + 'building-l', -158, -132, Math.PI, 8, IND_COLOR)
  b.model(IND + 'building-q', -131, -132, Math.PI, 8, IND_COLOR)
  // Along the service road, west side
  b.model(IND + 'building-r', -122, -90, Math.PI / 2, 8, IND_COLOR)
  b.model(IND + 'building-t', -122, -60, Math.PI / 2, 8, IND_COLOR)

  // Yard details
  b.model(IND + 'shipping-container-a', -170.6, -167, 0, 6, IND_COLOR)
  b.model(IND + 'shipping-container-b', -172.3, -132, 0, 6, 0xd9625a)
  b.model(IND + 'shipping-container-c', -142.7, -167, 0, 6, 0x5b86c9)
  b.model(IND + 'water-tower', -196, -125, 0, 8, IND_COLOR)
  b.model(IND + 'chimney-large', -112, -182, 0, 8, IND_COLOR)
  b.model(IND + 'chimney-medium', -123, -182, 0, 8, IND_COLOR)
  b.model(IND + 'detail-tank-large', -193, -178, 0, 6, IND_COLOR)
  b.model(IND + 'windmill', -196, -100, 0, 8, IND_COLOR)

  b.spawn('car', -108, -80, Math.PI / 2)
  b.zone('Industrial District', -198, -192, -104, -118)
  b.zone('Service Road', -113, -150, -103, -35)
}
