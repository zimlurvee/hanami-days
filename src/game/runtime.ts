/**
 * Mutable per-frame state shared between the 3D scene and the HUD.
 * Kept outside React/Zustand so updating it every frame never re-renders UI.
 */
export const runtime = {
  player: { x: 0, y: 0, z: 0, yaw: 0, speed: 0, grounded: true },
  /** Camera orbit angles, radians. yaw 0 looks along -Z. */
  cam: { yaw: 0, pitch: 0.35, zoom: 1 },
  /** Set by the controller each frame; HUD polls it at low frequency. */
  nearby: null as null | { label: string; key: string },
  locationName: 'Town Square',
}
