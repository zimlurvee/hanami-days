import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Appearance } from './appearance'

/** Animation inputs. Mutated by the controller every frame (no React state). */
export interface AvatarAnim {
  /** Horizontal speed in m/s. */
  speed: number
  grounded: boolean
  /** Vertical velocity, used to pose arms/legs in the air. */
  vy: number
  /** Overrides the local player's size setting (used for other players). */
  size?: number
}

interface Props {
  appearance: Appearance
  anim: AvatarAnim
}

const mat = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 })

/**
 * Stylised procedural character, about 1.7m tall, origin at the feet, facing +Z.
 * Limbs swing from hip and shoulder pivots driven by `anim`.
 */
export function Avatar({ appearance: a, anim }: Props) {
  const legL = useRef<THREE.Group>(null)
  const legR = useRef<THREE.Group>(null)
  const armL = useRef<THREE.Group>(null)
  const armR = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const phase = useRef(0)

  const m = useMemo(
    () => ({
      skin: mat(a.skin),
      hair: mat(a.hair),
      eye: mat(a.eye),
      top: mat(a.top),
      bottom: mat(a.bottom),
      shoes: mat(a.shoes),
      white: mat(0xffffff),
    }),
    [a.skin, a.hair, a.eye, a.top, a.bottom, a.shoes],
  )

  useFrame((_, dt) => {
    const moving = anim.speed > 0.15
    const rate = anim.speed > 4.5 ? 12 : 8
    if (moving && anim.grounded) phase.current += dt * rate
    else phase.current *= 0.85
    const amp = anim.grounded ? Math.min(1, anim.speed / 3.2) * (anim.speed > 4.5 ? 0.95 : 0.6) : 0
    const s = Math.sin(phase.current) * amp
    const lerp = THREE.MathUtils.lerp
    const set = (g: THREE.Group | null, x: number, z = 0) => {
      if (!g) return
      g.rotation.x = lerp(g.rotation.x, x, 0.35)
      g.rotation.z = lerp(g.rotation.z, z, 0.35)
    }
    if (anim.grounded) {
      set(legL.current, s)
      set(legR.current, -s)
      set(armL.current, -s * 0.9)
      set(armR.current, s * 0.9)
    } else {
      // Jump pose: one knee up, arms out
      set(legL.current, anim.vy > 0 ? -0.6 : 0.2)
      set(legR.current, anim.vy > 0 ? 0.3 : -0.2)
      set(armL.current, -2.4, 0.5)
      set(armR.current, -2.4, -0.5)
    }
    if (body.current) {
      // Idle breathing, running lean and a small bob
      const bob = moving && anim.grounded ? Math.abs(Math.sin(phase.current)) * 0.04 : 0
      const breathe = !moving ? Math.sin(performance.now() / 600) * 0.008 : 0
      body.current.position.y = lerp(body.current.position.y, bob + breathe, 0.4)
      const lean = anim.speed > 4.5 && anim.grounded ? 0.18 : 0
      body.current.rotation.x = lerp(body.current.rotation.x, lean, 0.2)
    }
  })

  return (
    <group ref={body}>
      {/* Legs */}
      <group ref={legL} position={[-0.11, 0.82, 0]}>
        {!a.skirt && (
          <mesh position={[0, -0.4, 0]} material={m.bottom} castShadow>
            <boxGeometry args={[0.17, 0.62, 0.19]} />
          </mesh>
        )}
        {a.skirt && (
          <mesh position={[0, -0.4, 0]} material={m.skin} castShadow>
            <boxGeometry args={[0.14, 0.62, 0.15]} />
          </mesh>
        )}
        <mesh position={[0, -0.74, 0.03]} material={m.shoes} castShadow>
          <boxGeometry args={[0.18, 0.12, 0.28]} />
        </mesh>
      </group>
      <group ref={legR} position={[0.11, 0.82, 0]}>
        {!a.skirt && (
          <mesh position={[0, -0.4, 0]} material={m.bottom} castShadow>
            <boxGeometry args={[0.17, 0.62, 0.19]} />
          </mesh>
        )}
        {a.skirt && (
          <mesh position={[0, -0.4, 0]} material={m.skin} castShadow>
            <boxGeometry args={[0.14, 0.62, 0.15]} />
          </mesh>
        )}
        <mesh position={[0, -0.74, 0.03]} material={m.shoes} castShadow>
          <boxGeometry args={[0.18, 0.12, 0.28]} />
        </mesh>
      </group>

      {/* Skirt */}
      {a.skirt && (
        <mesh position={[0, 0.78, 0]} material={m.bottom} castShadow>
          <cylinderGeometry args={[0.2, 0.3, 0.28, 12]} />
        </mesh>
      )}

      {/* Torso */}
      <mesh position={[0, 1.1, 0]} material={m.top} castShadow>
        <boxGeometry args={[0.42, 0.55, 0.24]} />
      </mesh>
      {/* Collar */}
      <mesh position={[0, 1.36, 0.01]} material={m.white}>
        <boxGeometry args={[0.2, 0.06, 0.2]} />
      </mesh>

      {/* Arms */}
      <group ref={armL} position={[-0.29, 1.33, 0]}>
        <mesh position={[0, -0.24, 0]} material={m.top} castShadow>
          <boxGeometry args={[0.12, 0.3, 0.14]} />
        </mesh>
        <mesh position={[0, -0.5, 0]} material={m.skin} castShadow>
          <boxGeometry args={[0.1, 0.24, 0.12]} />
        </mesh>
      </group>
      <group ref={armR} position={[0.29, 1.33, 0]}>
        <mesh position={[0, -0.24, 0]} material={m.top} castShadow>
          <boxGeometry args={[0.12, 0.3, 0.14]} />
        </mesh>
        <mesh position={[0, -0.5, 0]} material={m.skin} castShadow>
          <boxGeometry args={[0.1, 0.24, 0.12]} />
        </mesh>
      </group>

      {/* Head */}
      <group position={[0, 1.62, 0]}>
        <mesh material={m.skin} castShadow>
          <sphereGeometry args={[0.24, 20, 16]} />
        </mesh>
        {/* Eyes */}
        <mesh position={[-0.09, 0.0, 0.2]} material={m.eye}>
          <sphereGeometry args={[0.035, 10, 8]} />
        </mesh>
        <mesh position={[0.09, 0.0, 0.2]} material={m.eye}>
          <sphereGeometry args={[0.035, 10, 8]} />
        </mesh>
        <Hair a={a} hairMat={m.hair} />
      </group>
    </group>
  )
}

