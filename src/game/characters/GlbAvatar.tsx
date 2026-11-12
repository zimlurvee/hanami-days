import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { AvatarAnim } from './Avatar'
import { characterInfo, type BoneNames, type CharacterId, type CharacterInfo } from './models'
import { CLIP_BASE, emoteFor, getPack, loadPack } from './clips'
import { useCharacter } from '@/stores/characterStore'
import { useItems } from '@/stores/itemsStore'
import { Accessories } from './Accessories'

const DEFAULT_HEIGHT = 1.7 // metres, unless the model says otherwise in models.ts

interface RigBone {
  bone: THREE.Object3D
  rest: THREE.Quaternion
}

/** A bone driven by the baked animation pack. */
interface AnimNode {
  bone: RigBone
  src: string
  srcIdx: number
  /** Index of the nearest posed ancestor in the same list, or -1 */
  parent: number
  /** 0 = not part of an arm, 1 = left arm chain, 2 = right arm chain (they carry the arm-down offset) */
  arm: 0 | 1 | 2
  /** Also driven by the procedural walk cycle (so the clip blends over the current value, not the rest pose) */
  proc: boolean
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
  /** Same idea, but swings each arm up above the head (wave / cheer). */
  armUpL: THREE.Quaternion
  armUpR: THREE.Quaternion
  anim: AnimNode[]
  /** Hip height in metres at size 1, used to scale the pack's hip movement to this character */
  hipM: number
}

const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const _qa = new THREE.Quaternion()
const _qb = new THREE.Quaternion()
const _qc = new THREE.Quaternion()
const _qd = new THREE.Quaternion()
const _qe = new THREE.Quaternion()
const _qf = new THREE.Quaternion() // arm rotation, kept apart from the scratch values pose() overwrites
const _qg = new THREE.Quaternion()
const _qh = new THREE.Quaternion()
const AXIS_Z = new THREE.Vector3(0, 0, 1)
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
function buildRig(model: THREE.Object3D, names: BoneNames, animBones: CharacterInfo['anim']): Rig {
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
    armUpL: new THREE.Quaternion(),
    armUpR: new THREE.Quaternion(),
    anim: [],
    hipM: 0,
  }

  // Facing: toes point forward from the ankle
  const foot = findBone(model, names.footL)
  const toe = findBone(model, names.toeL)
  if (foot && toe) {
    const dz = posInModel(model, toe, _a).z - posInModel(model, foot, _b).z
    if (Math.abs(dz) > 1e-4) rig.forward = dz > 0 ? 1 : -1
  }

  // Arm-down rotation: from the shoulder->hand direction at rest to "down and slightly out"
  const armTo = (upper: RigBone | undefined, handRe: RegExp, out: THREE.Quaternion, ty: number, tx: number) => {
    const hand = findBone(model, handRe)
    if (!upper || !hand) return
    const from = posInModel(model, hand, _a).clone().sub(posInModel(model, upper.bone, _b)).normalize()
    const outward = Math.sign(from.x) || 1
    const to = new THREE.Vector3(outward * tx, ty, 0).normalize()
    out.setFromUnitVectors(from, to)
  }
  armTo(rig.upArmL, names.handL, rig.armDownL, -1, 0.14)
  armTo(rig.upArmR, names.handR, rig.armDownR, -1, 0.14)
  armTo(rig.upArmL, names.handL, rig.armUpL, 1, 0.3)
  armTo(rig.upArmR, names.handR, rig.armUpR, 1, 0.3)

  // Bones the animation pack drives; each remembers its nearest posed ancestor
  const idxOf = new Map<THREE.Object3D, number>()
  const procBones = new Set([rig.hips, rig.upLegL, rig.loLegL, rig.upLegR, rig.loLegR, rig.upArmL, rig.upArmR].map((b) => b?.bone))
  for (const a of animBones ?? []) {
    const bone = findBone(model, a.re)
    if (!bone) continue
    let parent = -1
    for (let p = bone.parent; p; p = p.parent) {
      const k = idxOf.get(p)
      if (k !== undefined) { parent = k; break }
    }
    const arm = /^(Left)(Arm|ForeArm|Hand)$/.test(a.key) ? 1 : /^(Right)(Arm|ForeArm|Hand)$/.test(a.key) ? 2 : 0
    idxOf.set(bone, rig.anim.length)
    rig.anim.push({ bone: { bone, rest: bone.quaternion.clone() }, src: a.src, srcIdx: -1, parent, arm, proc: procBones.has(bone) })
  }
  return rig
}

