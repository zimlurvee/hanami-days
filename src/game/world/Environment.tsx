import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import { useWorld } from '@/stores/worldStore'
import { useSettings } from '@/stores/settingsStore'
import { useApp } from '@/stores/appStore'
import { useNet } from '@/net/net'
import { runtime } from '@/game/runtime'
import { newSkyState, skyAt, sunDirection } from './lighting'

/**
 * Day/night clock, sky colour, fog, sun/moon light and shadow camera.
 * The directional light follows the player so shadows stay sharp nearby.
 */
export function Environment() {
  const { scene } = useThree()
  const sun = useRef<THREE.DirectionalLight>(null)
  const amb = useRef<THREE.AmbientLight>(null)
  const hemi = useRef<THREE.HemisphereLight>(null)
  const disc = useRef<THREE.Mesh>(null)
  const stars = useRef<THREE.Group>(null)
  const shadows = useSettings((s) => s.settings.shadows)
  const quality = useSettings((s) => s.settings.quality)

  const state = useMemo(newSkyState, [])
  const dir = useMemo(() => new THREE.Vector3(), [])
  const bg = useMemo(() => new THREE.Color(), [])
  const fog = useMemo(() => new THREE.Fog(0xffffff, 40, 300), [])

  useMemo(() => {
    scene.fog = fog
    scene.background = bg
  }, [scene, fog, bg])

  useFrame((_, dt) => {
    const app = useApp.getState()
    const w = useWorld.getState()

    // Advance the clock (frozen while paused)
    if ((!app.paused || useNet.getState().room) && w.dayLengthSeconds > 0) {
      const next = w.hour + (dt * 24) / w.dayLengthSeconds
      useWorld.setState({ hour: next >= 24 ? next - 24 : next })
    }
    const hour = useWorld.getState().hour
    const rd = useSettings.getState().settings.renderDistance
    skyAt(hour, w.weather, rd, state)

    bg.copy(state.sky)
    fog.color.copy(state.fog)
    fog.near = Math.max(20, state.fogFar * 0.35)
    fog.far = state.fogFar

    sunDirection(hour, dir)
    const p = runtime.player
    if (sun.current) {
      sun.current.position.set(p.x + dir.x * 80, p.y + dir.y * 80, p.z + dir.z * 80)
      sun.current.target.position.set(p.x, p.y, p.z)
      sun.current.target.updateMatrixWorld()
      sun.current.color.copy(state.sun)
      sun.current.intensity = state.sunIntensity
    }
    if (amb.current) amb.current.intensity = state.ambientIntensity * 0.55
    if (hemi.current) {
      hemi.current.intensity = state.ambientIntensity * 0.5
      hemi.current.color.copy(state.sky)
    }
    if (disc.current) {
      disc.current.position.set(p.x + dir.x * 420, p.y + dir.y * 420, p.z + dir.z * 420)
      const m = disc.current.material as THREE.MeshBasicMaterial
      m.color.setHex(state.night > 0.5 ? 0xe8eeff : 0xfff4c2)
      m.opacity = w.weather === 'rainy' ? 0.2 : 1
    }
    if (stars.current) {
      stars.current.visible = state.night > 0.45 && w.weather !== 'rainy'
      stars.current.position.set(p.x, p.y, p.z)
    }
  })

  const mapSize = quality === 'ultra' ? 4096 : quality === 'high' ? 2048 : 1024

  return (
    <>
      <ambientLight ref={amb} />
      <hemisphereLight ref={hemi} groundColor={0xb8c98a} />
      <directionalLight
        ref={sun}
        castShadow={shadows}
        shadow-mapSize={[mapSize, mapSize]}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-near={1}
        shadow-camera-far={220}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <mesh ref={disc} renderOrder={-1}>
        <sphereGeometry args={[14, 16, 12]} />
        <meshBasicMaterial fog={false} transparent />
      </mesh>
      <group ref={stars}>
        <Stars radius={380} depth={40} count={2500} factor={5} fade speed={0.4} />
      </group>
    </>
  )
}
