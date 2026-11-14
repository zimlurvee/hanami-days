import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { runtime } from '@/game/runtime'
import { useSettings } from '@/stores/settingsStore'
import { SCHOOL_BUILDINGS } from './school'

/**
 * The school: "School Zimlurvee Blend" by Joaquito (School Creator V2, CC-BY 4.0).
 *
 * public/school holds a web-sized bake of the original 300 MB model (tools/school/bake_school.py):
 * unique geometry stored once in a quantised binary, a table of where each piece is placed, and
 * texture atlases. Here the pieces are merged by material and area into a few hundred meshes, so
 * the browser can cull what is out of view, and small props are hidden when you are far away.
 */

const BASE = '/school/'
const UNIT = 0.004 // chunk-local positions are stored as int16 in units of 4 mm (+-131 m)
const PROP_DISTANCE = 55
const FAR_DISTANCE = 230
const ROOM_MARGIN = 5 // metres around a building within which its interior props are drawn

interface Prim {
  m: number; n: number; ni: number; i32: number
  p: number; nr: number; u: number; ix: number
  lo: number[]; ex: number[]; ulo: number[]; uex: number[]
}
interface Mat { map: string | null; alpha: 'opaque' | 'mask' | 'blend'; ds: boolean; color: number[] }
interface Manifest { materials: Mat[]; prims: Prim[]; instOff: number; instCount: number; instStride: number; chunk: number; smallR: number }

interface Built { group: THREE.Group; meshes: THREE.Mesh[] }
let building: Promise<Built | null> | null = null

async function fetchBin(): Promise<ArrayBuffer> {
  const r = await fetch(BASE + 'school.bin.gz')
  if (!r.ok) throw new Error('school.bin.gz ' + r.status)
  const raw = await r.arrayBuffer()
  const head = new Uint8Array(raw, 0, 2)
  if (head[0] !== 0x1f || head[1] !== 0x8b) return raw // the server already decompressed it
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot unpack the school model')
  return await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
}

const tick = () => new Promise<void>((res) => setTimeout(res, 0))

