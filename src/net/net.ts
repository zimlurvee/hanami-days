import { create } from 'zustand'
import { useApp } from '@/stores/appStore'
import { useWorld, type Weather } from '@/stores/worldStore'
import { useCharacter } from '@/stores/characterStore'
import { runtime } from '@/game/runtime'
import { useProps, type Prop, type PropKind } from '@/stores/propsStore'

export interface RoomInfo {
  code: string
  name: string
  description: string
  mode: string
  maxPlayers: number
  count: number
  isPublic: boolean
  locked: boolean
  hostId: string | null
  hostName: string
  npcs: boolean
  propsAllowed: boolean
  vehiclesAllowed: boolean
}

export interface ChatMsg {
  id: string | null
  name: string
  text: string
  ts: number
  sys?: boolean
}

export interface PlayerInfo {
  id: string
  name: string
  character: string
  size: number
}

/** Live position data of another player. Mutated by the network, read every frame by the renderer. */
export interface Remote extends PlayerInfo {
  x: number; y: number; z: number; yaw: number
  speed: number; grounded: boolean; vy: number; pose: number
  /** Smoothed values actually drawn. */
  dx: number; dy: number; dz: number; dyaw: number
  seen: boolean
}

export const remotes = new Map<string, Remote>()
/** A server-ordered teleport (rejected move, respawn). The player controller consumes it. */
export const pending = { correct: null as null | { x: number; y: number; z: number } }

export type NetStatus = 'idle' | 'connecting' | 'online' | 'reconnecting'

interface NetState {
  status: NetStatus
  serverUrl: string
  room: RoomInfo | null
  meId: string | null
  /** Ids of the other players (positions live in `remotes`). Changes only on join / leave. */
  playerIds: string[]
  names: Record<string, PlayerInfo>
  chat: ChatMsg[]
  rooms: RoomInfo[]
  roomsLoading: boolean
  error: string | null
  setServerUrl: (u: string) => void
}

const ENV_URL = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? ''
const LS_KEY = 'hanami.serverUrl'
const DEFAULT_URL = ENV_URL || (import.meta.env.DEV ? 'ws://localhost:8080' : '')

function loadUrl(): string {
  try { return localStorage.getItem(LS_KEY) || DEFAULT_URL } catch { return DEFAULT_URL }
}

export const useNet = create<NetState>((set) => ({
  status: 'idle',
  serverUrl: loadUrl(),
  room: null,
  meId: null,
  playerIds: [],
  names: {},
  chat: [],
  rooms: [],
  roomsLoading: false,
  error: null,
  setServerUrl: (u) => {
    try { localStorage.setItem(LS_KEY, u) } catch { /* private mode */ }
    set({ serverUrl: u })
  },
}))

export const isOnline = () => useNet.getState().room !== null

export function normalizeUrl(u: string): string {
  let s = u.trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) s = s.replace(/^http/i, 'ws')
  if (!/^wss?:\/\//i.test(s)) s = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${s}`
  return s.replace(/\/+$/, '')
}

// ------------------------------------------------------------------ socket

let ws: WebSocket | null = null
let session: { code: string; token: string } | null = null
let intentional = false
let reconnectTimer: number | undefined
let reconnectDeadline = 0
let pingTimer: number | undefined
/** Called once the next `joined` arrives (resolves connect+join promises). */
let onFirstReply: ((m: any) => void) | null = null

const send = (m: object) => {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(m))
}

function profile() {
  const c = useCharacter.getState()
  return { name: loadName(), character: c.model, size: c.size }
}

export function loadName(): string {
  try { return localStorage.getItem('hanami.name') || 'Guest' } catch { return 'Guest' }
}
export function saveName(n: string) {
  try { localStorage.setItem('hanami.name', n) } catch { /* private mode */ }
}

function open(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false
    let sock: WebSocket
    try { sock = new WebSocket(url) } catch { reject(new Error('That server address is not valid.')); return }
    ws = sock
    const timeout = window.setTimeout(() => {
      if (!settled) { settled = true; try { sock.close() } catch { /* */ } reject(new Error('The server did not answer. It may be waking up (free hosts sleep) — try again in a minute.')) }
    }, 20000)
    sock.onopen = () => { settled = true; window.clearTimeout(timeout); resolve() }
    sock.onerror = () => { if (!settled) { settled = true; window.clearTimeout(timeout); reject(new Error('Could not reach the multiplayer server.')) } }
    sock.onmessage = (e) => { try { handle(JSON.parse(e.data)) } catch { /* ignore */ } }
    sock.onclose = () => { if (ws === sock) onClosed() }
    window.clearInterval(pingTimer)
    pingTimer = window.setInterval(() => send({ t: 'ping' }), 25000)
  })
}