/**
 * Sets a bone's orientation to `rotModel` applied on top of its rest pose, where
 * `rotModel` is expressed in model space. Independent of the bone's local axes.
 */
function poseTo(model: THREE.Object3D, b: RigBone, rotModel: THREE.Quaternion, out: THREE.Quaternion) {
  const parent = b.bone.parent!
  parent.updateWorldMatrix(true, false)
  parent.getWorldQuaternion(_qa) // parent in world space
  model.getWorldQuaternion(_qb) // model in world space
  _qc.copy(_qb).invert().multiply(_qa) // parent in model space
  _qd.copy(_qc).invert() // inverse
  // local = inv(parentModel) * rotModel * parentModel * rest
  out.copy(_qd).multiply(rotModel).multiply(_qc).multiply(b.rest)
}

function pose(model: THREE.Object3D, b: RigBone | undefined, rotModel: THREE.Quaternion) {
  if (!b || !b.bone.parent) return
  poseTo(model, b, rotModel, b.bone.quaternion)
}

const _qs0 = new THREE.Quaternion()
const _qs1 = new THREE.Quaternion()
const _qE: THREE.Quaternion[] = []
const _qR = new THREE.Quaternion()
const _qT = new THREE.Quaternion()

/**
 * Plays a baked clip frame on the rig. Every bone gets E = (world delta from the pack) x (arm-down offset),
 * expressed as a rotation relative to its posed parent, then blended in by `w`.
 */
function applyClip(model: THREE.Object3D, rig: Rig, boneNames: string[], q: Float32Array, nb: number, f0: number, f1: number, a: number, w: number) {
  const flip = rig.forward < 0
  for (let i = 0; i < rig.anim.length; i++) {
    const n = rig.anim[i]
    if (n.srcIdx < 0) n.srcIdx = boneNames.indexOf(n.src)
    if (n.srcIdx < 0 || !n.bone.bone.parent) continue
    const o0 = (f0 * nb + n.srcIdx) * 4
    const o1 = (f1 * nb + n.srcIdx) * 4
    _qs0.set(q[o0], q[o0 + 1], q[o0 + 2], q[o0 + 3])
    _qs1.set(q[o1], q[o1 + 1], q[o1 + 2], q[o1 + 3])
    _qs0.slerp(_qs1, a)
    if (flip) _qs0.set(-_qs0.x, _qs0.y, -_qs0.z, _qs0.w) // the model faces -Z: conjugate by a half turn about Y
    if (n.arm) _qs0.multiply(n.arm === 1 ? rig.armDownL : rig.armDownR)
    const E = (_qE[i] ??= new THREE.Quaternion())
    E.copy(_qs0)
    if (n.parent >= 0) _qR.copy(_qE[n.parent]).invert().premultiply(E)
    else _qR.copy(E)
    poseTo(model, n.bone, _qR, _qT)
    if (!n.proc) n.bone.bone.quaternion.copy(n.bone.rest)
    n.bone.bone.quaternion.slerp(_qT, w)
  }
}

