import { Suspense, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import * as THREE from 'three'
import { WorldMesh } from './world/WorldMesh'
import { WorldColliders } from './world/WorldColliders'
import { Trees } from './world/Trees'
import { Water } from './world/Water'
import { Districts } from './world/Districts'
import { Environment } from './world/Environment'
import { PlayerController } from './characters/PlayerController'
import { RemotePlayers } from './characters/RemotePlayers'
import { Props } from './props/Props'
import { Petals } from './world/Petals'
import { CherryTrees } from './world/CherryTrees'
import { useNet } from '@/net/net'
import { attachInput } from './input/input'
import { useSettings } from '@/stores/settingsStore'
import { useApp } from '@/stores/appStore'

/** Registers keyboard / mouse handling against the actual canvas element. */
function InputBridge() {
  const gl = useThree((s) => s.gl)
  useEffect(() => attachInput(gl.domElement), [gl])
  return null
}

export function GameCanvas() {
  const antialias = useSettings((s) => s.settings.antialias)
  const shadows = useSettings((s) => s.settings.shadows)
  const scale = useSettings((s) => s.settings.resolutionScale)
  // Solo: the world freezes while paused. In a room it keeps running for everyone else.
  const menuOpen = useApp((s) => s.paused)
  const inRoom = useNet((s) => !!s.room)
  const paused = menuOpen && !inRoom

  const dpr = Math.max(0.5, Math.min(2.5, (window.devicePixelRatio || 1) * scale))

  return (
    <Canvas
      // Antialiasing is fixed at context creation, so changing it remounts the canvas
      key={antialias ? 'aa' : 'noaa'}
      shadows={shadows ? { type: THREE.PCFSoftShadowMap } : false}
      dpr={dpr}
      gl={{ antialias, powerPreference: 'high-performance' }}
      camera={{ fov: 60, near: 0.1, far: 700, position: [0, 4, 8] }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <InputBridge />
      <Environment />
      <Suspense fallback={null}>
        <Physics gravity={[0, -9.81, 0]} timeStep="vary" paused={paused}>
          <WorldMesh />
          <Trees />
          <Water />
          <WorldColliders />
          {/* Own boundary so the town is playable while the GLB buildings stream in */}
          <Suspense fallback={null}>
            <Districts />
          </Suspense>
          <PlayerController />
          <RemotePlayers />
          <Props />
          <Petals />
          <CherryTrees />
        </Physics>
      </Suspense>
    </Canvas>
  )
}
