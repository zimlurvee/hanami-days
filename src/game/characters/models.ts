/**
 * Registry of playable character models. 'student' is the built-in procedural
 * character. The others are CC-BY-4.0 Sketchfab models stored in
 * public/models/characters/ (credits are shown in the Credits screen).
 */
export type CharacterId = 'student' | 'schoolgirl' | 'oc'

/** Regexes that pick out the bones the walk cycle drives. */
export interface BoneNames {
  hips: RegExp
  upLegL: RegExp
  loLegL: RegExp
  footL: RegExp
  toeL: RegExp
  upLegR: RegExp
  loLegR: RegExp
  footR: RegExp
  toeR: RegExp
  upArmL: RegExp
  handL: RegExp
  upArmR: RegExp
  handR: RegExp
}

/** One bone driven by the Satomi animation pack: `src` names the pack bone whose motion it copies. */
export interface AnimBone {
  key: string
  re: RegExp
  src: string
}

const ab = (key: string, re: RegExp, src = key): AnimBone => ({ key, re, src })
// Parents come before children
const ANIM_OC: AnimBone[] = [
  ab('Hips', /^Hips_/), ab('Spine', /^Spine_\d+$/), ab('Spine1', /^Spine1_/), ab('Spine2', /^Spine2_/), ab('Spine3', /^Spine3_/),
  ab('Neck', /^Neck_/), ab('Head', /^Head_\d+$/),
  ab('LeftShoulder', /^LeftShoulder_/), ab('LeftArm', /^LeftArm_\d+$/), ab('LeftForeArm', /^LeftForeArm_\d+$/), ab('LeftHand', /^LeftHand_\d+$/),
  ab('RightShoulder', /^RightShoulder_/), ab('RightArm', /^RightArm_\d+$/), ab('RightForeArm', /^RightForeArm_\d+$/), ab('RightHand', /^RightHand_\d+$/),
  ab('LeftUpLeg', /^LeftUpLeg_/), ab('LeftLeg', /^LeftLeg_\d+$/), ab('LeftFoot', /^LeftFoot_/), ab('LeftToes', /^LeftToes_\d+$/),
  ab('RightUpLeg', /^RightUpLeg_/), ab('RightLeg', /^RightLeg_\d+$/), ab('RightFoot', /^RightFoot_/), ab('RightToes', /^RightToes_\d+$/),
]
// The school girl has one spine bone fewer (and an unused Upperchest bone whose pivot sits at the origin, so it is left alone)
const ANIM_GIRL: AnimBone[] = [
  ab('Hips', /^Hips_/), ab('Spine', /^Spine_/, 'Spine1'), ab('Chest', /^Chest_/, 'Spine3'),
  ab('Neck', /^Neck_/), ab('Head', /^Head_/),
  ab('LeftShoulder', /^L_Shoulder_/), ab('LeftArm', /^L_UpperArm_/), ab('LeftForeArm', /^L_LowerArm_/), ab('LeftHand', /^L_Hand_/),
  ab('RightShoulder', /^R_ShouRder_/), ab('RightArm', /^R_UpperArm_/), ab('RightForeArm', /^R_RowerArm_/), ab('RightHand', /^R_Hand_/),
  ab('LeftUpLeg', /^L_Upperleg/), ab('LeftLeg', /^L_Lowerleg/), ab('LeftFoot', /^L_Foot_/), ab('LeftToes', /^L_ToeBase/),
  ab('RightUpLeg', /^R_UpperReg/), ab('RightLeg', /^R_RowerReg/), ab('RightFoot', /^R_Foot_/), ab('RightToes', /^R_ToeBase/),
]

export interface CharacterInfo {
  id: CharacterId
  label: string
  blurb: string
  url?: string
  /** Height in metres the model is scaled to (default 1.7). */
  height?: number
  bones?: BoneNames
  /** The file's default pose is not a neutral standing pose, so reset the skeleton to its bind pose. */
  resetToBindPose?: boolean
  /** Bone table for the baked animation pack (public/anim/satomi.json). */
  anim?: AnimBone[]
  /** Unskinned meshes (hair) that must ride on the head bone, matched by node name. */
  headProps?: RegExp
  /** Attribution text required by the model's licence. */
  credit?: string
}

export const CHARACTERS: CharacterInfo[] = [
  {
    id: 'student',
    label: 'Hanami Student',
    blurb: 'The built-in character. Simple and light.',
  },
  {
    id: 'schoolgirl',
    label: 'Anime School Girl',
    blurb: 'Rigged anime-style student in a school uniform.',
    url: '/models/characters/schoolgirl/scene.gltf',
    credit:
      '"Anime school girl (Rigged)" by darknessvoid403 (sketchfab.com/darknessvoid403), CC-BY-4.0',
    // Saved in a crouching pose; its bind pose is a clean standing A-pose
    resetToBindPose: true,
    height: 1.45,
    anim: ANIM_GIRL,
    bones: {
      hips: /^Hips_/,
      upLegL: /^L_Upperleg/,
      loLegL: /^L_Lowerleg/,
      footL: /^L_Foot_/,
      toeL: /^L_ToeBase/,
      upLegR: /^R_UpperReg/,
      loLegR: /^R_RowerReg/,
      footR: /^R_Foot_/,
      toeR: /^R_ToeBase/,
      upArmL: /^L_UpperArm/,
      handL: /^L_Hand_/,
      upArmR: /^R_UpperArm/,
      handR: /^R_Hand_/,
    },
  },
  {
    id: 'oc',
    label: 'Random OC',
    blurb: 'Original character with a skirt outfit and long hair.',
    url: '/models/characters/oc/scene.gltf',
    credit: '"Random oc" by Delenapro (sketchfab.com/Delenapro), CC-BY-4.0',
    height: 1.55,
    anim: ANIM_OC,
    headProps: /^CoxitoHair$/,
    bones: {
      hips: /^Hips_/,
      upLegL: /^LeftUpLeg_/,
      loLegL: /^LeftLeg_\d+$/,
      footL: /^LeftFoot_/,
      toeL: /^LeftToes_\d+$/,
      upLegR: /^RightUpLeg_/,
      loLegR: /^RightLeg_\d+$/,
      footR: /^RightFoot_/,
      toeR: /^RightToes_\d+$/,
      upArmL: /^LeftArm_\d+$/,
      handL: /^LeftHand_\d+$/,
      upArmR: /^RightArm_\d+$/,
      handR: /^RightHand_\d+$/,
    },
  },
]

export const characterInfo = (id: CharacterId) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0]
