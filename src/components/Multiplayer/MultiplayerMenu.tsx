import { useEffect, useState } from 'react'
import { useApp } from '@/stores/appStore'
import {
  createRoom, fetchRooms, joinRoom, loadName, normalizeUrl, quickJoin, saveName, useNet,
  type RoomInfo,
} from '@/net/net'

const MODES = [
  { id: 'free_roam', label: 'Free Roam' },
  { id: 'school_rp', label: 'School RP' },
  { id: 'social', label: 'Social' },
  { id: 'sandbox', label: 'Sandbox' },
]
const modeLabel = (id: string) => MODES.find((m) => m.id === id)?.label ?? id

type Tab = 'quick' | 'create' | 'code' | 'public'

export function MultiplayerMenu({ initialCode = '' }: { initialCode?: string }) {
  const go = useApp((s) => s.go)
  const { status, error, rooms, roomsLoading, serverUrl, setServerUrl } = useNet()
  const [name, setName] = useState(loadName())
  const [tab, setTab] = useState<Tab>(initialCode ? 'code' : 'quick')
  const [code, setCode] = useState(initialCode)
  const [roomName, setRoomName] = useState('My Room')
  const [desc, setDesc] = useState('')
  const [mode, setMode] = useState('free_roam')
  const [max, setMax] = useState(8)
  const [isPublic, setIsPublic] = useState(true)
  const [showServer, setShowServer] = useState(!serverUrl)
  const [urlDraft, setUrlDraft] = useState(serverUrl)
  const busy = status === 'connecting'

  const commitName = () => saveName(name.trim() || 'Guest')
  const run = (fn: () => Promise<void>) => { commitName(); void fn() }

  useEffect(() => { if (tab === 'public' && serverUrl) void fetchRooms() }, [tab, serverUrl])

  const needsServer = !normalizeUrl(serverUrl)

  return (
    <div className="screen">
      <div className="panel wide">
        <h2>Multiplayer</h2>
        <p className="sub">Play in a town with other people. Rooms are temporary: they disappear when everyone leaves.</p>

        <div className="row">
          <label className="lbl" htmlFor="mp-name">Your name</label>
          <input id="mp-name" className="txt" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} onBlur={commitName} placeholder="Guest" />
        </div>

        <div className="seg tabs" role="tablist">
          {([['quick', 'Quick Join'], ['create', 'Create Room'], ['code', 'Join by Code'], ['public', 'Public Rooms']] as [Tab, string][]).map(([id, label]) => (
            <button key={id} role="tab" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        <div className="mp-body">
          {tab === 'quick' && (
            <div>
              <p className="sub">Jump into a public room that has space, or start a new one if none is open.</p>
              <button className="btn primary" disabled={busy || needsServer} onClick={() => run(quickJoin)}>
                <span className="ico">⚡</span> {busy ? 'Connecting…' : 'Quick Join'}
              </button>
            </div>
          )}

          {tab === 'create' && (
            <div>
              <div className="row"><label className="lbl">Room name</label>
                <input className="txt" value={roomName} maxLength={32} onChange={(e) => setRoomName(e.target.value)} /></div>
              <div className="row"><label className="lbl">Description</label>
                <input className="txt" value={desc} maxLength={140} onChange={(e) => setDesc(e.target.value)} placeholder="Optional" /></div>
              <div className="row"><span className="lbl">Mode</span>
                <select value={mode} onChange={(e) => setMode(e.target.value)}>{MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></div>
              <div className="row"><label className="lbl">Max players</label>
                <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="range" min={2} max={16} value={max} onChange={(e) => setMax(Number(e.target.value))} />
                  <span className="val">{max}</span></span></div>
              <div className="row"><span className="lbl">Visibility<span className="desc">Private rooms only appear to people with the code</span></span>
                <div className="seg">
                  <button aria-pressed={isPublic} onClick={() => setIsPublic(true)}>Public</button>
                  <button aria-pressed={!isPublic} onClick={() => setIsPublic(false)}>Private</button>
                </div></div>
              <button className="btn primary" style={{ marginTop: 12 }} disabled={busy || needsServer}
                onClick={() => run(() => createRoom({ name: roomName, description: desc, mode, maxPlayers: max, isPublic } as Partial<RoomInfo>))}>
                <span className="ico">✚</span> {busy ? 'Creating…' : 'Create room'}
              </button>
            </div>
          )}

          {tab === 'code' && (
            <div>
              <div className="row"><label className="lbl">Room code</label>
                <input className="txt code" value={code} maxLength={8} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ABC123" /></div>
              <button className="btn primary" style={{ marginTop: 12 }} disabled={busy || needsServer || code.trim().length < 4} onClick={() => run(() => joinRoom(code))}>
                <span className="ico">→</span> {busy ? 'Joining…' : 'Join room'}
              </button>
            </div>
          )}

          {tab === 'public' && (
            <div>
              <div className="rooms">
                {rooms.length === 0 && <p className="sub">{roomsLoading ? 'Looking for rooms…' : 'No public rooms right now. Create one!'}</p>}
                {rooms.map((r) => (
                  <div className="room-card" key={r.code}>
                    <div>
                      <strong>{r.name}</strong> {r.locked && '🔒'}
                      <div className="desc">{modeLabel(r.mode)} · Host {r.hostName || '—'}{r.description ? ` · ${r.description}` : ''}</div>
                    </div>
                    <div className="room-right">
                      <span className="val">{r.count}/{r.maxPlayers}</span>
                      <button className="btn small primary" disabled={busy || r.locked || r.count >= r.maxPlayers} onClick={() => run(() => joinRoom(r.code))}>Join</button>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn small" style={{ marginTop: 10 }} onClick={() => void fetchRooms()}>↻ Refresh</button>
            </div>
          )}
        </div>

        {error && <p className="err" role="alert">⚠ {error}</p>}

        <details open={showServer} onToggle={(e) => setShowServer((e.target as HTMLDetailsElement).open)} className="adv">
          <summary>Server settings</summary>
          <p className="sub">The address of the multiplayer server. The game owner sets this up once; players normally never touch it.</p>
          <div className="row">
            <input className="txt wide" value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} placeholder="wss://your-server.onrender.com" />
            <button className="btn small" onClick={() => setServerUrl(urlDraft.trim())}>Save</button>
          </div>
        </details>

        <div className="footer-row">
          <button className="btn small" onClick={() => go('menu')}>← Back</button>
        </div>
      </div>
    </div>
  )
}
