import { ITEMS, MAX_ITEMS, CHARACTERS, MODES, PLAYER, ROOM, WEATHERS } from '../config.js'

/** Remove control characters and collapse whitespace. */
export function cleanText(value, max) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

export function cleanName(value, fallback = 'Guest') {
  return cleanText(value, PLAYER.nameMax) || fallback
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
export const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

export function cleanCharacter(value) {
  return CHARACTERS.includes(value) ? value : 'student'
}

export function cleanSize(value) {
  return isNum(value) ? clamp(value, PLAYER.sizeMin, PLAYER.sizeMax) : 1
}

export function cleanWeather(value) {
  return WEATHERS.includes(value) ? value : null
}

/** Room settings from untrusted input. Missing fields fall back to `base`. */
export function cleanRoomSettings(input, base) {
  const out = { ...base }
  if (!input || typeof input !== 'object') return out
  if (input.name !== undefined) out.name = cleanText(input.name, ROOM.nameMax) || base.name
  if (input.description !== undefined) out.description = cleanText(input.description, ROOM.descriptionMax)
  if (MODES.includes(input.mode)) out.mode = input.mode
  if (isNum(input.maxPlayers)) out.maxPlayers = clamp(Math.round(input.maxPlayers), ROOM.maxPlayersMin, ROOM.maxPlayersMax)
  if (typeof input.isPublic === 'boolean') out.isPublic = input.isPublic
  for (const k of ['npcs', 'propsAllowed', 'vehiclesAllowed']) {
    if (typeof input[k] === 'boolean') out[k] = input[k]
  }
  return out
}

/** Token bucket: allows `rate` events per second with a small burst. */
export class RateLimiter {
  constructor(ratePerSec, burst = ratePerSec) {
    this.rate = ratePerSec
    this.burst = burst
    this.tokens = burst
    this.last = Date.now()
  }
  allow(now = Date.now()) {
    this.tokens = Math.min(this.burst, this.tokens + ((now - this.last) / 1000) * this.rate)
    this.last = now
    if (this.tokens >= 1) {
      this.tokens -= 1
      return true
    }
    return false
  }
}

/** Sliding window: at most `count` events within `windowMs`. */
export class WindowLimiter {
  constructor(count, windowMs) {
    this.count = count
    this.windowMs = windowMs
    this.times = []
  }
  allow(now = Date.now()) {
    this.times = this.times.filter((t) => now - t < this.windowMs)
    if (this.times.length >= this.count) return false
    this.times.push(now)
    return true
  }
}

/** Keep only known accessory ids, no duplicates. */
export function cleanItems(v) {
  if (!Array.isArray(v)) return []
  return [...new Set(v.filter((x) => typeof x === 'string' && ITEMS.includes(x)))].slice(0, MAX_ITEMS)
}
