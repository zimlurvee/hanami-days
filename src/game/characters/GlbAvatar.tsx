import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { AvatarAnim } from './Avatar'
import { characterInfo, type BoneNames, type CharacterId } from './models'

const HEIGHT = 1.7 // every model is scaled to this many metres tall

interface RigBone {
  bone: THREE.Object3D
  rest: THREE.Quaternion
}

interface Rig {
  /** +1 if the model faces +Z in its own space, -1 if it faces -Z. */
  forward: number
  hips?: RigBone
  upLegL?: RigBone
  loLegL?: RigBone
  upLegR?: RigBone
  loLegR?: RigBone
  upArmL?: RigBone
  upArmR?: RigBone
  /** World-space rotation (in model space) that brings each arm from its rest pose down to the side. */
  armDownL: THREE.Quaternion
  armDownR: THREE.Quaternion
}

const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const _qa = new THREE.Quaternion()
const _qb = new THREE.Quaternion()
const _qc = new THREE.Quaternion()
const _qd = new THREE.Quaternion()
const _qe = new THREE.Quaternion()
const _qf = new THREE.Quaternion() // arm rotation, kept apart from the scratch values pose() overwrites
const AXIS_X = new THREE.Vector3(1, 0, 0)

function findBone(root: THREE.Object3D, re: RegExp): THREE.Object3D | undefined {
  let hit: THREE.Object3D | undefined
  root.traverse((o) => {
    if (!hit && (o as THREE.Bone).isBone && re.test(o.name)) hit = o
  })
  return hit
}

/** Position of a bone in the model's own space (before any wrapper scale / rotation). */
function posInModel(model: THREE.Object3D, o: THREE.Object3D, out: THREE.Vector3) {
  return model.worldToLocal(o.getWorldPosition(out))
}

/**
 * Finds the bones named in `names` and records what is needed to pose them
 * without knowing their local axes: the rest rotation of each bone, which way
 * the model faces, and how to swing each arm down from whatever rest pose it has.
 */
function buildRig(model: THREE.Object3D, names: BoneNames): Rig {
  model.updateWorldMatrix(true, true)
  const get = (re: RegExp): RigBone | undefined => {
    const bone = findBone(model, re)
    return bone ? { bone, rest: bone.quaternion.clone() } : undefined
  }
  const rig: Rig = {
    forward: 1,
    hips: get(names.hips),
    upLegL: get(names.upLegL),
    loLegL: get(names.loLegL),
    upLegR: get(names.upLegR),
    loLegR: get(names.loLegR),
    upArmL: get(names.upArmL),
    upArmR: get(names.upArmR),
    armDownL: new THREE.Quaternion(),
    armDownR: new THREE.Quaternion(),
  }

  // Facing: toes point forward from the ankle
  const foot = findBone(model, names.footL)
  const toe = findBone(model, names.toeL)
  if (foot && toe) {
    const dz = posInModel(model, toe, _a).z - posInModel(model, foot, _b).z
    if (Math.abs(dz) > 1e-4) rig.forward = dz > 0 ? 1 : -1
  }

  // Arm-down rotation: from the shoulder->hand direction at rest to "down and slightly out"
  const armDown = (upper: RigBone | undefined, handRe: RegExp, out: THREE.Quaternion) => {
    const hand = findBone(model, handRe)
    if (!upper || !hand) return
    const from = posInModel(model, hand, _a).clone().sub(posInModel(model, upper.bone, _b)).normalize()
    const outward = Math.sign(from.x) || 1
    const to = new THREE.Vector3(outward * 0.14, -1, 0).normalize()
    out.setFromUnitVectors(from, to)
  }
  armDown(rig.upArmL, names.handL, rig.armDownL)
  armDown(rig.upArmR, names.handR, rig.armDownR)
  return rig
}

/**
 * Sets a bone's orientation to `rotModel` applied on top of its rest pose, where
 * `rotModel` is expressed in model space. Independent of the bone's local axes.
 */
function pose(model: THREE.Object3D, b: RigBone | undefined, rotModel: THREE.Quaternion) {
  if (!b || !b.bone.parent) return
  const parent = b.bone.parent
  parent.updateWorldMatrix(true, false)
  parent.getWorldQuaternion(_qa) // parent in world space
  model.getWorldQuaternion(_qb) // model in world space
  _qc.copy(_qb).invert().multiply(_qa) // parent in model space
  _qd.copy(_qc).invert() // inverse
  // local = inv(parentModel) * rotModel * parentModel * rest
  b.bone.quaternion.copy(_qd).multiply(rotModel).multiply(_qc).multiply(b.rest)
}

