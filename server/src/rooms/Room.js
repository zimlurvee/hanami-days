import { DEFAULT_ENV, POSE_COUNT, PROPS, ROOM, WEATHERS, WORLD } from '../config.js'
import { randomId } from '../systems/code.js'
import { applyMove, resetToSpawn } from '../systems/movement.js'
import { WindowLimiter, clamp, cleanText, cleanWeather, cleanRoomSettings, isNum } from '../systems/validation.js'
import { RATE } from '../config.js'

const OPEN = 1

/** Send one message to one socket (skips sockets that are closed or badly backed up). */
function sendTo(conn, str, droppable = false) {
  const ws = conn?.ws
  if (!ws || ws.readyState !== OPEN) return
  if (droppable && ws.bufferedAmount > 64 * 1024) return
  ws.send(str)
}

/**
 * One multiplayer session: its players, settings, shared clock and chat.
 * All shared state is changed only here, after validation.
 */
export class Room {
  constructor(code, settings) {
    this.code = code
    this.id = randomId(4)
    this.settings = settings
    /** @type {Map<string, any>} */
    this.players = new Map()
    this.hostId = null
    this.locked = false
    this.bans = { tokens: new Set(), ips: new Set() }
    this.env = { hour0: DEFAULT_ENV.hour, at: Date.now(), weather: DEFAULT_ENV.weather, dayLength: DEFAULT_ENV.dayLength }
    this.chat = []
    /** Placed props: { id, kind, x, y, z, yaw, owner } */
    this.props = []
    this.dirty = false
    this.createdAt = Date.now()
  }

  // ---------------------------------------------------------------- info

  currentHour(now = Date.now()) {
    const { hour0, at, dayLength } = this.env
    if (!dayLength) return hour0
    return (hour0 + ((now - at) / 1000) * (24 / dayLength)) % 24
  }

  envState() {
    return { hour: +this.currentHour().toFixed(3), weather: this.env.weather, dayLength: this.env.dayLength }
  }

  count() {
    return this.players.size
  }

  info() {
    const s = this.settings
    return {
      code: this.code,
      name: s.name,
      description: s.description,
      mode: s.mode,
      maxPlayers: s.maxPlayers,
      count: this.players.size,
      isPublic: s.isPublic,
      locked: this.locked,
      hostId: this.hostId,
      hostName: this.players.get(this.hostId)?.name ?? '',
      npcs: s.npcs,
      propsAllowed: s.propsAllowed,
      vehiclesAllowed: s.vehiclesAllowed,
      temporary: true,
    }
  }

  playerView(p) {
    return { id: p.id, name: p.name, character: p.character, size: p.size, items: p.items, x: p.x, y: p.y, z: p.z, yaw: p.yaw }
  }

  // ------------------------------------------------------------- messaging

  broadcast(msg, exceptId = null, droppable = false) {
    const str = JSON.stringify(msg)
    for (const p of this.players.values()) {
      if (p.id === exceptId || !p.connected) continue
      sendTo(p.conn, str, droppable)
    }
  }

  send(p, msg) {
    sendTo(p.conn, JSON.stringify(msg))
  }

  system(text) {
    const m = { t: 'chat', id: null, name: '', text, ts: Date.now(), sys: true }
    this.pushChat(m)
    this.broadcast(m)
  }

  pushChat(m) {
    this.chat.push(m)
    if (this.chat.length > ROOM.chatHistory) this.chat.shift()
  }

  // --------------------------------------------------------------- joining

  /** Checks whether `conn` may join. Returns an error object or null. */
  canJoin(conn, token = null) {
    if (this.bans.ips.has(conn.ip) || (token && this.bans.tokens.has(token))) {
      return { code: 'BANNED', msg: 'You are banned from this room.' }
    }
    if (this.locked) return { code: 'ROOM_LOCKED', msg: 'This room is locked by the host.' }
    if (this.players.size >= this.settings.maxPlayers) {
      return { code: 'ROOM_FULL', msg: `This room is full (${this.settings.maxPlayers}/${this.settings.maxPlayers}).` }
    }
    return null
  }

  uniqueName(name) {
    const taken = new Set([...this.players.values()].map((p) => p.name.toLowerCase()))
    if (!taken.has(name.toLowerCase())) return name
    for (let i = 2; i < 100; i++) {
      const candidate = `${name.slice(0, 16)} (${i})`
      if (!taken.has(candidate.toLowerCase())) return candidate
    }
    return `${name.slice(0, 12)}-${randomId(2)}`
  }

  addPlayer(conn, { name, character, size, items = [] }) {
    const p = {
      id: randomId(4),
      token: randomId(12),
      ip: conn.ip,
      name: this.uniqueName(name),
      character,
      size,
      items,
      x: 0, y: 0, z: 0, yaw: 0, speed: 0, grounded: true, vy: 0,
      budget: 0,
      lastMoveAt: Date.now(),
      lastCorrectAt: 0,
      pose: 0,
      propLimiter: new WindowLimiter(8, 5000),
      connected: true,
      conn,
      graceUntil: 0,
      chatLimiter: new WindowLimiter(RATE.chatCount, RATE.chatWindowMs),
    }
    resetToSpawn(p)
    this.players.set(p.id, p)
    if (!this.hostId) this.hostId = p.id
    conn.player = p
    conn.room = this
    this.sendJoined(p)
    this.broadcast({ t: 'pjoin', p: this.playerView(p) }, p.id)
    this.broadcast({ t: 'room', room: this.info() }, p.id)
    this.system(`${p.name} joined`)
    this.dirty = true
    return p
  }

