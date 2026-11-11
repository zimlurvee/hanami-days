import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getWorld, type TreeDef } from './index'
import { useSettings } from '@/stores/settingsStore'

/** Extra blossom clumps on sakura trees: x, y, z offset and scale, so each tree is a fuller cloud. */
const SAKURA_CLUMPS = [
  [1.25, -0.35, 0.55, 0.7],
  [-1.2, -0.25, -0.6, 0.65],
  [0.15, 0.85, -0.9, 0.6],
  [-0.5, 0.5, 1.1, 0.55],
]

const KINDS: { kind: TreeDef['kind']; leaves: number[]; trunk: number; trunkH: number }[] = [
  { kind: 'sakura', leaves: [0xffb7d1, 0xffc6dc, 0xffa6c6], trunk: 0x7a5a45, trunkH: 2.6 },
  { kind: 'round', leaves: [0x66c466, 0x7ed56f, 0x58b75c], trunk: 0x8a6446, trunkH: 2.4 },
  { kind: 'pine', leaves: [0x3f9d6a, 0x358f5f], trunk: 0x6f523d, trunkH: 2.0 },
]

/** All trees as instanced trunks + canopies, one pair of draw calls per tree kind. */
export function Trees() {
  const trees = getWorld().trees
  return (
    <>
      {KINDS.map((k) => (
        <TreeKind key={k.kind} spec={k} trees={trees.filter((t) => t.kind === k.kind)} />
      ))}
    </>
  )
}

const m4 = new THREE.Matrix4()
const q = new THREE.Quaternion()
const p = new THREE.Vector3()
const s = new THREE.Vector3()
const col = new THREE.Color()

function TreeKind({ spec, trees }: { spec: (typeof KINDS)[number]; trees: TreeDef[] }) {
  const trunk = useRef<THREE.InstancedMesh>(null)
  const crown = useRef<THREE.InstancedMesh>(null)
  const clumps = useRef<(THREE.InstancedMesh | null)[]>([])
  const shadows = useSettings((st) => st.settings.shadows)
  const count = trees.length
  const isPine = spec.kind === 'pine'

  const crownGeo = useMemo(
    () => (isPine ? new THREE.ConeGeometry(1.5, 4.2, 8) : new THREE.IcosahedronGeometry(1.9, 1)),
    [isPine],
  )

  useLayoutEffect(() => {
    if (!trunk.current || !crown.current) return
    trees.forEach((t, i) => {
      const sc = t.scale
      p.set(t.x, (spec.trunkH * sc) / 2, t.z)
      s.set(sc, sc, sc)
      m4.compose(p, q, s)
      trunk.current!.setMatrixAt(i, m4)

      const crownY = isPine ? spec.trunkH * sc + 1.6 * sc : spec.trunkH * sc + 1.1 * sc
      p.set(t.x, crownY, t.z)
      m4.compose(p, q, s)
      crown.current!.setMatrixAt(i, m4)
      crown.current!.setColorAt(i, col.setHex(spec.leaves[i % spec.leaves.length]))
    })
    if (spec.kind === 'sakura') {
      SAKURA_CLUMPS.forEach(([ox, oy, oz, os], ci) => {
        const mesh = clumps.current[ci]
        if (!mesh) return
        trees.forEach((t, i) => {
          const sc = t.scale
          p.set(t.x + ox * sc, spec.trunkH * sc + (1.1 + oy) * sc, t.z + oz * sc)
          s.set(sc * os, sc * os, sc * os)
          m4.compose(p, q, s)
          mesh.setMatrixAt(i, m4)
          mesh.setColorAt(i, col.setHex(spec.leaves[(i + ci + 1) % spec.leaves.length]))
        })
        mesh.instanceMatrix.needsUpdate = true
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
        mesh.computeBoundingSphere()
      })
    }
    for (const m of [trunk.current, crown.current]) {
      m.instanceMatrix.needsUpdate = true
      m.computeBoundingSphere()
    }
    if (crown.current.instanceColor) crown.current.instanceColor.needsUpdate = true
  }, [trees, spec, isPine])

  if (count === 0) return null
  return (
    <>
      <instancedMesh ref={trunk} args={[undefined, undefined, count]} castShadow={shadows}>
        <cylinderGeometry args={[0.2, 0.3, spec.trunkH, 7]} />
        <meshStandardMaterial color={spec.trunk} roughness={1} />
      </instancedMesh>
      <instancedMesh ref={crown} args={[crownGeo, undefined, count]} castShadow={shadows}>
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
      {spec.kind === 'sakura' &&
        SAKURA_CLUMPS.map((_, ci) => (
          <instancedMesh key={ci} ref={(m) => { clumps.current[ci] = m }} args={[crownGeo, undefined, count]} castShadow={shadows}>
            <meshStandardMaterial roughness={0.9} flatShading />
          </instancedMesh>
        ))}
    </>
  )
}
