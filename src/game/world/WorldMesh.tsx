import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getWorld, type BoxDef } from './index'
import { useSettings } from '@/stores/settingsStore'

const CHUNK = 50

/**
 * Draws every box in the world as instanced meshes, grouped into 50m chunks so
 * the GPU can frustum-cull whole chunks instead of one giant instance buffer.
 */
export function WorldMesh() {
  const chunks = useMemo(() => {
    const map = new Map<string, BoxDef[]>()
    for (const bx of getWorld().boxes) {
      const key = `${Math.floor(bx.x / CHUNK)}_${Math.floor(bx.z / CHUNK)}`
      let arr = map.get(key)
      if (!arr) map.set(key, (arr = []))
      arr.push(bx)
    }
    return [...map.values()]
  }, [])

  return (
    <group>
      {chunks.map((boxes, i) => (
        <Chunk key={i} boxes={boxes} />
      ))}
    </group>
  )
}

const tmpM = new THREE.Matrix4()
const tmpQ = new THREE.Quaternion()
const tmpP = new THREE.Vector3()
const tmpS = new THREE.Vector3()
const tmpC = new THREE.Color()

function Chunk({ boxes }: { boxes: BoxDef[] }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const shadows = useSettings((s) => s.settings.shadows)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    boxes.forEach((bx, i) => {
      tmpP.set(bx.x, bx.y + bx.h / 2, bx.z)
      tmpS.set(bx.w, bx.h, bx.d)
      tmpM.compose(tmpP, tmpQ, tmpS)
      mesh.setMatrixAt(i, tmpM)
      mesh.setColorAt(i, tmpC.setHex(bx.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
    mesh.computeBoundingBox()
  }, [boxes])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, boxes.length]} castShadow={shadows} receiveShadow={shadows} frustumCulled>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.9} metalness={0} />
    </instancedMesh>
  )
}
