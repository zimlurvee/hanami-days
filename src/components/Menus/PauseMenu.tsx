import { useApp } from '@/stores/appStore'
import { useWorld, type Weather } from '@/stores/worldStore'
import { lockPointer } from '@/game/input/input'
import { useCharacter } from '@/stores/characterStore'
import { CHARACTERS } from '@/game/characters/models'

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

export function PauseMenu() {
  const setPaused = useApp((s) => s.setPaused)
  const openSettings = useApp((s) => s.openSettings)
  const go = useApp((s) => s.go)
  const { hour, weather, dayLengthSeconds, setHour, setWeather, setDayLength } = useWorld()
  const character = useCharacter((s) => s.model)
  const setCharacter = useCharacter((s) => s.setModel)

  return (
    <div className="overlay">
      <div className="panel" role="dialog" aria-label="Paused">
        <h2>Paused</h2>
        <p className="sub">The world is frozen while this menu is open.</p>

        <div className="menu-list" style={{ marginBottom: 18 }}>
          <button
            className="btn primary"
            autoFocus
            onClick={() => {
              setPaused(false)
              lockPointer()
            }}
          >
            <span className="ico">▶</span> Resume
          </button>
          <button className="btn" onClick={() => openSettings('playing')}>
            <span className="ico">⚙</span> Settings
          </button>
          <button className="btn" onClick={() => go('menu')}>
            <span className="ico">⌂</span> Return to main menu
          </button>
        </div>

        <div className="row">
          <span className="lbl">Character</span>
          <div className="seg">
            {CHARACTERS.map((c) => (
              <button key={c.id} aria-pressed={character === c.id} onClick={() => setCharacter(c.id)}>
                {c.id === 'student' ? 'Student' : c.id === 'schoolgirl' ? 'School Girl' : 'OC'}
              </button>
            ))}
          </div>
        </div>

        <h2 style={{ fontSize: 18, marginTop: 14 }}>World controls</h2>
        <p className="sub">Solo-mode controls. In multiplayer these become host-only.</p>
        <div className="row">
          <label className="lbl">Time of day</label>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="range" min={0} max={23.99} step={0.25} value={hour} onChange={(e) => setHour(Number(e.target.value))} aria-label="Time of day" />
            <span className="val">{formatHour(hour)}</span>
          </span>
        </div>
        <div className="row">
          <span className="lbl">Weather</span>
          <div className="seg">
            {WEATHERS.map((w) => (
              <button key={w.id} aria-pressed={weather === w.id} onClick={() => setWeather(w.id)}>
                {w.label}
              </button>
            ))}
          </div>
        </div>
        <div className="row">
          <span className="lbl">Clock<span className="desc">Day length: how many real minutes a full day takes</span></span>
          <div className="seg">
            {[
              { label: 'Frozen', v: 0 },
              { label: '5 min', v: 300 },
              { label: '10 min', v: 600 },
              { label: '20 min', v: 1200 },
            ].map((o) => (
              <button key={o.label} aria-pressed={dayLengthSeconds === o.v} onClick={() => setDayLength(o.v)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