  sendJoined(p) {
    this.send(p, {
      t: 'joined',
      you: { id: p.id, token: p.token },
      room: this.info(),
      players: [...this.players.values()].filter((q) => q.connected).map((q) => this.playerView(q)),
      env: this.envState(),
      chat: this.chat,
      props: this.props,
    })
  }

  /** Re-attach a returning player (reconnect within the grace window). */
  reattach(p, conn) {
    p.conn = conn
    p.connected = true
    p.ip = conn.ip
    p.graceUntil = 0
    conn.player = p
    conn.room = this
    p.lastMoveAt = Date.now()
    this.sendJoined(p)
    this.broadcast({ t: 'pjoin', p: this.playerView(p) }, p.id)
    this.system(`${p.name} reconnected`)
    this.dirty = true
  }

  // --------------------------------------------------------------- leaving

  /** Socket dropped: hold the slot briefly so the player can reconnect. */
  markDisconnected(p) {
    if (!p.connected) return
    p.connected = false
    p.conn = null
    p.graceUntil = Date.now() + ROOM.reconnectGraceMs
    this.broadcast({ t: 'pleft', id: p.id, reason: 'disconnected' })
    this.dirty = true
  }

  removePlayer(id, reason = 'left') {
    const p = this.players.get(id)
    if (!p) return
    this.players.delete(id)
    if (p.conn) {
      p.conn.player = null
      p.conn.room = null
    }
    if (p.connected) this.broadcast({ t: 'pleft', id, reason })
    if (reason !== 'timeout') this.system(`${p.name} ${reason === 'kicked' ? 'was kicked' : reason === 'banned' ? 'was banned' : 'left'}`)
    if (this.props.some((q) => q.owner === id)) {
      this.props = this.props.filter((q) => q.owner !== id)
      this.broadcast({ t: 'props', props: this.props })
    }
    if (this.hostId === id) this.pickNewHost()
    this.broadcast({ t: 'room', room: this.info() })
    this.dirty = true
  }

  pickNewHost() {
    const next = [...this.players.values()].find((p) => p.connected) ?? [...this.players.values()][0]
    this.hostId = next ? next.id : null
    if (next) this.system(`${next.name} is now the host`)
  }

  /** Called regularly: drop players whose reconnect window has passed. */
  sweep(now = Date.now()) {
    for (const p of [...this.players.values()]) {
      if (!p.connected && p.graceUntil && now > p.graceUntil) this.removePlayer(p.id, 'timeout')
    }
  }

  isEmpty() {
    return this.players.size === 0
  }

  // ------------------------------------------------------- gameplay input

  handleMove(p, m) {
    const r = applyMove(p, m)
    if (r.ok) {
      p.pose = Number.isInteger(m.po) && m.po >= 0 && m.po < POSE_COUNT ? m.po : 0
      this.dirty = true
      return
    }
    // Rubber-band the client back, at most twice a second
    const now = Date.now()
    if (now - p.lastCorrectAt > 500) {
      p.lastCorrectAt = now
      this.send(p, { t: 'correct', x: p.x, y: p.y, z: p.z })
    }
  }

  handleRespawn(p) {
    resetToSpawn(p)
    this.send(p, { t: 'correct', x: p.x, y: p.y, z: p.z })
    this.dirty = true
  }

  /** Menu teleport (Area Move). Only bounds are checked; it is a game feature, not a cheat. */
  handleTeleport(p, m) {
    if (![m.x, m.y, m.z].every(isNum)) return
    if (Math.abs(m.x) > 199 || Math.abs(m.z) > 199 || m.y < -2 || m.y > 40) return
    const now = Date.now()
    if (p.lastTpAt && now - p.lastTpAt < 800) return
    p.lastTpAt = now
    p.x = m.x; p.y = m.y; p.z = m.z
    p.budget = 30
    p.lastMoveAt = now
    this.dirty = true
  }

  // ----------------------------------------------------------------- props

