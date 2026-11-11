import assert from 'node:assert/strict'
import { createServer } from '../src/index.js'

const srv = await createServer({ port: 0 })
const url = `ws://localhost:${srv.port}`

function client(label) {
  const ws = new WebSocket(url)
  const c = { ws, label, msgs: [], waiters: [] }
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data)
    c.msgs.push(m)
    c.waiters = c.waiters.filter((w) => !(w.t === m.t && (w.resolve(m), true)))
  }
  c.open = new Promise((r) => (ws.onopen = r))
  c.send = (m) => ws.send(JSON.stringify(m))
  c.next = (t, ms = 1500) => {
    const found = c.msgs.find((m) => m.t === t && !m._used)
    if (found) { found._used = true; return Promise.resolve(found) }
    return new Promise((resolve, reject) => {
      const to = setTimeout(() => reject(new Error(`${label}: timeout waiting for ${t}`)), ms)
      c.waiters.push({ t, resolve: (m) => { clearTimeout(to); m._used = true; resolve(m) } })
    })
  }
  return c
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let n = 0
const ok = (name) => console.log(`ok ${++n} - ${name}`)

// create
const a = client('A'); await a.open
a.send({ t: 'create', name: 'Alice', character: 'schoolgirl', size: 1, room: { name: 'Test', maxPlayers: 3, isPublic: true } })
const ja = await a.next('joined')
assert.equal(ja.room.code.length, 6); assert.equal(ja.room.hostId, ja.you.id)
ok('create room, creator is host')

// join by code (lowercase, with spaces)
const b = client('B'); await b.open
b.send({ t: 'join', code: ` ${ja.room.code.toLowerCase()} `, name: 'Alice', character: 'oc', size: 0.9 })
const jb = await b.next('joined')
assert.equal(jb.players.length, 2)
assert.notEqual(jb.players.find((p) => p.id === jb.you.id).name, 'Alice')
await a.next('pjoin'); ok('join by code, duplicate name made unique')

// bad code
const x = client('X'); await x.open
x.send({ t: 'join', code: 'ZZZZZZ', name: 'X' })
assert.equal((await x.next('err')).code, 'NO_ROOM'); ok('unknown code rejected')

// public list
x.send({ t: 'list' })
assert.equal((await x.next('rooms')).rooms.length, 1); ok('public list')

// full
const c = client('C'); await c.open
c.send({ t: 'join', code: ja.room.code, name: 'Carl' }); await c.next('joined')
x.send({ t: 'join', code: ja.room.code, name: 'X' })
assert.equal((await x.next('err')).code, 'ROOM_FULL'); ok('full room rejected')

// chat + html stripped
a.send({ t: 'chat', text: 'hello <b>there</b>' })
let real
do { real = await b.next('chat') } while (real.sys)
assert.ok(real.text.includes('hello')); assert.ok(!real.text.includes('<')); ok('chat delivered, html stripped')

// movement: valid then teleport
a.send({ t: 'move', x: -59, y: 0.5, z: -47, yaw: 1, sp: 3, g: 1, vy: 0 })
await sleep(150)
a.send({ t: 'move', x: 150, y: 0.5, z: 150, yaw: 1, sp: 3, g: 1, vy: 0 })
const fix = await a.next('correct'); assert.ok(fix.x < 0)
ok('teleport rejected with correction')
const st = await b.next('s'); assert.ok(Array.isArray(st.p)); ok('state snapshots broadcast')

// non-host cannot kick
b.send({ t: 'host', a: 'kick', id: ja.you.id })
assert.equal((await b.next('err')).code, 'NOT_HOST'); ok('non-host blocked')

// env
a.send({ t: 'host', a: 'env', hour: 22, weather: 'rainy' })
const env = await b.next('env'); assert.equal(env.env.weather, 'rainy'); assert.ok(Math.abs(env.env.hour - 22) < 0.1)
ok('host env change broadcast')

// lock
a.send({ t: 'host', a: 'kick', id: c.msgs.find((m) => m.t === 'joined').you.id })
await c.next('kicked'); ok('kick')
a.send({ t: 'host', a: 'lock', locked: true }); await sleep(100)
const d = client('D'); await d.open
d.send({ t: 'join', code: ja.room.code, name: 'Dan' })
assert.equal((await d.next('err')).code, 'ROOM_LOCKED'); ok('locked room')
a.send({ t: 'host', a: 'lock', locked: false })

