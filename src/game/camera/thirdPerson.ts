import * as THREE from 'three'
import type { RapierRigidBody, useRapier } from '@react-three/rapier'
import { runtime } from '@/game/runtime'
import { useSettings } from '@/stores/settingsStore'

type RapierCtx = ReturnType<typeof useRapier>

const target = new THREE.Vector3()
const wanted = new THREE.Vector3()
let currentDist = 6

/** Orbit camera behind the player that pulls in when geometry is in the way. */
export function updateThirdPersonCamera(
  camera: THREE.Camera,
  ctx: RapierCtx,
  body: RapierRigidBody,
  feet: { x: number; y: number; z: number },
  dt: number,
) {
  const { yaw, pitch, zoom } = runtime.cam
  const base = useSettings.getState().settings.cameraDistance
  const maxDist = base * zoom

  target.set(feet.x, feet.y + 1.55, feet.z)
  const cp = Math.cos(pitch)
  wanted.set(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp)

  let allowed = maxDist
  const ray = new ctx.rapier.Ray({ x: target.x, y: target.y, z: target.z }, { x: wanted.x, y: wanted.y, z: wanted.z })
  const hit = ctx.world.castRay(ray, maxDist + 0.3, true, undefined, undefined, undefined, body)
  if (hit) {
    // rapier 0.14 calls it timeOfImpact, older builds called it toi
    const h = hit as unknown as { timeOfImpact?: number; toi?: number }
    const toi = h.timeOfImpact ?? h.toi ?? maxDist
    allowed = Math.max(0.5, Math.min(maxDist, toi - 0.3))
  }

  // Snap inwards quickly when blocked, ease back out slowly
  const k = allowed < currentDist ? 1 - Math.exp(-30 * dt) : 1 - Math.exp(-4 * dt)
  currentDist += (allowed - currentDist) * k

  camera.position.set(
    target.x + wanted.x * currentDist,
    target.y + wanted.y * currentDist,
    target.z + wanted.z * currentDist,
  )
  camera.lookAt(target)
}
