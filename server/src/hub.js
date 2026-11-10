import { ALLOWED_ORIGINS, ENV_SYNC_MS, MAX_PAYLOAD, RATE, SWEEP_MS, TICK_HZ } from './config.js'
import { RoomManager } from './rooms/RoomManager.js'
import { dispatch, onClose } from './handlers/dispatch.js'
import { RateLimiter } from './systems/validation.js'

export function originAllowed(origin, list = ALLOWED_ORIGINS) {
  if (!origin) return true // non-browser clients (tests, curl)
  if (list.length === 0 || list.includes('*')) return true
  return list.includes(origin)
}

/**
 * Everything the server does, independent of where it runs. A host (Node `ws`
 * or a Cloudflare Durable Object) hands it each accepted socket; the socket only
 * needs send(), close(), readyState and addEventListener().
 */
export class HubCore {
  constructor() {
    this.mgr = new RoomManager()
    this.perIp = new Map()
    this.conns = new Set()
    this.timers = []
  }

  /** Start the game loop while someone is connected, stop it when the server is empty. */
  start() {
    if (this.timers.length) return
    this.timers = [
      setInterval(() => this.mgr.tick(), 1000 / TICK_HZ),
      setInterval(() => this.mgr.syncEnv(), ENV_SYNC_MS),
      setInterval(() => this.mgr.sweep(), SWEEP_MS),
    ]
  }
  stop() {
    this.timers.forEach(clearInterval)
    this.timers = []
  }

  /** Returns the connection object, or null if this IP already has too many. */
  accept(ws, ip = '') {
    if ((this.perIp.get(ip) ?? 0) >= RATE.maxConnectionsPerIp) return null
    this.perIp.set(ip, (this.perIp.get(ip) ?? 0) + 1)
    const conn = { ws, ip, room: null, player: null, limiter: new RateLimiter(RATE.msgPerSec, RATE.msgPerSec) }
    this.conns.add(conn)
    this.start()

    ws.addEventListener('message', (e) => {
      const data = e.data
      if (typeof data !== 'string' || data.length > MAX_PAYLOAD) return
      if (!conn.limiter.allow()) return
      let msg
      try { msg = JSON.parse(data) } catch { return }
      if (!msg || typeof msg.t !== 'string') return
      try { dispatch(this.mgr, conn, msg) } catch (err) { console.error('handler error', err) }
    })
    let closed = false
    const done = () => {
      if (closed) return
      closed = true
      const n = (this.perIp.get(ip) ?? 1) - 1
      if (n <= 0) this.perIp.delete(ip); else this.perIp.set(ip, n)
      this.conns.delete(conn)
      onClose(conn)
      if (this.conns.size === 0) this.stop()
    }
    ws.addEventListener('close', done)
    ws.addEventListener('error', done)
    return conn
  }

  /** Small JSON endpoints: /health, /rooms, /rooms/CODE. */
  http(pathname) {
    if (pathname === '/health') return { status: 200, body: { ok: true, ...this.mgr.stats() } }
    if (pathname === '/rooms') return { status: 200, body: { rooms: this.mgr.listPublic() } }
    const m = pathname.match(/^\/rooms\/([A-Za-z0-9]+)$/)
    if (m) {
      const r = this.mgr.find(m[1])
      return r ? { status: 200, body: r.info() } : { status: 404, body: { error: 'NO_ROOM' } }
    }
    return { status: 404, body: { error: 'NOT_FOUND' } }
  }
}