function Hair({ a, hairMat }: { a: Appearance; hairMat: THREE.Material }) {
  return (
    <group>
      {/* Cap */}
      <mesh position={[0, 0.04, -0.02]} material={hairMat} castShadow>
        <sphereGeometry args={[0.265, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
      </mesh>
      {/* Fringe */}
      <mesh position={[0, 0.13, 0.15]} material={hairMat}>
        <boxGeometry args={[0.38, 0.1, 0.1]} />
      </mesh>
      {a.hairStyle === 'long' && (
        <mesh position={[0, -0.2, -0.13]} material={hairMat} castShadow>
          <boxGeometry args={[0.44, 0.6, 0.12]} />
        </mesh>
      )}
      {a.hairStyle === 'twin' && (
        <>
          <mesh position={[-0.27, -0.18, -0.02]} material={hairMat} castShadow>
            <capsuleGeometry args={[0.07, 0.4, 4, 8]} />
          </mesh>
          <mesh position={[0.27, -0.18, -0.02]} material={hairMat} castShadow>
            <capsuleGeometry args={[0.07, 0.4, 4, 8]} />
          </mesh>
        </>
      )}
      {a.hairStyle === 'bun' && (
        <mesh position={[0, 0.3, -0.06]} material={hairMat} castShadow>
          <sphereGeometry args={[0.12, 12, 10]} />
        </mesh>
      )}
    </group>
  )
}