const rotX = (angle: number, out: THREE.Quaternion) => out.setFromAxisAngle(AXIS_X, angle)

interface Props {
  id: CharacterId
  anim: AvatarAnim
}

/**
 * A rigged GLB character, scaled to HEIGHT, with idle / walk / run / jump
 * animation driven procedurally on its skeleton.
 */
export function GlbAvatar({ id, anim }: Props) {
  const info = characterInfo(id)
  const { scene } = useGLTF(info.url!)

  const built = useMemo(() => {
    const model = SkeletonUtils.clone(scene)
    model.traverse((o) => {
      const m = o as THREE.SkinnedMesh
      if (m.isMesh) {
        m.castShadow = true
        m.frustumCulled = false // skinned bounds do not follow the animated bones
      }
    })
    if (info.resetToBindPose) {
      model.updateWorldMatrix(true, true)
      model.traverse((o) => {
        if ((o as THREE.SkinnedMesh).isSkinnedMesh) (o as THREE.SkinnedMesh).skeleton.pose()
      })
    }
    const rig = buildRig(model, info.bones!)

    // Fit to height, stand on y = 0, centre on x / z
    model.updateWorldMatrix(true, true)
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const scale = size.y > 0 ? HEIGHT / size.y : 1
    const centre = box.getCenter(new THREE.Vector3())
    const holder = new THREE.Group()
    holder.add(model)
    holder.scale.setScalar(scale)
    const baseY = -box.min.y * scale
    holder.position.set(-centre.x * scale, baseY, -centre.z * scale)
    return { model, rig, holder, baseY }
  }, [scene, info])

  // Wrapper turns the model so that it faces +Z, which is what the controller assumes
  const outer = useRef<THREE.Group>(null)
  const state = useRef({ phase: 0, legSwing: 0, knee: 0, armSwing: 0, armUp: 0, bob: 0 })

  useEffect(() => {
    if (outer.current) outer.current.rotation.y = built.rig.forward > 0 ? 0 : Math.PI
  }, [built])

  useFrame((_, dt) => {
    const { model, rig, holder, baseY } = built
    const s = state.current
    const f = rig.forward
    const moving = anim.speed > 0.15 && anim.grounded
    const running = anim.speed > 4.5

    if (moving) s.phase += dt * (running ? 12 : 8.5)
    const k = 1 - Math.exp(-14 * dt)
    const amp = moving ? Math.min(1, anim.speed / 3.2) * (running ? 0.85 : 0.55) : 0
    const sw = Math.sin(s.phase)

    // Targets
    const tLeg = amp * sw
    const tKnee = moving ? (running ? 1.0 : 0.6) * Math.max(0, Math.sin(s.phase + 1.4)) : 0
    const tArm = amp * 0.8 * sw
    const tUp = anim.grounded ? 0 : 1
    s.legSwing += (tLeg - s.legSwing) * k
    s.knee += (tKnee - s.knee) * k
    s.armSwing += (tArm - s.armSwing) * k
    s.armUp += (tUp - s.armUp) * k

    // Bob and lean on the holder (the bones follow it)
    const bob = moving ? Math.abs(Math.sin(s.phase)) * 0.035 : Math.sin(performance.now() / 650) * 0.006
    s.bob += (bob - s.bob) * k
    holder.position.y = baseY + s.bob

    // Legs (forward is +Z in model space when f = 1; a negative X rotation swings a hanging leg forward)
    const air = s.armUp
    const legL = -f * (s.legSwing * (1 - air) + 0.5 * air)
    const legR = f * (s.legSwing * (1 - air) - 0.2 * air)
    pose(model, rig.upLegL, rotX(legL, _qe))
    pose(model, rig.upLegR, rotX(legR, _qe))
    // Knees bend the shin backward
    pose(model, rig.loLegL, rotX(f * (s.knee * (1 - air) + 0.7 * air), _qe))
    pose(model, rig.loLegR, rotX(f * ((running ? 0.8 : 0.5) * Math.max(0, Math.sin(s.phase + 1.4 + Math.PI)) * (moving ? 1 : 0)), _qe))

    // Arms: lower from the rest pose, swing opposite the legs, raise in the air
    const swingL = f * s.armSwing * (1 - air) - f * 2.3 * air
    const swingR = -f * s.armSwing * (1 - air) - f * 2.3 * air
    pose(model, rig.upArmL, _qf.copy(rotX(swingL, _qe)).multiply(rig.armDownL))
    pose(model, rig.upArmR, _qf.copy(rotX(swingR, _qe)).multiply(rig.armDownR))
  })

  return (
    <group ref={outer}>
      <primitive object={built.holder} />
    </group>
  )
}
