// Cloudflare Workers host. One Durable Object ("Hub") holds every room in memory
// and keeps the game loop running while players are connected.
import { HubCore, originAllowed } from './hub.js'
import { parseOrigins } from './config.js'

export class Hub {
  constructor(state, env) {
    this.hub = new HubCore()
    this.origins = parseOrigins(env.ALLOWED_ORIGINS)
  }

  async fetch(request) {
    const url = new URL(request.url)
    if (request.headers.get('Upgrade') === 'websocket') {
      if (!originAllowed(request.headers.get('Origin'), this.origins)) return new Response('Forbidden', { status: 403 })
      const [client, server] = Object.values(new WebSocketPair())
      server.accept()
      const ip = request.headers.get('CF-Connecting-IP') ?? ''
      if (!this.hub.accept(server, ip)) server.close(1013, 'too many connections')
      return new Response(null, { status: 101, webSocket: client })
    }
    const r = this.hub.http(url.pathname)
    return new Response(JSON.stringify(r.body), {
      status: r.status,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    })
  }
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === '/' && request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Hanami Days multiplayer server is running.', { headers: { 'access-control-allow-origin': '*' } })
    }
    return env.HUB.get(env.HUB.idFromName('main')).fetch(request)
  },
}
