import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'
import { MAX_PAYLOAD, PORT, RATE, SWEEP_MS } from './config.js'
import { HubCore, originAllowed } from './hub.js'

export { originAllowed }

/** Node host: plain http + ws. Used by `npm start`, the tests, and any VPS. */
export function createServer({ port = PORT } = {}) {
  const hub = new HubCore()
  const mgr = hub.mgr

  const server = http.createServer((req, res) => {
    const origin = req.headers.origin
    if (origin && originAllowed(origin)) res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
    const r = hub.http(new URL(req.url ?? '/', 'http://x').pathname)
    res.writeHead(r.status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(r.body))
  })

  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD })
  server.on('upgrade', (req, socket, head) => {
    const ip = (req.headers['x-forwarded-for']?.toString().split(',')[0] ?? req.socket.remoteAddress ?? '').trim()
    if (!originAllowed(req.headers.origin)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
      return socket.destroy()
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      const conn = hub.accept(ws, ip)
      if (!conn) return ws.close(1013, 'too many connections')
      ws.alive = true
      ws.on('pong', () => { ws.alive = true })
    })
  })

  // Drop sockets that stopped answering pings
  const sweep = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.alive === false) { ws.terminate(); continue }
      ws.alive = false
      try { ws.ping() } catch { /* closing */ }
    }
  }, SWEEP_MS)

  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve({
        mgr,
        port: server.address().port,
        close: () => new Promise((done) => {
          clearInterval(sweep)
          hub.stop()
          for (const ws of wss.clients) ws.terminate()
          server.close(() => done())
        }),
      })
    })
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer().then((s) => console.log(`Hanami Days server listening on :${s.port}`))
}
export { RATE }
