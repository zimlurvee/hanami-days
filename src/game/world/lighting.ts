import * as THREE from 'three'
import type { Weather } from '@/stores/worldStore'

interface Key {
  h: number
  sky: number
  fog: number
  sun: number
  sunI: number
  ambI: number
}

/** Hour-of-day keyframes. Hours wrap, so the list starts and ends at the same look. */
const KEYS: Key[] = [
  { h: 0, sky: 0x0b1030, fog: 0x0e1438, sun: 0x8ea2ff, sunI: 0.25, ambI: 0.28 },
  { h: 5, sky: 0x1d2552, fog: 0x2a3060, sun: 0x8ea2ff, sunI: 0.2, ambI: 0.3 },
  { h: 6.5, sky: 0xffb48a, fog: 0xffc9a5, sun: 0xffc48a, sunI: 1.1, ambI: 0.5 },
  { h: 8.5, sky: 0x9fd8ff, fog: 0xcfeaff, sun: 0xfff1d6, sunI: 2.0, ambI: 0.7 },
  { h: 12, sky: 0x7cc8ff, fog: 0xcdeaff, sun: 0xffffff, sunI: 2.4, ambI: 0.8 },
  { h: 16, sky: 0x9ad3ff, fog: 0xd6ecff, sun: 0xfff1d6, sunI: 2.0, ambI: 0.72 },
  { h: 18.5, sky: 0xff9a6b, fog: 0xffb68e, sun: 0xff9f6a, sunI: 1.2, ambI: 0.5 },
  { h: 20, sky: 0x2a2f5e, fog: 0x343a6c, sun: 0x8ea2ff, sunI: 0.25, ambI: 0.32 },
  { h: 24, sky: 0x0b1030, fog: 0x0e1438, sun: 0x8ea2ff, sunI: 0.25, ambI: 0.28 },
]

export interface SkyState {
  sky: THREE.Color
  fog: THREE.Color
  sun: THREE.Color
  sunIntensity: number
  ambientIntensity: number
  /** 0 = full day, 1 = full night. Drives stars and street lights. */
  night: number
  fogFar: number
}

const c1 = new THREE.Color()
const c2 = new THREE.Color()
const grey = new THREE.Color(0x9aa5b1)
const rainGrey = new THREE.Color(0x6c7787)

export function skyAt(hour: number, weather: Weather, renderDistance: number, out: SkyState): SkyState {
  let i = 0
  while (i < KEYS.length - 2 && hour >= KEYS[i + 1].h) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const t = (hour - a.h) / (b.h - a.h)
  out.sky.set(a.sky).lerp(c1.set(b.sky), t)
  out.fog.set(a.fog).lerp(c2.set(b.fog), t)
  out.sun.set(a.sun).lerp(c1.set(b.sun), t)
  out.sunIntensity = THREE.MathUtils.lerp(a.sunI, b.sunI, t)
  out.ambientIntensity = THREE.MathUtils.lerp(a.ambI, b.ambI, t)

  const dayAmount = THREE.MathUtils.clamp((out.sunIntensity - 0.25) / 1.6, 0, 1)
  out.night = 1 - THREE.MathUtils.clamp(dayAmount * 2, 0, 1)

  let fogFar = renderDistance
  if (weather === 'cloudy') {
    out.sky.lerp(grey, 0.45 * dayAmount)
    out.fog.lerp(grey, 0.5 * dayAmount)
    out.sunIntensity *= 0.55
    out.ambientIntensity *= 1.05
    fogFar *= 0.85
  } else if (weather === 'rainy') {
    out.sky.lerp(rainGrey, 0.7 * dayAmount + 0.15)
    out.fog.lerp(rainGrey, 0.75 * dayAmount + 0.15)
    out.sunIntensity *= 0.3
    out.ambientIntensity *= 0.95
    fogFar *= 0.55
  }
  out.fogFar = fogFar
  return out
}

export function newSkyState(): SkyState {
  return {
    sky: new THREE.Color(),
    fog: new THREE.Color(),
    sun: new THREE.Color(),
    sunIntensity: 1,
    ambientIntensity: 1,
    night: 0,
    fogFar: 300,
  }
}

/** Sun direction (unit vector pointing toward the sun) for an hour of the day. */
export function sunDirection(hour: number, out: THREE.Vector3): THREE.Vector3 {
  // Rises at 6, peaks at 12, sets at 18. After dark the same arc is used for the moon.
  const ang = ((hour - 6) / 12) * Math.PI
  const lit = hour >= 6 && hour < 18
  const a = lit ? ang : ang - Math.PI
  return out.set(Math.cos(a) * 0.55, Math.max(0.12, Math.sin(a)), Math.cos(a) * -0.35 + 0.35).normalize()
}
