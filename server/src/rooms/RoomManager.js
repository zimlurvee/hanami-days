import { DEFAULT_ENV, ROOM } from '../config.js'
import { generateRoomCode, normalizeCode } from '../systems/code.js'
import { cleanRoomSettings } from '../systems/validation.js'
import { Room } from './Room.js'

const DEFAULT_SETTINGS = {
  name: 'Hanami Town',
  description: '',
  mode: 'free_roam',
  maxPlayers: ROOM.maxPlayersDefault,
  isPublic: true,
  npcs: true,
  propsAllowed: true,
  vehiclesAllowed: true,
}

/** Owns every live room: create, find by code, list public rooms, clean up. */
export class RoomManager {
  constructor() {
    /** @type {Map<string, Room>} code -> room */
    this.rooms = new Map()
  }

  create(input) {
    const settings = cleanRoomSettings(input, DEFAULT_SETTINGS)
    const code = generateRoomCode((c) => this.rooms.has(c))
    const room = new Room(code, settings)
    this.rooms.set(code, room)
    return room
  }

  find(code) {
    return this.rooms.get(normalizeCode(code)) ?? null
  }

  /** Public rooms, fullest joinable ones first. */
  listPublic() {
    return [...this.rooms.values()]
      .filter((r) => r.settings.isPublic && r.count() > 0)
      .map((r) => r.info())
      .sort((a, b) => Number(a.count >= a.maxPlayers) - Number(b.count >= b.maxPlayers) || b.count - a.count)
  }

  /** A public room with space, or null. */
  findQuick() {
    return (
      [...this.rooms.values()]
        .filter((r) => r.settings.isPublic && !r.locked && r.count() > 0 && r.count() < r.settings.maxPlayers)
        .sort((a, b) => b.count() - a.count())[0] ?? null
    )
  }

  tick() {
    for (const r of this.rooms.values()) r.tick()
  }

  syncEnv() {
    for (const r of this.rooms.values()) if (r.count() > 0) r.syncEnv()
  }

  /** Drop expired reconnect slots and delete rooms nobody is in (temporary rooms). */
  sweep() {
    const now = Date.now()
    for (const [code, r] of this.rooms) {
      r.sweep(now)
      if (r.isEmpty()) this.rooms.delete(code)
    }
  }

  stats() {
    let players = 0
    for (const r of this.rooms.values()) players += r.count()
    return { rooms: this.rooms.size, players }
  }
}

export { DEFAULT_ENV }