function onClosed() {
  ws = null
  window.clearInterval(pingTimer)
  if (intentional || !session || !isOnline()) return
  // Unexpected drop while in a room: try to take our slot back (server holds it 30 s)
  useNet.setState({ status: 'reconnecting' })
  reconnectDeadline = Date.now() + 28000
  tryReconnect()
}

function tryReconnect() {
  window.clearTimeout(reconnectTimer)
  if (!session || intentional) return
  if (Date.now() > reconnectDeadline) { fullLeave('Connection lost. You were disconnected from the room.', 'menu'); return }
  open(useNet.getState().serverUrl)
    .then(() => send({ t: 'rejoin', code: session!.code, token: session!.token }))
    .catch(() => { reconnectTimer = window.setTimeout(tryReconnect, 2000) })
}

function reset() {
  remotes.clear()
  pending.correct = null
  useProps.getState().set([])
  useNet.setState({ room: null, meId: null, playerIds: [], names: {}, chat: [], status: 'idle' })
}

/** Leave the room locally (and tell the server). */
function fullLeave(message: string | null, to: 'menu' | 'multiplayer' | null) {
  intentional = true
  window.clearTimeout(reconnectTimer)
  session = null
  try { send({ t: 'leave' }); ws?.close() } catch { /* */ }
  ws = null
  reset()
  if (message) useApp.getState().showToast(message)
  if (to) useApp.getState().go(to)
}

export function leaveRoom() { fullLeave(null, null) }

function applyEnv(env: { hour: number; weather: Weather; dayLength: number }) {
  useWorld.setState({ hour: env.hour, weather: env.weather, dayLengthSeconds: env.dayLength })
}

function addRemote(p: any) {
  const me = useNet.getState().meId
  if (p.id === me) return
  const ex = remotes.get(p.id)
  if (ex) { ex.name = p.name; ex.character = p.character; ex.size = p.size }
  else {
    remotes.set(p.id, {
      id: p.id, name: p.name, character: p.character, size: p.size,
      x: p.x, y: p.y, z: p.z, yaw: p.yaw, speed: 0, grounded: true, vy: 0, pose: 0,
      dx: p.x, dy: p.y, dz: p.z, dyaw: p.yaw, seen: false,
    })
  }
  syncIds()
}

function syncIds() {
  const names: Record<string, PlayerInfo> = {}
  for (const r of remotes.values()) names[r.id] = { id: r.id, name: r.name, character: r.character, size: r.size }
  useNet.setState({ playerIds: [...remotes.keys()], names })
}

function handle(m: any) {
  switch (m.t) {
    case 'joined': {
      session = { code: m.room.code, token: m.you.token }
      intentional = false
      remotes.clear()
      useNet.setState({ meId: m.you.id, room: m.room, chat: m.chat ?? [], status: 'online', error: null })
      for (const p of m.players) addRemote(p)
      applyEnv(m.env)
      useProps.getState().set(m.props ?? [])
      const app = useApp.getState()
      if (app.screen !== 'playing') app.go('playing')
      onFirstReply?.(m); onFirstReply = null
      return
    }
    case 'err':
      if (m.code === 'REJOIN_FAILED') { fullLeave(m.msg, 'menu'); return }
      if (m.code === 'CHAT_RATE' || m.code === 'NOT_HOST') { useApp.getState().showToast(m.msg); return }
      useNet.setState({ error: m.msg })
      onFirstReply?.(m); onFirstReply = null
      return
    case 'rooms': useNet.setState({ rooms: m.rooms, roomsLoading: false }); return
    case 'room': useNet.setState({ room: m.room }); return
    case 'pjoin': addRemote(m.p); return
    case 'pleft': remotes.delete(m.id); syncIds(); return
    case 'papp': {
      const r = remotes.get(m.id)
      if (r) { r.character = m.character; r.size = m.size; syncIds() }
      return
    }
    case 's': {
      const me = useNet.getState().meId
      for (const row of m.p) {
        if (row[0] === me) continue
        const r = remotes.get(row[0])
        if (!r) continue
        r.x = row[1]; r.y = row[2]; r.z = row[3]; r.yaw = row[4]; r.speed = row[5]; r.grounded = row[6] === 1; r.vy = row[7]; r.pose = row[8] ?? 0
        if (!r.seen) { r.dx = r.x; r.dy = r.y; r.dz = r.z; r.dyaw = r.yaw; r.seen = true }
      }
      return
    }
    case 'chat': {
      const chat = [...useNet.getState().chat, m as ChatMsg].slice(-60)
      useNet.setState({ chat })
      return
    }
    case 'env': applyEnv(m.env); return
    case 'pa': useProps.getState().add(m.prop as Prop); return
    case 'pd': useProps.getState().remove(m.id); return
    case 'props': useProps.getState().set(m.props); return
    case 'correct': pending.correct = { x: m.x, y: m.y, z: m.z }; return
    case 'kicked': fullLeave(m.reason, 'multiplayer'); return
    default: return
  }
}

