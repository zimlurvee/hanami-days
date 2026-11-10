import { PLAYER } from '../config.js'
import { cleanCharacter, cleanName, cleanSize } from '../systems/validation.js'
import { normalizeCode } from '../systems/code.js'

const err = (conn, code, msg) => {
  if (conn.ws.readyState === 1) conn.ws.send(JSON.stringify({ t: 'err', code, msg }))
}

function profile(msg) {
  return {
    name: cleanName(msg.name) || 'Guest',
    character: cleanCharacter(msg.character),
    size: cleanSize(msg.size),
  }
}

/** Remove the connection from whatever room it is in (clean leave). */
function leave(conn, mgr) {
  const room = conn.room
  if (room && conn.player) room.removePlayer(conn.player.id, 'left')
  if (room && room.isEmpty()) mgr.rooms.delete(room.code)
  conn.room = null
  conn.player = null
}

function join(mgr, conn, room, msg) {
  const e = room.canJoin(conn, msg.token)
  if (e) return err(conn, e.code, e.msg)
  leave(conn, mgr)
  room.addPlayer(conn, profile(msg))
}

/** Handle one parsed client message. `mgr` is the RoomManager. */
export function dispatch(mgr, conn, msg) {
  switch (msg.t) {
    case 'ping':
      conn.ws.send('{"t":"pong"}')
      return
    case 'list':
      conn.ws.send(JSON.stringify({ t: 'rooms', rooms: mgr.listPublic() }))
      return
    case 'create': {
      const room = mgr.create(msg.room ?? {})
      join(mgr, conn, room, msg)
      return
    }
    case 'join': {
      const room = mgr.find(msg.code)
      if (!room) return err(conn, 'NO_ROOM', `No room with code ${normalizeCode(msg.code) || '?'}.`)
      join(mgr, conn, room, msg)
      return
    }
    case 'quick': {
      const room = mgr.findQuick() ?? mgr.create({ name: 'Hanami Town', isPublic: true })
      join(mgr, conn, room, msg)
      return
    }
    case 'rejoin': {
      const room = mgr.find(msg.code)
      const p = room && [...room.players.values()].find((q) => q.token === msg.token)
      if (!room || !p) return err(conn, 'REJOIN_FAILED', 'Your session expired. Please join again.')
      if (p.connected && p.conn && p.conn !== conn) {
        try { p.conn.ws.close(4001, 'replaced') } catch { /* gone */ }
        p.conn.player = null
        p.conn.room = null
      }
      room.reattach(p, conn)
      return
    }
  }

  // Everything below needs to be inside a room
  const { room, player } = conn
  if (!room || !player) return err(conn, 'NOT_IN_ROOM', 'You are not in a room.')
  switch (msg.t) {
    case 'move': room.handleMove(player, msg); break
    case 'chat': room.handleChat(player, msg.text); break
    case 'appearance': room.handleAppearance(player, cleanCharacter(msg.character), cleanSize(msg.size)); break
    case 'respawn': room.handleRespawn(player); break
    case 'tp': room.handleTeleport(player, msg); break
    case 'host': room.handleHost(player, msg); break
    case 'leave': leave(conn, mgr); conn.ws.send('{"t":"left"}'); break
    default: break
  }
}

/** Socket closed. */
export function onClose(conn) {
  const { room, player } = conn
  if (room && player && player.conn === conn) room.markDisconnected(player)
  conn.room = null
  conn.player = null
}

export { PLAYER }
