import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, useRapier, type RapierCollider, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import type { AvatarAnim } from './Avatar'
import { CharacterModel } from './CharacterModel'
import { isDown, consumeJump } from '@/game/input/input'
import { updateThirdPersonCamera } from '@/game/camera/thirdPerson'
import { runtime } from '@/game/runtime'
import { PLAYER_SPAWN, locationAt } from '@/game/world'
import { useApp, isGameActive } from '@/stores/appStore'

const WALK = 3.4
const RUN = 6.6
const JUMP = 7.6
const GRAVITY = 22
const HALF = 0.55 // capsule cylinder half-height
const RADIUS = 0.3
const CENTRE = HALF + RADIUS // body origin height above the feet

/**
 * Local player: a kinematic capsule moved with Rapier's character controller
 * (slides along walls, auto-steps stairs, snaps to the ground), plus the visual
 * Avatar and the camera update. All per-frame state lives in refs, not React state.
 */
export function PlayerController() {
  const ctx = useRapier()
  const { world } = ctx
  const body = useRef<RapierRigidBody>(null)
  const collider = useRef<RapierCollider>(null)
  const avatar = useRef<THREE.Group>(null)

  const anim = useMemo<AvatarAnim>(() => ({ speed: 0, grounded: true, vy: 0 }), [])
  const sim = useRef({
    pos: new THREE.Vector3(PLAYER_SPAWN.x, PLAYER_SPAWN.y + CENTRE, PLAYER_SPAWN.z),
    vx: 0,
    vz: 0,
    vy: 0,
    facing: 0,
    grounded: false,
    coyote: 0,
    locTimer: 0,
  })

  // Created in an effect (not useMemo) so React StrictMode's mount/unmount/mount
  // cycle never leaves us holding a controller that cleanup already freed.
  const kccRef = useRef<ReturnType<typeof world.createCharacterController> | null>(null)
  useEffect(() => {
    const c = world.createCharacterController(0.02)
    c.setUp({ x: 0, y: 1, z: 0 })
    c.enableAutostep(0.38, 0.12, false)
    c.enableSnapToGround(0.3)
    c.setMaxSlopeClimbAngle((50 * Math.PI) / 180)
    c.setMinSlopeSlideAngle((60 * Math.PI) / 180)
    c.setSlideEnabled(true)
    c.setApplyImpulsesToDynamicBodies(false)
    kccRef.current = c
    return () => {
      kccRef.current = null
      // Leaving the game frees the whole physics world first; do not touch it then.
      if (!isGameActive()) return
      try {
        world.removeCharacterController(c)
      } catch {
        /* world already gone */
      }
    }
  }, [world])

  // Face away from the school building toward the road at spawn
  useEffect(() => {
    runtime.cam.yaw = 0
  }, [])

  useFrame((state, rawDt) => {
    const b = body.current
    const col = collider.current
    const kcc = kccRef.current
    if (!b || !col || !kcc) return
    const dt = Math.min(rawDt, 1 / 20)
    const s = sim.current
    const paused = useApp.getState().paused

    if (!paused) {
      // ---- Input relative to the camera ----------------------------------
      const yaw = runtime.cam.yaw
      const fwd = (isDown('forward') ? 1 : 0) - (isDown('back') ? 1 : 0)
      const side = (isDown('right') ? 1 : 0) - (isDown('left') ? 1 : 0)
      let dx = -Math.sin(yaw) * fwd + Math.cos(yaw) * side
      let dz = -Math.cos(yaw) * fwd - Math.sin(yaw) * side
      const len = Math.hypot(dx, dz)
      if (len > 0) {
        dx /= len
        dz /= len
      }
      const topSpeed = len > 0 ? (isDown('run') ? RUN : WALK) : 0

      // Smooth acceleration (snappier on the ground, floatier in the air)
      const k = 1 - Math.exp(-(s.grounded ? 14 : 3.5) * dt)
      s.vx += (dx * topSpeed - s.vx) * k
      s.vz += (dz * topSpeed - s.vz) * k

      // ---- Jump / gravity -------------------------------------------------
      s.coyote = s.grounded ? 0.12 : Math.max(0, s.coyote - dt)
      if (consumeJump() && s.coyote > 0) {
        s.vy = JUMP
        s.coyote = 0
        s.grounded = false
      }
      s.vy = Math.max(-40, s.vy - GRAVITY * dt)

      // Snapping must be off while rising or it would glue us to the floor
      if (s.vy > 0) kcc.disableSnapToGround()
      else kcc.enableSnapToGround(0.3)

      // ---- Move through the world ----------------------------------------
      const desired = { x: s.vx * dt, y: s.vy * dt, z: s.vz * dt }
      kcc.computeColliderMovement(col, desired)
      const m = kcc.computedMovement()
      s.pos.x += m.x
      s.pos.y += m.y
      s.pos.z += m.z
      s.grounded = kcc.computedGrounded()
      if (s.grounded && s.vy < 0) s.vy = 0
      if (s.vy > 0 && m.y < desired.y - 0.002) s.vy = 0 // bumped a ceiling

      // Fell out of the world? Respawn at the school gate.
      if (s.pos.y < -25) {
        s.pos.set(PLAYER_SPAWN.x, PLAYER_SPAWN.y + CENTRE, PLAYER_SPAWN.z)
        s.vx = s.vy = s.vz = 0
      }
      b.setTranslation({ x: s.pos.x, y: s.pos.y, z: s.pos.z }, true)

      // ---- Facing ---------------------------------------------------------
      const sp = Math.hypot(s.vx, s.vz)
      if (sp > 0.3) {
        const target = Math.atan2(s.vx, s.vz)
        let diff = target - s.facing
        diff = Math.atan2(Math.sin(diff), Math.cos(diff))
        s.facing += diff * (1 - Math.exp(-14 * dt))
      }

      anim.speed = sp
      anim.grounded = s.grounded
      anim.vy = s.vy

      // ---- Share state with HUD / minimap --------------------------------
      const p = runtime.player
      p.x = s.pos.x
      p.y = s.pos.y - CENTRE
      p.z = s.pos.z
      p.yaw = s.facing
      p.speed = sp
      p.grounded = s.grounded
      s.locTimer += dt
      if (s.locTimer > 0.3) {
        s.locTimer = 0
        runtime.locationName = locationAt(p.x, p.y, p.z)
      }
    }

    if (avatar.current) {
      avatar.current.position.set(s.pos.x, s.pos.y - CENTRE, s.pos.z)
      avatar.current.rotation.y = s.facing
    }
    updateThirdPersonCamera(state.camera, ctx, b, { x: s.pos.x, y: s.pos.y - CENTRE, z: s.pos.z }, dt)
  })

  return (
    <>
      <RigidBody
        ref={body}
        type="kinematicPosition"
        colliders={false}
        position={[PLAYER_SPAWN.x, PLAYER_SPAWN.y + CENTRE, PLAYER_SPAWN.z]}
      >
        <CapsuleCollider ref={collider} args={[HALF, RADIUS]} />
      </RigidBody>
      <group ref={avatar}>
        <CharacterModel anim={anim} />
      </group>
    </>
  )
}