const rotX = (angle: number, out: THREE.Quaternion) => out.setFromAxisAngle(AXIS_X, angle)
const rotZ = (angle: number, out: THREE.Quaternion) => out.setFromAxisAngle(AXIS_Z, angle)

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
    const rig = buildRig(model, info.bones!, info.anim)

    // Fit to height, stand on y = 0, centre on x / z
    model.updateWorldMatrix(true, true)
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const scale = size.y > 0 ? (info.height ?? DEFAULT_HEIGHT) / size.y : 1
    const centre = box.getCenter(new THREE.Vector3())
    if (rig.hips) rig.hipM = (posInModel(model, rig.hips.bone, _a).y - box.min.y) * scale
    const holder = new THREE.Group()
    holder.add(model)
    holder.scale.setScalar(scale)
    // Unscaled offsets, so the size slider can rescale every frame without drifting
    const off = { x: -centre.x, y: -box.min.y, z: -centre.z }
    return { model, rig, holder, unit: scale, off }
  }, [scene, info])

  // Wrapper turns the model so that it faces +Z, which is what the controller assumes
  const outer = useRef<THREE.Group>(null)
  const acc = useRef<THREE.Group>(null)
  const [worn, setWorn] = useState<string[]>([])
  const wornKey = useRef('')
  const state = useRef({ phase: 0, legSwing: 0, knee: 0, armSwing: 0, armUp: 0, bob: 0, drop: 0, pw: 0, poseLast: 0, t: 0, ct: 0, prev: 0, clipOn: false })

  // The animation pack is small; fetch it once when the first rigged character shows up
  useEffect(() => { if (info.anim?.length) void loadPack() }, [info])

  useEffect(() => {
    if (outer.current) outer.current.rotation.y = built.rig.forward > 0 ? 0 : Math.PI
  }, [built])

  useFrame((_, dt) => {
    const { model, rig, holder, unit, off } = built
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
    const sc = unit * (anim.size ?? useCharacter.getState().size)
    holder.scale.setScalar(sc)
    holder.position.set(off.x * sc, off.y * sc + s.bob - s.drop, off.z * sc)

    // ---- Pose blend (wave / cheer / sit / bow). Moving or jumping cancels it smoothly.
    const poseId = !moving && anim.grounded ? anim.pose ?? 0 : 0
    if (poseId) s.poseLast = poseId
    s.pw += ((poseId ? 1 : 0) - s.pw) * (1 - Math.exp(-9 * dt))
    s.t += dt
    const pw = s.pw
    const pid = s.poseLast
    const unitSize = sc / unit
    s.drop = pid === 3 ? pw * 0.46 * (info.height ?? DEFAULT_HEIGHT) * unitSize : 0

    // Clip emotes (animation pack): advance the clip, work out the frame pair and the hip movement
    const pack = getPack()
    const emote = pid >= CLIP_BASE ? emoteFor(pid) : undefined
    const clip = emote && pack ? pack.clips[emote.clip] : undefined
    if (poseId >= CLIP_BASE && s.prev !== poseId) s.ct = 0
    s.prev = poseId
    let f0 = 0, f1 = 0, fa = 0
    let hx = 0, hy = 0, hz = 0
    const clipActive = !!clip && pw > 0.002 && rig.anim.length > 0
    if (clipActive && clip && pack) {
      if (poseId >= CLIP_BASE) s.ct += dt
      const tt = emote!.hold ? Math.min(s.ct, clip.dur) : clip.dur > 0 ? s.ct % clip.dur : 0
      const x = Math.min(clip.n - 1, tt * clip.fps)
      f0 = Math.floor(x); f1 = Math.min(f0 + 1, clip.n - 1); fa = x - f0
      const kHip = (rig.hipM / pack.hipHeight) * unitSize * pw
      hx = f * kHip * (clip.hips[f0 * 3] + (clip.hips[f1 * 3] - clip.hips[f0 * 3]) * fa)
      hy = kHip * (clip.hips[f0 * 3 + 1] + (clip.hips[f1 * 3 + 1] - clip.hips[f0 * 3 + 1]) * fa)
      hz = f * kHip * (clip.hips[f0 * 3 + 2] + (clip.hips[f1 * 3 + 2] - clip.hips[f0 * 3 + 2]) * fa)
    }
    holder.position.set(off.x * sc + hx, off.y * sc + s.bob - s.drop + hy, off.z * sc + hz)
    const lerp = (a: number, b: number) => a + (b - a) * pw

    // Walk-cycle targets (forward is +Z in model space when f = 1; a negative X rotation swings a hanging leg forward)
    const air = s.armUp
    let legL = -f * (s.legSwing * (1 - air) + 0.5 * air)
    let legR = f * (s.legSwing * (1 - air) - 0.2 * air)
    let kneeL = f * (s.knee * (1 - air) + 0.7 * air)
    let kneeR = f * ((running ? 0.8 : 0.5) * Math.max(0, Math.sin(s.phase + 1.4 + Math.PI)) * (moving ? 1 : 0))
    const swingL = f * s.armSwing * (1 - air) - f * 2.3 * air
    const swingR = -f * s.armSwing * (1 - air) - f * 2.3 * air
    _qf.copy(rotX(swingL, _qe)).multiply(rig.armDownL)
    _qg.copy(rotX(swingR, _qe)).multiply(rig.armDownR)

    // Pose overrides, blended in by pw
    let bow = 0
    if (pid === 3) {
      legL = lerp(legL, -f * 1.45)
      legR = lerp(legR, -f * 1.45)
      kneeL = lerp(kneeL, f * 0.12)
      kneeR = lerp(kneeR, f * 0.12)
      _qh.copy(rotX(-f * 0.5, _qe)).multiply(rig.armDownL)
      _qf.slerp(_qh, pw)
      _qh.copy(rotX(-f * 0.5, _qe)).multiply(rig.armDownR)
      _qg.slerp(_qh, pw)
    } else if (pid === 4) {
      bow = pw * 0.95
    } else if (pid === 1) {
      // Right arm up, waving from side to side
      _qh.copy(rotZ(Math.sin(s.t * 9) * 0.4, _qe)).multiply(rig.armUpR)
      _qg.slerp(_qh, pw)
    } else if (pid === 2) {
      const sway = Math.sin(s.t * 7) * 0.18
      _qh.copy(rotZ(sway, _qe)).multiply(rig.armUpL)
      _qf.slerp(_qh, pw)
      _qh.copy(rotZ(-sway, _qe)).multiply(rig.armUpR)
      _qg.slerp(_qh, pw)
    }

    // Hips tilt forward for a bow; legs and arms cancel part of it so they stay natural
    pose(model, rig.hips, rotX(f * bow, _qe))
    pose(model, rig.upLegL, rotX(legL - f * bow, _qe))
    pose(model, rig.upLegR, rotX(legR - f * bow, _qe))
    pose(model, rig.loLegL, rotX(kneeL, _qe))
    pose(model, rig.loLegR, rotX(kneeR, _qe))
    // Quaternions pose() scribbles on are _qa.._qe, so _qf / _qg survive
    pose(model, rig.upArmL, _qf.premultiply(_qh.copy(rotX(-f * bow * 0.7, _qe))))
    pose(model, rig.upArmR, _qg.premultiply(_qh.copy(rotX(-f * bow * 0.7, _qe))))

    // Animation-pack emote on top of the procedural pose
    if (clipActive && clip && pack) {
      applyClip(model, rig, pack.bones, clip.q, pack.bones.length, f0, f1, fa, pw)
      s.clipOn = true
    } else if (s.clipOn) {
      for (const n of rig.anim) if (!n.proc) n.bone.bone.quaternion.copy(n.bone.rest)
      s.clipOn = false
    }

    // Accessories follow the size setting and the sitting drop
    const items = anim.items ?? useItems.getState().worn
    const key = items.join(',')
    if (key !== wornKey.current) {
      wornKey.current = key
      setWorn([...items])
    }
    if (acc.current) {
      acc.current.scale.setScalar(unitSize)
      acc.current.position.set(hx, hy - s.drop, hz)
    }
  })

  return (
    <group ref={outer}>
      <primitive object={built.holder} />
      <group ref={acc}>
        <Accessories items={worn} h={info.height ?? DEFAULT_HEIGHT} />
      </group>
    </group>
  )
}
