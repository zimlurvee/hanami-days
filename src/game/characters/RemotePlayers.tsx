import { Component, Suspense, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { Avatar, type AvatarAnim } from './Avatar'
import { GlbAvatar } from './GlbAvatar'
import { DEFAULT_APPEARANCE } from './appearance'
import type { CharacterId } from './models'
import { remotes, useNet } from '@/net/net'

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

function RemotePlayer({ id }: { id: string }) {
  const group = useRef<THREE.Group>(null)
  const anim = useMemo<AvatarAnim>(() => ({ speed: 0, grounded: true, vy: 0, size: 1 }), [])
  // Name / character only change on join, so reading them from the store is cheap
  const info = useNet((s) => s.names[id])

  useFrame((_, dt) => {
    const r = remotes.get(id)
    const g = group.current
    if (!r || !g) return
    // Ease toward the latest snapshot (snapshots arrive ~15 times a second)
    const k = 1 - Math.exp(-12 * dt)
    r.dx += (r.x - r.dx) * k
    r.dy += (r.y - r.dy) * k
    r.dz += (r.z - r.dz) * k
    let d = r.yaw - r.dyaw
    d = Math.atan2(Math.sin(d), Math.cos(d))
    r.dyaw += d * k
    g.position.set(r.dx, r.dy, r.dz)
    g.rotation.y = r.dyaw
    anim.speed = r.speed
    anim.grounded = r.grounded
    anim.vy = r.vy
    anim.size = r.size
    anim.pose = r.pose
    anim.items = r.items
  })

  if (!info) return null
  const builtIn = (
    <group scale={anim.size}>
      <Avatar appearance={DEFAULT_APPEARANCE} anim={anim} />
    </group>
  )
  return (
    <group ref={group}>
      {info.character === 'student' ? (
        builtIn
      ) : (
        <Boundary key={info.character} fallback={builtIn}>
          <Suspense fallback={builtIn}>
            <GlbAvatar id={info.character as CharacterId} anim={anim} />
          </Suspense>
        </Boundary>
      )}
      <Html position={[0, 1.95, 0]} center distanceFactor={14} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className="nametag">{info.name}</div>
      </Html>
    </group>
  )
}

/** Every other player in the room. */
export function RemotePlayers() {
  const ids = useNet((s) => s.playerIds)
  return (
    <>
      {ids.map((id) => (
        <RemotePlayer key={id} id={id} />
      ))}
    </>
  )
}