async function build(withProps: boolean): Promise<Built | null> {
  const [man, buf] = await Promise.all([
    fetch(BASE + 'school.json').then((r) => r.json() as Promise<Manifest>),
    fetchBin(),
  ])

  // ---- materials -----------------------------------------------------------
  const loader = new THREE.TextureLoader()
  const isTiled = (m: Mat) => !!m.map && m.map.includes('/t_')
  const mats = man.materials.map((m) => {
    const mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color(m.color[0], m.color[1], m.color[2]),
      side: m.ds ? THREE.DoubleSide : THREE.FrontSide,
    })
    if (m.alpha === 'mask') mat.alphaTest = 0.5
    if (m.alpha === 'blend') { mat.transparent = true; mat.opacity = m.color[3]; mat.depthWrite = false }
    if (m.map) {
      loader.load(BASE + m.map, (tex) => {
        tex.flipY = false // UVs follow the glTF convention
        tex.colorSpace = THREE.SRGBColorSpace
        tex.wrapS = tex.wrapT = isTiled(m) ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping
        tex.anisotropy = 4
        mat.map = tex
        mat.needsUpdate = true
      })
    }
    return mat
  })

  // ---- group instances by material, area chunk and size class --------------
  const S = man.instStride
  const inst = new Float32Array(buf, man.instOff, man.instCount * S)
  interface Grp { mat: number; gx: number; gz: number; small: boolean; room: number; items: number[]; nv: number; ni: number }
  const groups = new Map<string, Grp>()
  for (let i = 0; i < man.instCount; i++) {
    const o = i * S
    const pr = man.prims[inst[o]]
    const small = inst[o + 1] < man.smallR
    if (small && !withProps) continue
    const gx = Math.floor(inst[o + 2] / man.chunk)
    const gz = Math.floor(inst[o + 4] / man.chunk)
    // Small props inside a building are only drawn while the player is near that building
    let room = -1
    if (small) {
      const ix = inst[o + 2], iy = inst[o + 3], iz = inst[o + 4]
      room = SCHOOL_BUILDINGS.findIndex((bd) => ix > bd.x0 && ix < bd.x1 && iz > bd.z0 && iz < bd.z1 && iy < bd.top)
    }
    const key = `${pr.m}|${gx}|${gz}|${small ? 1 : 0}|${room}`
    let g = groups.get(key)
    if (!g) groups.set(key, (g = { mat: pr.m, gx, gz, small, room, items: [], nv: 0, ni: 0 }))
    g.items.push(i); g.nv += pr.n; g.ni += pr.ni
  }

  const root = new THREE.Group()
  root.name = 'school'
  const meshes: THREE.Mesh[] = []
  let sinceYield = 0

  for (const g of groups.values()) {
    const tiled = isTiled(man.materials[g.mat])
    const ox = (g.gx + 0.5) * man.chunk
    const oz = (g.gz + 0.5) * man.chunk
    const pos = new Int16Array(g.nv * 3)
    const nrm = new Int8Array(g.nv * 3)
    const uvF = tiled ? new Float32Array(g.nv * 2) : null
    const uvU = tiled ? null : new Uint16Array(g.nv * 2)
    const idx = g.nv < 65536 ? new Uint16Array(g.ni) : new Uint32Array(g.ni) // half the memory for most meshes
    let vo = 0
    let io = 0

    for (const i of g.items) {
      const o = i * S
      const pr = man.prims[inst[o]]
      const a00 = inst[o + 5], a01 = inst[o + 6], a02 = inst[o + 7], tx = inst[o + 8]
      const a10 = inst[o + 9], a11 = inst[o + 10], a12 = inst[o + 11], ty = inst[o + 12]
      const a20 = inst[o + 13], a21 = inst[o + 14], a22 = inst[o + 15], tz = inst[o + 16]
      // cofactor matrix: normals transform by the inverse transpose (same direction as the cofactors)
      const c00 = a11 * a22 - a12 * a21, c01 = a12 * a20 - a10 * a22, c02 = a10 * a21 - a11 * a20
      const c10 = a02 * a21 - a01 * a22, c11 = a00 * a22 - a02 * a20, c12 = a01 * a20 - a00 * a21
      const c20 = a01 * a12 - a02 * a11, c21 = a02 * a10 - a00 * a12, c22 = a00 * a11 - a01 * a10
      const det = a00 * c00 + a01 * c01 + a02 * c02
      const sgn = det < 0 ? -1 : 1

      const q = new Int16Array(buf, pr.p, pr.n * 3)
      const nq = new Int8Array(buf, pr.nr, pr.n * 3)
      const uq = new Uint16Array(buf, pr.u, pr.n * 2)
      const sx = pr.ex[0] / 65535, sy = pr.ex[1] / 65535, sz = pr.ex[2] / 65535
      const ux = pr.uex[0] / 65535, uy = pr.uex[1] / 65535
      for (let v = 0; v < pr.n; v++) {
        const lx = pr.lo[0] + (q[v * 3] + 32768) * sx
        const ly = pr.lo[1] + (q[v * 3 + 1] + 32768) * sy
        const lz = pr.lo[2] + (q[v * 3 + 2] + 32768) * sz
        const wx = a00 * lx + a01 * ly + a02 * lz + tx - ox
        const wy = a10 * lx + a11 * ly + a12 * lz + ty
        const wz = a20 * lx + a21 * ly + a22 * lz + tz - oz
        const k = (vo + v) * 3
        pos[k] = Math.max(-32767, Math.min(32767, Math.round(wx / UNIT)))
        pos[k + 1] = Math.max(-32767, Math.min(32767, Math.round(wy / UNIT)))
        pos[k + 2] = Math.max(-32767, Math.min(32767, Math.round(wz / UNIT)))
        const nx = nq[v * 3], ny = nq[v * 3 + 1], nz = nq[v * 3 + 2]
        let wnx = c00 * nx + c01 * ny + c02 * nz
        let wny = c10 * nx + c11 * ny + c12 * nz
        let wnz = c20 * nx + c21 * ny + c22 * nz
        const len = Math.hypot(wnx, wny, wnz) || 1
        const f = (127 * sgn) / len
        wnx *= f; wny *= f; wnz *= f
        nrm[k] = Math.round(wnx); nrm[k + 1] = Math.round(wny); nrm[k + 2] = Math.round(wnz)
        const u = pr.ulo[0] + uq[v * 2] * ux
        const w = pr.ulo[1] + uq[v * 2 + 1] * uy
        if (uvF) { uvF[(vo + v) * 2] = u; uvF[(vo + v) * 2 + 1] = w }
        else { uvU![(vo + v) * 2] = Math.round(Math.min(1, Math.max(0, u)) * 65535); uvU![(vo + v) * 2 + 1] = Math.round(Math.min(1, Math.max(0, w)) * 65535) }
      }
      const ix = pr.i32 ? new Uint32Array(buf, pr.ix, pr.ni) : new Uint16Array(buf, pr.ix, pr.ni)
      if (det < 0) {
        for (let t = 0; t < pr.ni; t += 3) { idx[io + t] = ix[t] + vo; idx[io + t + 1] = ix[t + 2] + vo; idx[io + t + 2] = ix[t + 1] + vo }
      } else {
        for (let t = 0; t < pr.ni; t++) idx[io + t] = ix[t] + vo
      }
      vo += pr.n
      io += pr.ni
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3, true))
    geo.setAttribute('uv', uvF ? new THREE.BufferAttribute(uvF, 2) : new THREE.BufferAttribute(uvU!, 2, true))
    geo.setIndex(new THREE.BufferAttribute(idx, 1))
    geo.computeBoundingSphere()
    const mesh = new THREE.Mesh(geo, mats[g.mat])
    mesh.position.set(ox, 0, oz)
    mesh.scale.setScalar(UNIT)
    mesh.matrixAutoUpdate = false
    mesh.updateMatrix()
    mesh.receiveShadow = true
    const bs = geo.boundingSphere!
    mesh.userData = { small: g.small, room: g.room, cx: ox + bs.center.x * UNIT, cz: oz + bs.center.z * UNIT, r: bs.radius * UNIT }
    root.add(mesh)
    meshes.push(mesh)
    if (++sinceYield >= 6) { sinceYield = 0; await tick() } // keep the game responsive while it builds
  }
  return { group: root, meshes }
}

