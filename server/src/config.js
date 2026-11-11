// Tunable limits. Everything the server enforces lives here so it is easy to audit.

// `process` does not exist on every host (Cloudflare Workers), so guard it.
const ENV = typeof process !== 'undefined' && process.env ? process.env : {}

export const PORT = Number(ENV.PORT) || 8080
/** Comma separated list of allowed browser origins. Empty = allow any (fine for development). */
export const parseOrigins = (v) =>
  String(v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
export const ALLOWED_ORIGINS = parseOrigins(ENV.ALLOWED_ORIGINS)

export const CHARACTERS = ['student', 'schoolgirl', 'oc']
export const MODES = ['school_rp', 'free_roam', 'social', 'sandbox', 'private']
export const WEATHERS = ['sunny', 'cloudy', 'rainy']

export const ROOM = {
  maxPlayersMin: 2,
  maxPlayersMax: 16,
  maxPlayersDefault: 12,
  nameMax: 32,
  descriptionMax: 140,
  /** Seconds a dropped player's slot is held so they can reconnect. */
  reconnectGraceMs: 30_000,
  chatHistory: 30,
}

export const PROPS = {
  kinds: ['chair', 'table', 'bench', 'box', 'ball', 'plant', 'cake', 'parasol'],
  maxPerRoom: 60,
  maxPerPlayer: 10,
}
/** Pose ids sent by clients: 0 = none, 1 wave, 2 cheer, 3 sit, 4 bow. */
export const POSE_COUNT = 5

export const ITEMS = ['cap', 'glasses', 'bag', 'ribbon', 'headphones']
export const MAX_ITEMS = 4

export const PLAYER = { nameMax: 20, sizeMin: 0.7, sizeMax: 1.3 }

export const WORLD = {
  half: 199,
  spawn: { x: -60, y: 0.5, z: -47 },
}

export const MOVEMENT = {
  /** Allowed average horizontal speed (m/s). Running is 6.6, so this leaves headroom. */
  maxHSpeed: 9,
  /** Distance "bank" (m) so bursts after lag are not mistaken for teleporting. */
  maxBudget: 30,
  /** Vertical allowance per second, covers falling off the school roof. */
  maxVSpeed: 60,
}

export const RATE = {
  /** Messages per second allowed from one connection (movement is ~15/s). */
  msgPerSec: 40,
  chatCount: 6,
  chatWindowMs: 8000,
  chatMax: 200,
  maxConnectionsPerIp: 10,
}

export const TICK_HZ = 15
export const ENV_SYNC_MS = 5000
export const SWEEP_MS = 5000
export const DEFAULT_ENV = { hour: 10, weather: 'sunny', dayLength: 600 }
export const MAX_PAYLOAD = 4096
