import { memo } from 'react'
import { useProps, type Prop } from '@/stores/propsStore'

const WOOD = '#b98a5e'
const DARK = '#8a6240'

/** Small furniture and objects built from simple shapes (no model files needed). */
function Shape({ kind }: { kind: Prop['kind'] }) {
  switch (kind) {
    case 'chair':
      return (
        <>
          <mesh position={[0, 0.45, 0]} castShadow><boxGeometry args={[0.46, 0.05, 0.46]} /><meshStandardMaterial color={WOOD} /></mesh>
          <mesh position={[0, 0.74, -0.21]} castShadow><boxGeometry args={[0.46, 0.5, 0.05]} /><meshStandardMaterial color={WOOD} /></mesh>
          {[[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.22, z]} castShadow><boxGeometry args={[0.05, 0.44, 0.05]} /><meshStandardMaterial color={DARK} /></mesh>
          ))}
        </>
      )
    case 'table':
      return (
        <>
          <mesh position={[0, 0.72, 0]} castShadow><boxGeometry args={[1.2, 0.06, 0.8]} /><meshStandardMaterial color={WOOD} /></mesh>
          {[[-0.54, -0.34], [0.54, -0.34], [-0.54, 0.34], [0.54, 0.34]].map(([x, z], i) => (
            <mesh key={i} position={[x, 0.35, z]} castShadow><boxGeometry args={[0.06, 0.7, 0.06]} /><meshStandardMaterial color={DARK} /></mesh>
          ))}
        </>
      )
    case 'bench':
      return (
        <>
          <mesh position={[0, 0.45, 0]} castShadow><boxGeometry args={[1.6, 0.06, 0.45]} /><meshStandardMaterial color={WOOD} /></mesh>
          <mesh position={[0, 0.78, -0.2]} castShadow><boxGeometry args={[1.6, 0.35, 0.05]} /><meshStandardMaterial color={WOOD} /></mesh>
          {[-0.7, 0.7].map((x) => (
            <mesh key={x} position={[x, 0.22, 0]} castShadow><boxGeometry args={[0.08, 0.44, 0.4]} /><meshStandardMaterial color={DARK} /></mesh>
          ))}
        </>
      )
    case 'box':
      return <mesh position={[0, 0.3, 0]} castShadow><boxGeometry args={[0.6, 0.6, 0.6]} /><meshStandardMaterial color="#d6a96b" /></mesh>
    case 'ball':
      return <mesh position={[0, 0.22, 0]} castShadow><sphereGeometry args={[0.22, 16, 12]} /><meshStandardMaterial color="#ff8fb7" /></mesh>
    case 'plant':
      return (
        <>
          <mesh position={[0, 0.18, 0]} castShadow><cylinderGeometry args={[0.2, 0.15, 0.36, 12]} /><meshStandardMaterial color="#c8674a" /></mesh>
          <mesh position={[0, 0.55, 0]} castShadow><sphereGeometry args={[0.3, 12, 10]} /><meshStandardMaterial color="#5fbf6a" /></mesh>
        </>
      )
    case 'cake':
      return (
        <>
          <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.32, 0.32, 0.04, 16]} /><meshStandardMaterial color="#ffffff" /></mesh>
          <mesh position={[0, 0.14, 0]} castShadow><cylinderGeometry args={[0.22, 0.22, 0.2, 16]} /><meshStandardMaterial color="#ffc2d6" /></mesh>
          <mesh position={[0, 0.3, 0]}><sphereGeometry args={[0.05, 8, 8]} /><meshStandardMaterial color="#e0245e" /></mesh>
        </>
      )
    case 'parasol':
      return (
        <>
          <mesh position={[0, 1.05, 0]} castShadow><cylinderGeometry args={[0.03, 0.03, 2.1, 8]} /><meshStandardMaterial color="#d9d9d9" /></mesh>
          <mesh position={[0, 2.05, 0]} castShadow><coneGeometry args={[1.2, 0.5, 16]} /><meshStandardMaterial color="#ff8fb7" /></mesh>
        </>
      )
  }
}

const PropMesh = memo(function PropMesh({ p }: { p: Prop }) {
  return (
    <group position={[p.x, p.y, p.z]} rotation={[0, p.yaw, 0]}>
      <Shape kind={p.kind} />
    </group>
  )
})

/** Every placed prop (solo or shared in the room). */
export function Props() {
  const props = useProps((s) => s.props)
  return (
    <>
      {props.map((p) => (
        <PropMesh key={p.id} p={p} />
      ))}
    </>
  )
}