export function SchoolModel() {
  const [built, setBuilt] = useState<Built | null>(null)
  const clock = useRef(0)

  useEffect(() => {
    let alive = true
    if (!building) {
      const lowQuality = useSettings.getState().settings.quality === 'low'
      building = build(!lowQuality).catch((e) => {
        console.error('School model failed to load', e)
        building = null
        return null
      })
    }
    building.then((b) => { if (alive && b) setBuilt(b) })
    return () => { alive = false }
  }, [])

  // Hide what is far away: small props first, everything beyond the draw distance
  useFrame((_, dt) => {
    if (!built) return
    clock.current += dt
    if (clock.current < 0.25) return
    clock.current = 0
    const px = runtime.player.x
    const pz = runtime.player.z
    for (const m of built.meshes) {
      const u = m.userData as { small: boolean; room: number; cx: number; cz: number; r: number }
      const d = Math.hypot(u.cx - px, u.cz - pz) - u.r
      let show = d < (u.small ? PROP_DISTANCE : FAR_DISTANCE)
      if (show && u.room >= 0) {
        const bd = SCHOOL_BUILDINGS[u.room]
        show = px > bd.x0 - ROOM_MARGIN && px < bd.x1 + ROOM_MARGIN && pz > bd.z0 - ROOM_MARGIN && pz < bd.z1 + ROOM_MARGIN
      }
      m.visible = show
    }
  })

  return built ? <primitive object={built.group} /> : null
}
