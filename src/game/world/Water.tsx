import { getWorld } from './index'

/** Pond, pool and sea surfaces: flat translucent planes. */
export function Water() {
  const waters = getWorld().waters
  return (
    <>
      {waters.map((w, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[(w.x0 + w.x1) / 2, w.y, (w.z0 + w.z1) / 2]}
          receiveShadow
        >
          <planeGeometry args={[Math.abs(w.x1 - w.x0), Math.abs(w.z1 - w.z0)]} />
          <meshStandardMaterial color={w.color} transparent opacity={0.78} roughness={0.2} metalness={0.1} />
        </mesh>
      ))}
    </>
  )
}
