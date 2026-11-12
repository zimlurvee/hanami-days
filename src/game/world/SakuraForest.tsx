import { Component, Suspense, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { getWorld, type TreeDef } from './index'
import { useSettings } from '@/stores/settingsStore'
import { runtime } from '@/game/runtime'

/**
 * Every tree in town is a sakura. Trees near the player use the detailed cherry
 * tree model (credit funguy / Dogiloh68); farther ones use a cheap pink
 * low-poly version, and the two swap as you move so the frame rate stays fine.
 */
const URL = '/models/trees/cherry-tree.glb'
const MODEL_SCALE = 0.5 // the model is ~10 m tall
const NEAR = 55 // metres
const MAX_NEAR = 160
const REFRESH = 4 // re-sort when the player has moved this far

const LEAVES = [0xffb7d1, 0xffc6dc, 0xffa6c6]
const TRUNK_H = 2.6
const CLUMPS = [
  [1.25, -0.35, 0.55, 0.7],
  [-1.2, -0.25, -0.6, 0.65],
  [0.15, 0.85, -0.9, 0.6],
  [-0.5, 0.5, 1.1, 0.55],
]

const m4 = new THREE.Matrix4()
const q = new THREE.Quaternion()
const p = new THREE.Vector3()
const s = new THREE.Vector3()
const up = new THREE.Vector3(0, 1, 0)
const col = new THREE.Color()
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0)

interface Shared { near: Set<number>; version: number; cx: number; cz: number }

function useNear(trees: TreeDef[], shared: React.MutableRefObject<Shared>, onChange: () => void) {
  useFrame(() => {
    const sh = shared.current
    const px = runtime.player.x, pz = runtime.player.z
    if (sh.version > 0 && (px - sh.cx) ** 2 + (pz - sh.cz) ** 2 < REFRESH * REFRESH) return
    sh.cx = px; sh.cz = pz
    const list: { i: number; d: number }[] = []
    for (let i = 0; i < trees.length; i++) {
      const d = (trees[i].x - px) ** 2 + (trees[i].z - pz) ** 2
      if (d < NEAR * NEAR) list.push({ i, d })
    }
    list.sort((a, b) => a.d - b.d)
    sh.near = new Set(list.slice(0, MAX_NEAR).map((e) => e.i))
    sh.version++
    onChange()
  })
}

export function SakuraForest() {
  const trees = useMemo(() => getWorld().trees, [])
  const shared = useRef<Shared>({ near: new Set(), version: 0, cx: 1e9, cz: 1e9 })
  const far = useRef<Array<(n: Set<number>) => void>>([])
  const detail = useRef<Array<(n: Set<number>) => void>>([])
  useNear(trees, shared, () => {
    far.current.forEach((f) => f(shared.current.near))
    detail.current.forEach((f) => f(shared.current.near))
  })
  return (
    <>
      <FarTrees trees={trees} reg={far} />
      <Boundary>
        <Suspense fallback={null}>
          <NearTrees trees={trees} reg={detail} />
        </Suspense>
      </Boundary>
    </>
  )
}

