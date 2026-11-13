import { useEffect } from 'react'
import { useRapier } from '@react-three/rapier'
import { getWorld, WORLD_HALF } from './index'
import { isGameActive } from '@/stores/appStore'

/**
 * Adds one fixed cuboid collider per solid box in the world, plus trunk
 * colliders for trees and an outer boundary. Colliders are created straight on
 * the Rapier world (one fixed body) which is far cheaper than thousands of
 * React collider components.
 */
export function WorldColliders() {
  const { world, rapier } = useRapier()

  useEffect(() => {
    const body = world.createRigidBody(rapier.RigidBodyDesc.fixed())
    const w = getWorld()

    for (const b of w.boxes) {
      if (!b.collide) continue
      world.createCollider(
        rapier.ColliderDesc.cuboid(b.w / 2, b.h / 2, b.d / 2).setTranslation(b.x, b.y + b.h / 2, b.z),
        body,
      )
    }

    for (const t of w.trees) {
      const r = 0.28 * t.scale
      world.createCollider(rapier.ColliderDesc.cuboid(r, 1.5, r).setTranslation(t.x, 1.5, t.z), body)
    }

    // The school: oriented boxes plus real triangle meshes for stairs, hills and big hollow buildings
    let cancelled = false
    fetch('/school/colliders.json')
      .then((r) => r.json())
      .then((data: { boxes: number[][]; meshes: { v: number[]; i: number[] }[] }) => {
        if (cancelled || !isGameActive()) return
        try {
          for (const c of data.boxes) {
            world.createCollider(
              rapier.ColliderDesc.cuboid(c[3], c[4], c[5])
                .setTranslation(c[0], c[1], c[2])
                .setRotation({ x: c[6], y: c[7], z: c[8], w: c[9] }),
              body,
            )
          }
          for (const m of data.meshes) {
            world.createCollider(rapier.ColliderDesc.trimesh(new Float32Array(m.v), new Uint32Array(m.i)), body)
          }
        } catch (e) {
          console.warn('School colliders could not be added', e)
        }
      })
      .catch((e) => console.warn('School colliders unavailable', e))

    // World boundary (the only invisible walls in the game, at the map edge)
    const H = WORLD_HALF
    const wall = (x: number, z: number, hx: number, hz: number) =>
      world.createCollider(rapier.ColliderDesc.cuboid(hx, 15, hz).setTranslation(x, 15, z), body)
    wall(0, -H - 1, H + 2, 1)
    wall(0, H + 1, H + 2, 1)
    wall(-H - 1, 0, 1, H + 2)
    wall(H + 1, 0, 1, H + 2)

    return () => {
      cancelled = true
      // When the player leaves the game, <Physics> frees the whole world first, and
      // touching it afterwards crashes the WASM engine. Only clean up for a plain
      // re-run of this effect while the game is still on screen.
      if (!isGameActive()) return
      try {
        world.removeRigidBody(body)
      } catch {
        /* world already gone */
      }
    }
  }, [world, rapier])

  return null
}