  handlePropAdd(p, m) {
    if (!this.settings.propsAllowed) {
      this.send(p, { t: 'err', code: 'PROPS_OFF', msg: 'The host turned props off in this room.' })
      return
    }
    if (!PROPS.kinds.includes(m.kind) || ![m.x, m.y, m.z, m.yaw].every(isNum)) return
    if (Math.abs(m.x) > WORLD.half || m.z < WORLD.zMin || m.z > WORLD.half || m.y < -2 || m.y > 30) return
    if (!p.propLimiter.allow()) return
    if (this.props.length >= PROPS.maxPerRoom) {
      this.send(p, { t: 'err', code: 'PROPS_FULL', msg: 'This room has too many props.' })
      return
    }
    if (this.props.filter((q) => q.owner === p.id).length >= PROPS.maxPerPlayer) {
      this.send(p, { t: 'err', code: 'PROPS_MINE', msg: `You can place up to ${PROPS.maxPerPlayer} props. Remove one first.` })
      return
    }
    const prop = { id: randomId(4), kind: m.kind, x: +m.x.toFixed(2), y: +m.y.toFixed(2), z: +m.z.toFixed(2), yaw: +m.yaw.toFixed(2), owner: p.id }
    this.props.push(prop)
    this.broadcast({ t: 'pa', prop })
  }

  /** The owner or the host can remove a prop. */
  handlePropDel(p, id) {
    const i = this.props.findIndex((q) => q.id === id)
    if (i < 0) return
    if (this.props[i].owner !== p.id && p.id !== this.hostId) return
    this.props.splice(i, 1)
    this.broadcast({ t: 'pd', id })
  }

  handlePropClear(p, all) {
    const mine = all && p.id === this.hostId ? () => true : (q) => q.owner === p.id
    this.props = this.props.filter((q) => !mine(q))
    this.broadcast({ t: 'props', props: this.props })
  }

  handleAppearance(p, character, size, items) {
    p.character = character
    p.size = size
    p.items = items
    this.broadcast({ t: 'papp', id: p.id, character, size, items })
  }

  handleChat(p, text) {
    const clean = cleanText(text, RATE.chatMax)
    if (!clean) return
    if (!p.chatLimiter.allow()) {
      this.send(p, { t: 'err', code: 'CHAT_RATE', msg: 'You are sending messages too fast.' })
      return
    }
    const m = { t: 'chat', id: p.id, name: p.name, text: clean, ts: Date.now() }
    this.pushChat(m)
    this.broadcast(m)
  }

  // ---------------------------------------------------------- host actions

  handleHost(p, msg) {
    if (p.id !== this.hostId) {
      this.send(p, { t: 'err', code: 'NOT_HOST', msg: 'Only the host can do that.' })
      return
    }
    switch (msg.a) {
      case 'kick':
      case 'ban': {
        const target = this.players.get(String(msg.id))
        if (!target || target.id === p.id) return
        const reason = msg.a === 'ban' ? 'banned' : 'kicked'
        if (msg.a === 'ban') {
          this.bans.tokens.add(target.token)
          this.bans.ips.add(target.ip)
        }
        if (target.conn) {
          this.send(target, { t: 'kicked', reason: msg.a === 'ban' ? 'You were banned by the host.' : 'You were kicked by the host.' })
          const c = target.conn
          this.removePlayer(target.id, reason)
          try { c.ws.close(4000, reason) } catch { /* already closed */ }
        } else {
          this.removePlayer(target.id, reason)
        }
        break
      }
      case 'lock':
        this.locked = !!msg.locked
        this.broadcast({ t: 'room', room: this.info() })
        this.system(this.locked ? 'The host locked the room' : 'The host unlocked the room')
        break
      case 'settings': {
        const next = cleanRoomSettings(msg.settings, this.settings)
        // Never shrink below the current headcount
        next.maxPlayers = Math.max(next.maxPlayers, this.players.size)
        this.settings = next
        this.broadcast({ t: 'room', room: this.info() })
        break
      }
      case 'env': {
        const now = Date.now()
        const hour = isNum(msg.hour) ? clamp(msg.hour, 0, 23.99) : this.currentHour(now)
        const dl = isNum(msg.dayLength) ? clamp(msg.dayLength, 0, 7200) : this.env.dayLength
        this.env = {
          hour0: hour,
          at: now,
          weather: cleanWeather(msg.weather) ?? this.env.weather,
          dayLength: dl > 0 && dl < 60 ? 60 : dl,
        }
        this.broadcast({ t: 'env', env: this.envState() })
        break
      }
      case 'reset':
        this.env = { hour0: DEFAULT_ENV.hour, at: Date.now(), weather: DEFAULT_ENV.weather, dayLength: DEFAULT_ENV.dayLength }
        this.broadcast({ t: 'env', env: this.envState() })
        this.system('The host reset the environment')
        break
      default:
        break
    }
  }

  // ------------------------------------------------------------------ tick

  /** Broadcast positions (only when something moved). Called ~15 times a second. */
  tick() {
    if (!this.dirty) return
    this.dirty = false
    const rows = []
    for (const p of this.players.values()) {
      if (!p.connected) continue
      rows.push([
        p.id,
        +p.x.toFixed(2),
        +p.y.toFixed(2),
        +p.z.toFixed(2),
        +p.yaw.toFixed(2),
        +p.speed.toFixed(1),
        p.grounded ? 1 : 0,
        +p.vy.toFixed(1),
        p.pose,
      ])
    }
    this.broadcast({ t: 's', p: rows }, null, true)
  }

  syncEnv() {
    this.broadcast({ t: 'env', env: this.envState() })
  }
}

export { WEATHERS }