// -------------------------------------------------------------- public API

async function ensureConnected(): Promise<string | null> {
  const url = normalizeUrl(useNet.getState().serverUrl)
  if (!url) return 'No server address set. Open "Server settings" and paste your server address.'
  if (ws && ws.readyState === 1) return null
  try { await open(url); return null } catch (e) { return (e as Error).message }
}

/** Connect, send a joining message and wait for the answer. */
async function enter(msg: object): Promise<void> {
  useNet.setState({ status: 'connecting', error: null })
  const err = await ensureConnected()
  if (err) { useNet.setState({ status: 'idle', error: err }); return }
  intentional = false
  await new Promise<void>((resolve) => {
    onFirstReply = () => resolve()
    send({ ...profile(), ...msg })
    window.setTimeout(() => { if (onFirstReply) { onFirstReply = null; useNet.setState({ error: 'No reply from the server.' }); resolve() } }, 12000)
  })
  if (!isOnline()) useNet.setState({ status: 'idle' })
}

export const quickJoin = () => enter({ t: 'quick' })
export const createRoom = (room: Partial<RoomInfo>) => enter({ t: 'create', room })
export const joinRoom = (code: string) => enter({ t: 'join', code })

export async function fetchRooms() {
  useNet.setState({ roomsLoading: true, error: null })
  const err = await ensureConnected()
  if (err) { useNet.setState({ roomsLoading: false, error: err }); return }
  send({ t: 'list' })
}

export const sendProp = (kind: PropKind, x: number, y: number, z: number, yaw: number) => send({ t: 'prop', kind, x, y, z, yaw })
export const sendPropDel = (id: string) => send({ t: 'propdel', id })
export const sendPropClear = (all: boolean) => send({ t: 'propclear', all })
export const sendChat = (text: string) => send({ t: 'chat', text })
export const sendRespawn = () => send({ t: 'respawn' })

/** Menu teleport (Area Move): move locally and tell the server the jump is allowed. */
export function teleportTo(x: number, y: number, z: number) {
  pending.correct = { x, y, z }
  runtime.player.x = x; runtime.player.y = y; runtime.player.z = z
  send({ t: 'tp', x, y, z })
}
export const sendAppearance = () => {
  const c = useCharacter.getState()
  send({ t: 'appearance', character: c.model, size: c.size })
}
export const hostAction = (a: string, extra: object = {}) => send({ t: 'host', a, ...extra })

let lastSend = 0
let lastKey = ''
/** 10 updates a second while moving; a heartbeat once a second when standing still (keeps free hosting quotas small). */
export function sendMove(now: number) {
  const p = runtime.player
  const x = +p.x.toFixed(2), y = +p.y.toFixed(2), z = +p.z.toFixed(2), yaw = +p.yaw.toFixed(2), sp = +p.speed.toFixed(1)
  const key = `${x},${y},${z},${yaw},${sp},${p.grounded},${runtime.pose}`
  if (now - lastSend < 100) return
  if (key === lastKey && now - lastSend < 1000) return
  lastSend = now
  lastKey = key
  send({ t: 'move', x, y, z, yaw, sp, g: p.grounded ? 1 : 0, vy: 0, po: runtime.pose })
}

export function inviteLink(code: string) {
  return `${location.origin}${location.pathname}?room=${code}`
}

// Tell others when we change character / size while online
useCharacter.subscribe((s, prev) => {
  if (isOnline() && (s.model !== prev.model || s.size !== prev.size)) sendAppearance()
})