// reconnect
const tokenB = jb.you.token, idB = jb.you.id
b.ws.close(); await sleep(150)
const b2 = client('B2'); await b2.open
b2.send({ t: 'rejoin', code: ja.room.code, token: tokenB })
const rj = await b2.next('joined'); assert.equal(rj.you.id, idB); ok('reconnect keeps identity')

// ban
a.send({ t: 'host', a: 'ban', id: idB }); await b2.next('kicked'); await sleep(100)
const b3 = client('B3'); await b3.open
b3.send({ t: 'join', code: ja.room.code, name: 'Back', token: tokenB })
assert.equal((await b3.next('err')).code, 'BANNED'); ok('ban blocks rejoin')

// host transfer + cleanup
a.send({ t: 'leave' }); await sleep(150)
assert.equal(srv.mgr.stats().rooms, 0); ok('room deleted when empty')

// chat rate limit
const e = client('E'); await e.open
e.send({ t: 'quick', name: 'Eve' }); await e.next('joined')
for (let i = 0; i < 12; i++) e.send({ t: 'chat', text: 'spam ' + i })
assert.equal((await e.next('err')).code, 'CHAT_RATE'); ok('chat rate limited')

// menu teleport is allowed (unlike a move-hack)
const f = client('F'); await f.open
f.send({ t: 'quick', name: 'Fay' }); await f.next('joined')
f.send({ t: 'tp', x: 150, y: 0.5, z: 0 }); await sleep(100)
f.send({ t: 'move', x: 150.5, y: 0.5, z: 0, yaw: 0, sp: 1, g: 1, vy: 0 }); await sleep(100)
assert.ok(!f.msgs.some((m) => m.t === 'correct')); ok('teleport accepted, next move not rejected')

// props + pose
const g = client('G'); await g.open
g.send({ t: 'create', name: 'Gus', room: { name: 'Props', isPublic: false } }); const jg = await g.next('joined')
const g2 = client('G2'); await g2.open
g2.send({ t: 'join', code: jg.room.code, name: 'Gia' }); const jg2 = await g2.next('joined')
assert.deepEqual(jg2.props, [])
g.send({ t: 'prop', kind: 'chair', x: -58, y: 0.05, z: -46, yaw: 1 })
const pa = await g2.next('pa'); assert.equal(pa.prop.kind, 'chair'); ok('prop placed and synced')
g.send({ t: 'prop', kind: 'dragon', x: 0, y: 0, z: 0, yaw: 0 }); await sleep(80)
g.send({ t: 'prop', kind: 'box', x: 9999, y: 0, z: 0, yaw: 0 }); await sleep(80)
assert.equal(srv.mgr.find(jg.room.code).props.length, 1); ok('bad props rejected')
g2.send({ t: 'propdel', id: pa.prop.id }); await sleep(80)
assert.equal(srv.mgr.find(jg.room.code).props.length, 1); ok('non-owner cannot delete')
g.send({ t: 'propdel', id: pa.prop.id }); await g2.next('pd'); ok('owner deletes prop')
for (let i = 0; i < 8; i++) { g.send({ t: 'prop', kind: 'ball', x: i, y: 0, z: 0, yaw: 0 }); await sleep(30) }
await sleep(100)
assert.ok(srv.mgr.find(jg.room.code).props.length <= 8); ok('prop rate limited')
g.send({ t: 'move', x: jg.players[0].x, y: jg.players[0].y, z: jg.players[0].z, yaw: 0, sp: 0, g: 1, vy: 0, po: 3 })
await sleep(120)
srv.mgr.find(jg.room.code).tick()
const snap = [...g2.msgs].reverse().find((m) => m.t === 's' && m.p.some((r) => r[0] === jg.you.id))
assert.equal(snap.p.find((r) => r[0] === jg.you.id)[8], 3); ok('pose synced in snapshots')
g.send({ t: 'leave' }); await sleep(100)
assert.equal(srv.mgr.find(jg.room.code).props.length, 0); ok('props removed when owner leaves')

// accessories
g2.send({ t: 'appearance', character: 'oc', size: 1, items: ['cap', 'bag', 'laser', 'cap'] })
const pap = await g2.next('papp'); assert.deepEqual(pap.items, ['cap', 'bag']); ok('items validated and synced')

// health
const h = await (await fetch(`http://localhost:${srv.port}/health`)).json()
assert.equal(h.ok, true); ok('health endpoint')

console.log('ALL PASSED'); await srv.close(); process.exit(0)
