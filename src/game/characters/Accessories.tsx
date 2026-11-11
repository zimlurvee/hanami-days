import type { ItemId } from '@/stores/itemsStore'

/**
 * Wearable items made from simple shapes. Positions are fractions of the
 * character's height (h), so they fit every model; the group they sit in is
 * scaled with the player's size setting. Character space: +Z is forward.
 */
export function Accessories({ items, h }: { items: string[]; h: number }) {
  const has = (id: ItemId) => items.includes(id)
  return (
    <>
      {has('cap') && (
        <group position={[0, 0.94 * h, 0.004 * h]}>
          <mesh castShadow><sphereGeometry args={[0.075 * h, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#ff7fa8" /></mesh>
          <mesh position={[0, 0.002 * h, 0.075 * h]} castShadow><boxGeometry args={[0.11 * h, 0.008 * h, 0.07 * h]} /><meshStandardMaterial color="#ff5c92" /></mesh>
        </group>
      )}
      {has('glasses') && (
        <group position={[0, 0.915 * h, 0.082 * h]}>
          {[-0.034, 0.034].map((x) => (
            <mesh key={x} position={[x * h, 0, 0]}><torusGeometry args={[0.02 * h, 0.003 * h, 6, 16]} /><meshStandardMaterial color="#2b2b33" /></mesh>
          ))}
          <mesh><boxGeometry args={[0.03 * h, 0.004 * h, 0.004 * h]} /><meshStandardMaterial color="#2b2b33" /></mesh>
        </group>
      )}
      {has('bag') && (
        <group position={[0, 0.62 * h, -0.105 * h]}>
          <mesh castShadow><boxGeometry args={[0.17 * h, 0.22 * h, 0.075 * h]} /><meshStandardMaterial color="#e95f7e" /></mesh>
          <mesh position={[0, 0.03 * h, -0.04 * h]}><boxGeometry args={[0.12 * h, 0.08 * h, 0.01 * h]} /><meshStandardMaterial color="#c94467" /></mesh>
        </group>
      )}
      {has('ribbon') && (
        <group position={[0.06 * h, 0.96 * h, -0.02 * h]}>
          {[-1, 1].map((d) => (
            <mesh key={d} position={[d * 0.02 * h, 0, 0]} scale={[1.3, 0.8, 0.6]}><sphereGeometry args={[0.02 * h, 10, 8]} /><meshStandardMaterial color="#ff4f87" /></mesh>
          ))}
          <mesh><sphereGeometry args={[0.009 * h, 8, 8]} /><meshStandardMaterial color="#d62f68" /></mesh>
        </group>
      )}
      {has('headphones') && (
        <group position={[0, 0.915 * h, 0]}>
          <mesh rotation={[0, 0, 0]} position={[0, 0.0 * h, 0]}><torusGeometry args={[0.078 * h, 0.006 * h, 8, 20, Math.PI]} /><meshStandardMaterial color="#444b57" /></mesh>
          {[-1, 1].map((d) => (
            <mesh key={d} position={[d * 0.078 * h, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.028 * h, 0.028 * h, 0.02 * h, 12]} /><meshStandardMaterial color="#6b7380" /></mesh>
          ))}
        </group>
      )}
    </>
  )
}
