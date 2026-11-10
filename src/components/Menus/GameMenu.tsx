import { useState } from 'react'
import { useApp } from '@/stores/appStore'
import { useWorld, type Weather } from '@/stores/worldStore'
import { lockPointer } from '@/game/input/input'
import { useCharacter, SIZE_MIN, SIZE_MAX } from '@/stores/characterStore'
import { CHARACTERS } from '@/game/characters/models'
import { AREAS } from '@/game/world/areas'
import { runtime } from '@/game/runtime'
import { useProps, PROP_KINDS, MAX_PROPS_PER_PLAYER } from '@/stores/propsStore'
import { canRemove, clearMyProps, myId, putProp, removeProp } from '@/game/props/props'
import { hostAction, inviteLink, leaveRoom, teleportTo, useNet } from '@/net/net'

const WEATHERS: { id: Weather; label: string }[] = [
  { id: 'sunny', label: '☀ Sunny' },
  { id: 'cloudy', label: '☁ Cloudy' },
  { id: 'rainy', label: '🌧 Rainy' },
]

export function formatHour(h: number) {
  const hh = Math.floor(h)
  const mm = Math.floor((h - hh) * 60)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

type Page = 'home' | 'status' | 'weather' | 'props' | 'room'

/**
 * The in-game MENU, laid out like the original: a row of section buttons, the
 * Area Move list, and Character Change. Opened with Esc (PC) or the Menu button (mobile).
 */
export function GameMenu() {
  const setPaused = useApp((s) => s.setPaused)
  const openSettings = useApp((s) => s.openSettings)
  const setCharaEdit = useApp((s) => s.setCharaEdit)
  const go = useApp((s) => s.go)
  const showToast = useApp((s) => s.showToast)
  const { hour, weather, dayLengthSeconds, setHour, setWeather, setDayLength } = useWorld()
  const character = useCharacter((s) => s.model)
  const setCharacter = useCharacter((s) => s.setModel)
  const size = useCharacter((s) => s.size)
  const setSize = useCharacter((s) => s.setSize)
  const room = useNet((s) => s.room)
  const meId = useNet((s) => s.meId)
  const names = useNet((s) => s.names)
  const [page, setPage] = useState<Page>('home')
  const props = useProps((s) => s.props)
  const selectedProp = useProps((s) => s.selected)
  const selectProp = useProps((s) => s.select)

  const isHost = !!room && room.hostId === meId
  const canWorld = !room || isHost
  const close = () => { setPaused(false); lockPointer() }
  const move = (label: string, x: number, y: number, z: number) => {
    teleportTo(x, y, z)
    showToast(`Moved to ${label}`)
    close()
  }

  return (
    <div className="overlay">
      <div className="panel wide gmenu" role="dialog" aria-label="Menu">
        <button className="xbtn" onClick={close} aria-label="Close menu">✕</button>

        <div className="mrow">
          <button className="pill" onClick={() => openSettings('playing')}>System Setting</button>
          <button className="pill" aria-pressed={page === 'status'} onClick={() => setPage(page === 'status' ? 'home' : 'status')}>Status</button>
          <button className="pill" onClick={() => { setPaused(false); setCharaEdit('chara'); lockPointer() }}>Chara Edit</button>
          <button className="pill" aria-pressed={page === 'props'} onClick={() => setPage(page === 'props' ? 'home' : 'props')}>Props</button>
          <button className="pill" aria-pressed={page === 'weather'} onClick={() => setPage(page === 'weather' ? 'home' : 'weather')}>Weather</button>
          {room && <button className="pill" aria-pressed={page === 'room'} onClick={() => setPage(page === 'room' ? 'home' : 'room')}>Room</button>}
          <button className="pill" onClick={() => { leaveRoom(); go('menu') }}>{room ? 'Leave room' : 'Back to Title'}</button>
        </div>

        {page === 'home' && (
          <>
            <div className="box">
              <div className="boxtitle">Area Move</div>
              <div className="agrid">
                {AREAS.map((a) => (
                  <button key={a.id} className="abtn" onClick={() => move(a.label, a.x, a.y, a.z)}>{a.label}</button>
                ))}
              </div>
            </div>

            <div className="box">
              <div className="boxtitle">Character Change</div>
              <div className="agrid c3">
                {CHARACTERS.map((c) => (
                  <button key={c.id} className={`abtn ${character === c.id ? 'on' : ''}`} onClick={() => setCharacter(c.id)}>
                    {c.id === 'student' ? 'Student' : c.id === 'schoolgirl' ? 'School Girl' : 'OC'}
                  </button>
                ))}
              </div>
              <div className="row">
                <label className="lbl">Size</label>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="range" min={SIZE_MIN} max={SIZE_MAX} step={0.05} value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="Character size" />
                  <span className="val">{Math.round(size * 100)}%</span>
                </span>
              </div>
            </div>
          </>
        )}

        {page === 'status' && (
          <div className="box">
            <div className="boxtitle">Status</div>
            <div className="row"><span className="lbl">Place</span><span>{runtime.locationName}</span></div>
            <div className="row"><span className="lbl">Time</span><span>{formatHour(hour)}</span></div>
            <div className="row"><span className="lbl">Weather</span><span>{weather}</span></div>
            <div className="row"><span className="lbl">Mode</span><span>{room ? `Online · ${room.name} (${room.code})` : 'Solo'}</span></div>
            {room && <div className="row"><span className="lbl">Players</span><span>{room.count}/{room.maxPlayers}</span></div>}
          </div>
        )}

        {page === 'props' && (
          <div className="box">
            <div className="boxtitle">Props</div>
            <p className="sub">Pick a prop, then press <b>PUT</b> (mobile) or <b>G</b> (PC) to place it in front of you. Up to {MAX_PROPS_PER_PLAYER} each. {room ? 'Everyone in the room sees them, and they disappear when you leave.' : ''}</p>
            <div className="agrid">
              {PROP_KINDS.map((k) => (
                <button key={k.id} className={`abtn ${selectedProp === k.id ? 'on' : ''}`} onClick={() => selectProp(k.id)}>{k.icon} {k.label}</button>
              ))}
            </div>
            <div className="menu-list" style={{ marginTop: 10 }}>
              <button className="btn small primary" onClick={() => { putProp(); close() }}>Put {PROP_KINDS.find((k) => k.id === selectedProp)?.label.toLowerCase()} here</button>
            </div>
            <div className="plist" style={{ marginTop: 8 }}>
              {props.filter((p) => p.owner === myId() || (isHost && room)).map((p) => (
                <div className="row" key={p.id}>
                  <span>{PROP_KINDS.find((k) => k.id === p.kind)?.icon} {p.kind}{p.owner !== myId() ? ' (other player)' : ''}</span>
                  {canRemove(p.owner) && <button className="btn small" onClick={() => removeProp(p.id)}>Remove</button>}
                </div>
              ))}
              {props.length === 0 && <p className="sub">No props placed yet.</p>}
            </div>
            {props.some((p) => p.owner === myId()) && <button className="btn small" onClick={() => clearMyProps(false)}>Remove all mine</button>}
          </div>
        )}

        {page === 'weather' && (
          <div className="box">
            <div className="boxtitle">Weather &amp; Time</div>
            <p className="sub">{room ? (isHost ? 'You are the host: changes apply to everyone in the room.' : 'Only the host can change time and weather.') : 'Solo: changes only affect you.'}</p>
            <div className="row">
              <label className="lbl">Time of day</label>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="range" min={0} max={23.99} step={0.25} value={hour} disabled={!canWorld}
                  onChange={(e) => (room ? hostAction('env', { hour: Number(e.target.value) }) : setHour(Number(e.target.value)))} aria-label="Time of day" />
                <span className="val">{formatHour(hour)}</span>
              </span>
            </div>
            <div className="row">
              <span className="lbl">Weather</span>
              <div className="seg">
                {WEATHERS.map((w) => (
                  <button key={w.id} aria-pressed={weather === w.id} disabled={!canWorld}
                    onClick={() => (room ? hostAction('env', { weather: w.id }) : setWeather(w.id))}>{w.label}</button>
                ))}
              </div>
            </div>
            <div className="row">
              <span className="lbl">Clock<span className="desc">Real time for one full day</span></span>
              <div className="seg">
                {[{ label: 'Frozen', v: 0 }, { label: '5 min', v: 300 }, { label: '10 min', v: 600 }, { label: '20 min', v: 1200 }].map((o) => (
                  <button key={o.label} aria-pressed={dayLengthSeconds === o.v} disabled={!canWorld}
                    onClick={() => (room ? hostAction('env', { dayLength: o.v }) : setDayLength(o.v))}>{o.label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {page === 'room' && room && (
          <div className="box">
            <div className="boxtitle">Room: {room.name}</div>
            <p className="sub">Code <b className="code">{room.code}</b> · {room.count}/{room.maxPlayers} players · rooms are temporary</p>
            <button className="btn small" onClick={() => navigator.clipboard?.writeText(inviteLink(room.code)).then(() => showToast('Invite link copied'), () => showToast(inviteLink(room.code)))}>Copy invite link</button>
            <div className="plist" style={{ marginTop: 8 }}>
              {Object.values(names).map((p) => (
                <div className="row" key={p.id}>
                  <span>{room.hostId === p.id ? '★ ' : ''}{p.name}</span>
                  {isHost && (
                    <span style={{ display: 'flex', gap: 6 }}>
                      <button className="btn small" onClick={() => hostAction('kick', { id: p.id })}>Kick</button>
                      <button className="btn small" onClick={() => hostAction('ban', { id: p.id })}>Ban</button>
                    </span>
                  )}
                </div>
              ))}
            </div>
            {isHost && (
              <>
                <div className="row">
                  <span className="lbl">Room locked<span className="desc">No new players can join</span></span>
                  <div className="seg">
                    <button aria-pressed={!room.locked} onClick={() => hostAction('lock', { locked: false })}>Open</button>
                    <button aria-pressed={room.locked} onClick={() => hostAction('lock', { locked: true })}>Locked</button>
                  </div>
                </div>
                <div className="row">
                  <span className="lbl">Visibility</span>
                  <div className="seg">
                    <button aria-pressed={room.isPublic} onClick={() => hostAction('settings', { settings: { isPublic: true } })}>Public</button>
                    <button aria-pressed={!room.isPublic} onClick={() => hostAction('settings', { settings: { isPublic: false } })}>Private</button>
                  </div>
                </div>
                <div className="row">
                  <label className="lbl">Max players</label>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="range" min={2} max={16} value={room.maxPlayers} onChange={(e) => hostAction('settings', { settings: { maxPlayers: Number(e.target.value) } })} />
                    <span className="val">{room.maxPlayers}</span>
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        <p className="sub" style={{ margin: '10px 0 0' }}>
          {room ? 'The world keeps running for everyone else while this menu is open.' : 'The world is frozen while this menu is open.'}
        </p>
      </div>
    </div>
  )
}
