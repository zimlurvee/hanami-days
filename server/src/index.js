import http from 'node:http'
import { WebSocketServer } from 'ws'
import { ALLOWED_ORIGINS, MAX_PAYLOAD, PORT, RATE, SWEEP_MS, TICK_HZ, ENV_SYNC_MS } from './config.js'
import { RoomManager } from './rooms/RoomManager.js'
import { dispatch, onClose } from './handlers/dispatch.js'
import { RateLimiter } from './systems/validation.js'

export function originAllowed(origin) {
  if (!origin) return true // non-browser clients (tests, curl)
  if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes('*')) return true
  return ALLOWED_ORIGINS.includes(origin)
}

export function createServer({ port = PORT } = {}) {
  const mgr = new RoomManager()
  const perIp = new Map()

  const cors = (req, res) => {
    const origin = req.headers.origin
    if (origin && originAllowed(origin)) res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }

  const server = http.createServer((req, res) => {
    cors(req, res)
    const url = new URL(req.url ?? '/', 'http://x')
    const json = (code, body) => {
      res.writeHead(code, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(body))
    }
    if (url.pathname === '/health') return json(200, { ok: true, ...mgr.stats() })
    if (url.pathname === '/rooms') return json(200, { rooms: mgr.listPublic() })
    const m = url.pathname.match(/^\/rooms\/([A-Za-z0-9]+)$/)
    if (m) {
      const r = mgr.find(m[1])
      return r ? json(200, r.info()) : json(404, { error: 'NO_ROOM' })
    }
    json(404, { error: 'NOT_FOUND' })
  })

  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD })

  server.on('upgrade', (req, socket, head) => {
    const ip = (req.headers['x-forwarded-for']?.toString().split(',')[0] ?? req.socket.remoteAddress ?? '').trim()
    if (!originAllowed(req.headers.origin)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
      return socket.destroy()
    }
    if ((perIp.get(ip) ?? 0) >= RATE.maxConnectionsPerIp) {
      socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n')
      return socket.destroy()
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      perIp.set(ip, (perIp.get(ip) ?? 0) + 1)
      const conn = { ws, ip, room: null, player: null, limiter: new RateLimiter(RATE.msgPerSec, RATE.msgPerSec), alive: true }
      ws.on('pong', () => { conn.alive = true })
      ws.on('message', (data, isBinary) => {
        if (isBinary) return
        if (!conn.limiter.allow()) return
        let msg
        try { msg = JSON.parse(data.toString()) } catch { return }
        if (!msg || typeof msg.t !== 'string') return
        try { dispatch(mgr, conn, msg) } catch (e) { console.error('handler error', e) }
      })
      ws.on('close', () => {
        const n = (perIp.get(ip) ?? 1) - 1
        if (n <= 0) perIp.delete(ip); else perIp.set(ip, n)
        onClose(conn)
      })
      ws.on('error', () => {})
      conn.ws.conn = conn
    })
  })

  const timers = [
    setInterval(() => mgr.tick(), 1000 / TICK_HZ),
    setInterval(() => mgr.syncEnv(), ENV_SYNC_MS),
    setInterval(() => {
      mgr.sweep()
      for (const ws of wss.clients) {
        const c = ws.conn
        if (c && !c.alive) { ws.terminate(); continue }
        if (c) c.alive = false
        try { ws.ping() } catch { /* closing */ }
      }
    }, SWEEP_MS),
  ]

  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve({
        mgr,
        port: server.address().port,
        close: () => new Promise((done) => {
          timers.forEach(clearInterval)
          for (const ws of wss.clients) ws.terminate()
          server.close(() => done())
        }),
      })
    })
  })
}

import { fileURLToPath } from 'node:url'
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer().then((s) => console.log(`Hanami Days server listening on :${s.port}`))
}
