import { Component, Suspense, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { getWorld } from './index'
import { useSettings } from '@/stores/settingsStore'

const URL = '/models/trees/cherry-tree.glb'
/** The model is about 10 m tall; this brings it to a school-yard tree. */
const MODEL_SCALE = 0.5

const m4 = new THREE.Matrix4()
const q = new THREE.Quaternion()
const p = new THREE.Vector3()
const s = new THREE.Vector3()
const up = new THREE.Vector3(0, 1, 0)

/** Draws every 'cherry' tree with the detailed model, one instanced draw per mesh part. */
function Cherries() {
  const { scene } = useGLTF(URL)
  const shadows = useSettings((st) => st.settings.shadows)
  const trees = useMemo(() => getWorld().trees.filter((t) => t.kind === 'cherry'), [])

  // Only the tree itself: the file also holds colliders, a petal particle plane and an audio node
  const parts = useMemo(() => {
    const found = new Set<THREE.Mesh>()
    scene.traverse((o) => {
      if (o.name.startsWith('NewBigTree')) o.traverse((c) => { if ((c as THREE.Mesh).isMesh) found.add(c as THREE.Mesh) })
    })
    return [...found].map((mesh) => {
      // The blossom cards are cut out by the texture's alpha channel
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone()
      mat.alphaTest = 0.5
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
        <Part key={i} part={part} trees={trees} shadows={shadows} />
      ))}
    </>
  )
}

function Part({ part, trees, shadows }: { part: { geometry: THREE.BufferGeometry; material: THREE.Material }; trees: ReturnType<typeof getWorld>['trees']; shadows: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    trees.forEach((t, i) => {
      const sc = t.scale * MODEL_SCALE
      p.set(t.x, 0, t.z)
      q.setFromAxisAngle(up, (i * 2.399) % (Math.PI * 2)) // golden-angle spin so no two look alike
      s.set(sc, sc, sc)
      m4.compose(p, q, s)
      mesh.setMatrixAt(i, m4)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [trees])
  if (trees.length === 0) return null
  return <instancedMesh ref={ref} args={[part.geometry, part.material, trees.length]} castShadow={shadows} receiveShadow={shadows} />
}

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(err: unknown) { console.error('Cherry tree model failed to load; those spots stay empty.', err) }
  render() { return this.state.failed ? null : this.props.children }
}

export function CherryTrees() {
  return (
    <Boundary>
      <Suspense fallback={null}>
        <Cherries />
      </Suspense>
    </Boundary>
  )
}
