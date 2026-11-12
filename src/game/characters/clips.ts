/**
 * Baked animation pack. public/anim/satomi.json holds world-space rotation
 * deltas (relative to the neutral pose) of Satomi Makise's skeleton, converted
 * from the Unity animation bundle by S0ul2450Official, sampled at 24 fps.
 * Each character retargets them onto its own bones (see GlbAvatar).
 */
export interface Clip {
  name: string
  dur: number
  fps: number
  n: number
  /** n frames x BONES x 4 (x, y, z, w) */
  q: Float32Array
  /** n x 3 hips offset in metres of the source skeleton (x already mirrored) */
  hips: Float32Array
}

export interface ClipPack {
  bones: string[]
  hipHeight: number
  clips: Record<string, Clip>
}

/** Emotes shown in the Pose tab. Pose id = CLIP_BASE + index (the server accepts ids below 64). */
export const CLIP_BASE = 5
export interface Emote { clip: string; label: string; hold?: boolean }
export const EMOTES: Emote[] = [
  { clip: 'greet_00', label: 'Greet 1' }, { clip: 'greet_01', label: 'Greet 2' }, { clip: 'greet_02', label: 'Greet 3' },
  { clip: 'greet_03', label: 'Greet 4' }, { clip: 'greet_04', label: 'Greet 5' },
  { clip: 'nod_00', label: 'Nod' }, { clip: 'nod_01', label: 'Nod slow' },
  { clip: 'refuse_00', label: 'No' }, { clip: 'refuse_01', label: 'No way' },
  { clip: 'salute_00', label: 'Salute', hold: true }, { clip: 'salute_01', label: 'Salute 2' },
  { clip: 'wink_00', label: 'Wink' }, { clip: 'embar_00', label: 'Shy' }, { clip: 'embar_01', label: 'Shy 2' },
  { clip: 'reachout_00', label: 'Reach out' }, { clip: 'pathead_00', label: 'Pat head' }, { clip: 'offerhug_00', label: 'Open arms' },
  { clip: 'pose_00', label: 'Pose 1', hold: true }, { clip: 'pose_01', label: 'Pose 2', hold: true }, { clip: 'pose_02', label: 'Pose 3', hold: true },
  { clip: 'sit_00', label: 'Sit 1', hold: true }, { clip: 'sit_01', label: 'Sit 2', hold: true }, { clip: 'sit_02', label: 'Sit 3', hold: true },
  { clip: 'sit_03', label: 'Sit 4', hold: true }, { clip: 'sit_04', label: 'Sit 5', hold: true }, { clip: 'sit_05', label: 'Sit 6', hold: true },
  { clip: 'crouchidle_10', label: 'Crouch' }, { clip: 'lookdown_00', label: 'Look down', hold: true },
  { clip: 'idle_01', label: 'Idle 2' }, { clip: 'idle_11', label: 'Idle 3' },
]

export const emoteFor = (poseId: number): Emote | undefined => EMOTES[poseId - CLIP_BASE]

let pack: ClipPack | null = null
let loading: Promise<ClipPack | null> | null = null

export const getPack = () => pack

/** Starts loading the pack (once). Resolves to null if it cannot be fetched. */
export function loadPack(): Promise<ClipPack | null> {
  if (pack) return Promise.resolve(pack)
  if (loading) return loading
  loading = fetch('/anim/satomi.json')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((j) => {
      const nb = (j.bones as string[]).length
      const clips: Record<string, Clip> = {}
      for (const [name, c] of Object.entries<any>(j.clips)) {
        const bin = atob(c.q)
        const u8 = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i)
        const i16 = new Int16Array(u8.buffer)
        const q = new Float32Array(i16.length)
        for (let i = 0; i < i16.length; i++) q[i] = i16[i] / 32767
        const hips = new Float32Array(c.n * 3)
        for (let i = 0; i < c.n; i++) { hips[i * 3] = c.hips[i][0]; hips[i * 3 + 1] = c.hips[i][1]; hips[i * 3 + 2] = c.hips[i][2] }
        clips[name] = { name, dur: c.dur, fps: c.fps, n: c.n, q, hips }
        if (q.length !== c.n * nb * 4) console.warn('clip size mismatch', name)
      }
      pack = { bones: j.bones, hipHeight: j.hipHeight, clips }
      return pack
    })
    .catch((e) => { console.warn('animation pack unavailable', e); loading = null; return null })
  return loading
}
