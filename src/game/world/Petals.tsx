import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { runtime } from '@/game/runtime'
import { useWorld } from '@/stores/worldStore'

const N = 140
const R = 22 // petals live in a box this wide around the player

/** Cherry petals drifting down around the player (hidden in rain). */
export function Petals() {
  const ref = useRef<THREE.Points>(null)
  const data = useMemo(() => {
    const pos = new Float32Array(N * 3)
    const seed = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 2 * R
      pos[i * 3 + 1] = Math.random() * 9
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2 * R
      seed[i] = Math.random() * 6.28
    }
    return { pos, seed }
  }, [])

  useFrame((state, dt) => {
    const pts = ref.current
    if (!pts) return
    const rainy = useWorld.getState().weather === 'rainy'
    pts.visible = !rainy
    if (rainy) return
    const t = state.clock.elapsedTime
    const px = runtime.player.x, pz = runtime.player.z
    const a = data.pos
    for (let i = 0; i < N; i++) {
      a[i * 3 + 1] -= dt * (0.5 + (i % 5) * 0.08)
      a[i * 3] += Math.sin(t * 0.7 + data.seed[i]) * dt * 0.6 + dt * 0.35
      a[i * 3 + 2] += Math.cos(t * 0.5 + data.seed[i]) * dt * 0.4
      if (a[i * 3 + 1] < 0) a[i * 3 + 1] = 9
      // Keep them near the player by wrapping around
      if (a[i * 3] - px > R) a[i * 3] -= 2 * R
      if (a[i * 3] - px < -R) a[i * 3] += 2 * R
      if (a[i * 3 + 2] - pz > R) a[i * 3 + 2] -= 2 * R
      if (a[i * 3 + 2] - pz < -R) a[i * 3 + 2] += 2 * R
    }
    const attr = pts.geometry.getAttribute('position') as THREE.BufferAttribute
    attr.needsUpdate = true
  })

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={data.pos} count={N} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#ffc4d8" size={0.16} sizeAttenuation transparent opacity={0.9} depthWrite={false} />
    </points>
  )
}
