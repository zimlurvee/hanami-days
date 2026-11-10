/**
 * WorldBuilder collects every solid or decorative box in the town into flat
 * arrays. The renderer then draws all boxes with one InstancedMesh and the
 * physics layer adds one cuboid collider per solid box. Layout code (school.ts,
 * town.ts, public.ts) is pure data generation with no React.
 */

export interface BoxDef {
  /** Centre X */
  x: number
  /** Bottom Y */
  y: number
  /** Centre Z */
  z: number
  w: number
  h: number
  d: number
  color: number
  collide: boolean
}

export interface ZoneDef {
  name: string
  x0: number
  z0: number
  x1: number
  z1: number
  /** Optional vertical range so upper floors / rooftops can have their own names. */
  y0: number
  y1: number
}

export interface WaterDef {
  x0: number
  z0: number
  x1: number
  z1: number
  y: number
  color: number
}

export interface TreeDef {
  x: number
  z: number
  scale: number
  kind: 'sakura' | 'pine' | 'round'
}

export interface SpawnDef {
  kind: 'car' | 'bicycle' | 'motorcycle' | 'bus'
  x: number
  z: number
  yaw: number
}

export type Gap = [number, number]

export const WALL_T = 0.3
/** Height of a wall that sits under a 0.3 slab on a 4m storey. */
export const WALL_H = 3.7
export const DOOR_H = 2.4

export class WorldBuilder {
  boxes: BoxDef[] = []
  zones: ZoneDef[] = []
  waters: WaterDef[] = []
  trees: TreeDef[] = []
  spawns: SpawnDef[] = []

  /** Box by centre x/z and bottom y. */
  box(x: number, y: number, z: number, w: number, h: number, d: number, color: number, collide = true) {
    this.boxes.push({ x, y, z, w, h, d, color, collide })
  }

  /** Box by corner coordinates. */
  rect(x0: number, y: number, z0: number, x1: number, h: number, z1: number, color: number, collide = true) {
    this.box((x0 + x1) / 2, y, (z0 + z1) / 2, Math.abs(x1 - x0), h, Math.abs(z1 - z0), color, collide)
  }

  /** Wall running along X at fixed z. Gaps are doorways with a lintel above. */
  wallX(x0: number, x1: number, z: number, y: number, h: number, color: number, gaps: Gap[] = [], t = WALL_T) {
    this.wall(x0, x1, gaps, y, h, color, (a, b, yy, hh) => this.rect(a, yy, z - t / 2, b, hh, z + t / 2, color))
  }

  /** Wall running along Z at fixed x. */
  wallZ(z0: number, z1: number, x: number, y: number, h: number, color: number, gaps: Gap[] = [], t = WALL_T) {
    this.wall(z0, z1, gaps, y, h, color, (a, b, yy, hh) => this.rect(x - t / 2, yy, a, x + t / 2, hh, b, color))
  }

  private wall(
    a0: number,
    a1: number,
    gaps: Gap[],
    y: number,
    h: number,
    _color: number,
    emit: (a: number, b: number, y: number, h: number) => void,
  ) {
    const sorted = [...gaps].sort((p, q) => p[0] - q[0])
    let cur = a0
    for (const [g0, g1] of sorted) {
      if (g0 > cur) emit(cur, g0, y, h)
      if (h > DOOR_H) emit(g0, g1, y + DOOR_H, h - DOOR_H)
      cur = g1
    }
    if (cur < a1) emit(cur, a1, y, h)
  }

  /**
   * Solid staircase. (x, z) is the bottom-edge centre of step 1.
   * Each step is a full-height block from y up so the stairs are solid.
   */
  stairs(
    x: number,
    y: number,
    z: number,
    dir: '+x' | '-x' | '+z' | '-z',
    steps: number,
    width: number,
    color: number,
    rise = 0.25,
    run = 0.4,
  ) {
    for (let i = 1; i <= steps; i++) {
      const off = run * (i - 0.5)
      const h = rise * i
      const c = i % 2 === 0 ? color : shade(color, 0.93)
      switch (dir) {
        case '+x':
          this.box(x + off, y, z, run, h, width, c)
          break
        case '-x':
          this.box(x - off, y, z, run, h, width, c)
          break
        case '+z':
          this.box(x, y, z + off, width, h, run, c)
          break
        case '-z':
          this.box(x, y, z - off, width, h, run, c)
          break
      }
    }
  }

  zone(name: string, x0: number, z0: number, x1: number, z1: number, y0 = -5, y1 = 100) {
    this.zones.push({ name, x0, z0, x1, z1, y0, y1 })
  }

  water(x0: number, z0: number, x1: number, z1: number, y: number, color = 0x5ec8f2) {
    this.waters.push({ x0, z0, x1, z1, y, color })
  }

  tree(x: number, z: number, scale = 1, kind: TreeDef['kind'] = 'sakura') {
    this.trees.push({ x, z, scale, kind })
  }

  spawn(kind: SpawnDef['kind'], x: number, z: number, yaw = 0) {
    this.spawns.push({ kind, x, z, yaw })
  }
}

export function shade(color: number, f: number): number {
  const r = Math.min(255, Math.round(((color >> 16) & 255) * f))
  const g = Math.min(255, Math.round(((color >> 8) & 255) * f))
  const b = Math.min(255, Math.round((color & 255) * f))
  return (r << 16) | (g << 8) | b
}

/** Shared colour palette: soft, bright, anime-leaning. */
export const C = {
  grass: 0x9bdc7a,
  grassDark: 0x82c765,
  road: 0x4a4f5a,
  roadLine: 0xf4f1e6,
  sidewalk: 0xcfd3d9,
  plaster: 0xfaf4ea,
  plasterWarm: 0xf7e3cf,
  schoolBlue: 0x6aa7e8,
  roofRed: 0xd9625a,
  roofBlue: 0x5b86c9,
  roofGreen: 0x5fae83,
  roofGrey: 0x6c7380,
  wood: 0xc99a6b,
  woodDark: 0x8d6445,
  floorWood: 0xe8cfa6,
  floorTile: 0xe6edf2,
  floorGym: 0xe3b97a,
  glass: 0x9ad7f0,
  concrete: 0xc9ccd1,
  sand: 0xf3dfb0,
  sandDark: 0xe2c78f,
  red: 0xe5484d,
  pink: 0xffb3cf,
  white: 0xffffff,
  black: 0x2a2d34,
  boardGreen: 0x2f6b55,
  yellow: 0xffd966,
  orange: 0xffa45c,
  teal: 0x5cc8c2,
  lavender: 0xb9a6f0,
  stone: 0xaab0b8,
}
