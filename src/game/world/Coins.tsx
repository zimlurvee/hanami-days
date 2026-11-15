import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { AREAS } from './areas'
import { runtime } from '../runtime'
import { useMissions } from '@/stores/missionsStore'

const VALUE = 50
const RESPAWN = 240 // seconds
const PICK_R = 1.4
const OFFS: [number, number][] = [[2, 0], [-2, 0], [0, 2]]

/** Spinning coins next to every Area Move spot (those spots are known to be free floor). Local only, respawn after 4 min. */
export function Coins() {
  const coins = useMemo(() => AREAS.flatMap((a) => OFFS.map(([dx, dz], i) => ({ id: `${a.id}${i}`, x: a.x + dx, y: a.y + 0.9, z: a.z + dz }))), [])
  const refs = useRef<(Group | null)[]>([])
  const back = useRef<number[]>(coins.map(() => 0))
  useFrame((s) => {
    const t = s.clock.elapsedTime
    const p = runtime.player
    coins.forEach((c, i) => {
      const g = refs.current[i]
      if (!g) return
      const on = back.current[i] <= t
      if (g.visible !== on) g.visible = on
      if (!on) return
      g.rotation.y = t * 2 + i
      g.position.y = c.y + Math.sin(t * 2 + i) * 0.08
      const dx = p.x - c.x, dz = p.z - c.z
      if (dx * dx + dz * dz < PICK_R * PICK_R && Math.abs(p.y + 0.9 - c.y) < 1.6) {
        back.current[i] = t + RESPAWN
        useMissions.getState().earn(VALUE)
      }
    })
  })
  return (
    <>
      {coins.map((c, i) => (
        <group key={c.id} ref={(g) => { refs.current[i] = g }} position={[c.x, c.y, c.z]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.28, 0.28, 0.05, 20]} />
            <meshStandardMaterial color="#ffc93c" emissive="#c98a00" emissiveIntensity={0.5} metalness={0.6} roughness={0.35} />
          </mesh>
        </group>
      ))}
    </>
  )
}