function FarTrees({ trees, reg }: { trees: TreeDef[]; reg: React.MutableRefObject<Array<(n: Set<number>) => void>> }) {
  const trunk = useRef<THREE.InstancedMesh>(null)
  const crown = useRef<THREE.InstancedMesh>(null)
  const clumps = useRef<(THREE.InstancedMesh | null)[]>([])
  const shadows = useSettings((st) => st.settings.shadows)
  const crownGeo = useMemo(() => new THREE.IcosahedronGeometry(1.9, 1), [])

  useLayoutEffect(() => {
    const apply = (near: Set<number>) => {
      if (!trunk.current || !crown.current) return
      trees.forEach((t, i) => {
        const hide = near.has(i)
        const sc = t.scale
        s.set(sc, sc, sc)
        if (hide) {
          trunk.current!.setMatrixAt(i, ZERO)
          crown.current!.setMatrixAt(i, ZERO)
        } else {
          p.set(t.x, (TRUNK_H * sc) / 2, t.z)
          m4.compose(p, q.identity(), s)
          trunk.current!.setMatrixAt(i, m4)
          p.set(t.x, TRUNK_H * sc + 1.1 * sc, t.z)
          m4.compose(p, q, s)
          crown.current!.setMatrixAt(i, m4)
        }
        crown.current!.setColorAt(i, col.setHex(LEAVES[i % LEAVES.length]))
      })
      CLUMPS.forEach(([ox, oy, oz, os], ci) => {
        const mesh = clumps.current[ci]
        if (!mesh) return
        trees.forEach((t, i) => {
          if (near.has(i)) { mesh.setMatrixAt(i, ZERO); return }
          const sc = t.scale
          p.set(t.x + ox * sc, TRUNK_H * sc + (1.1 + oy) * sc, t.z + oz * sc)
          s.set(sc * os, sc * os, sc * os)
          m4.compose(p, q, s)
          mesh.setMatrixAt(i, m4)
          mesh.setColorAt(i, col.setHex(LEAVES[(i + ci + 1) % LEAVES.length]))
        })
        mesh.instanceMatrix.needsUpdate = true
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
        mesh.computeBoundingSphere()
      })
      for (const m of [trunk.current, crown.current]) {
        m.instanceMatrix.needsUpdate = true
        m.computeBoundingSphere()
      }
      if (crown.current.instanceColor) crown.current.instanceColor.needsUpdate = true
    }
    apply(new Set())
    reg.current.push(apply)
    return () => { reg.current = reg.current.filter((f) => f !== apply) }
  }, [trees, reg])

  if (trees.length === 0) return null
  return (
    <>
      <instancedMesh ref={trunk} args={[undefined, undefined, trees.length]} castShadow={shadows}>
        <cylinderGeometry args={[0.2, 0.3, TRUNK_H, 7]} />
        <meshStandardMaterial color={0x7a5a45} roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crown} args={[crownGeo, undefined, trees.length]} castShadow={shadows}>
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      {CLUMPS.map((_, ci) => (
        <instancedMesh key={ci} ref={(m) => { clumps.current[ci] = m }} args={[crownGeo, undefined, trees.length]} castShadow={shadows}>
          <meshStandardMaterial roughness={0.9} flatShading />
        </instancedMesh>
      ))}
    </>
  )
}

function NearTrees({ trees, reg }: { trees: TreeDef[]; reg: React.MutableRefObject<Array<(n: Set<number>) => void>> }) {
  const { scene } = useGLTF(URL)
  const shadows = useSettings((st) => st.settings.shadows)
  // Only the tree itself: the file also holds colliders, a petal particle plane and an audio node
  const parts = useMemo(() => {
    const found = new Set<THREE.Mesh>()
    scene.traverse((o) => {
      if (o.name.startsWith('NewBigTree')) o.traverse((c) => { if ((c as THREE.Mesh).isMesh) found.add(c as THREE.Mesh) })
    })
    return [...found].map((mesh) => {
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone()
      mat.alphaTest = 0.5 // blossom cards are cut out by the texture alpha
      mat.transparent = false
      mat.side = THREE.DoubleSide
      mat.roughness = 1
      mat.metalness = 0
      return { geometry: mesh.geometry, material: mat }
    })
  }, [scene])
  return (
    <>
      {parts.map((part, i) => (
        <NearPart key={i} part={part} trees={trees} reg={reg} shadows={shadows} />
      ))}
    </>
  )
}

function NearPart({ part, trees, reg, shadows }: {
  part: { geometry: THREE.BufferGeometry; material: THREE.Material }
  trees: TreeDef[]
  reg: React.MutableRefObject<Array<(n: Set<number>) => void>>
  shadows: boolean
}) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const apply = (near: Set<number>) => {
      const mesh = ref.current
      if (!mesh) return
      let k = 0
      near.forEach((i) => {
        const t = trees[i]
        const sc = t.scale * MODEL_SCALE
        p.set(t.x, 0, t.z)
        q.setFromAxisAngle(up, (i * 2.399) % (Math.PI * 2)) // golden-angle spin so no two look alike
        s.set(sc, sc, sc)
        m4.compose(p, q, s)
        mesh.setMatrixAt(k++, m4)
      })
      mesh.count = k
      mesh.instanceMatrix.needsUpdate = true
      mesh.computeBoundingSphere()
    }
    reg.current.push(apply)
    return () => { reg.current = reg.current.filter((f) => f !== apply) }
  }, [trees, reg])
  return <instancedMesh ref={ref} args={[part.geometry, part.material, MAX_NEAR]} count={0} castShadow={shadows} receiveShadow={shadows} frustumCulled={false} />
}

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err: unknown) { console.error('Cherry tree model failed to load; the pink low-poly trees stay.', err) }
  render() { return this.state.failed ? null : this.props.children }
}
