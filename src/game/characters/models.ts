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
