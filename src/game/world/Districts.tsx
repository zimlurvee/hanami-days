import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { getWorld, type ModelDef } from './index'

/** 'suburban/building-type-a' -> '/models/kenney-suburban/building-type-a.glb' */
const urlFor = (key: string) => {
  const [kit, name] = key.split('/')
  return `/models/kenney-${kit}/${name}.glb`
}

function Placed({ m }: { m: ModelDef }) {
  const { scene } = useGLTF(urlFor(m.key))
  // Clone so the same GLB can appear many times; geometry and materials stay shared.
  const obj = useMemo(() => {
    const c = scene.clone(true)
    c.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    return c
  }, [scene])
  return <primitive object={obj} position={[m.x, 0, m.z]} rotation={[0, m.yaw, 0]} scale={m.scale} />
}

/** All Kenney GLB buildings. Colliders come from the world data, not from here. */
export function Districts() {
  const models = getWorld().models
  return (
    <>
      {models.map((m, i) => (
        <Placed key={i} m={m} />
      ))}
    </>
  )
}
