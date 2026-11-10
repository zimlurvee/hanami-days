import { useEffect, useState } from 'react'
import { useApp } from '@/stores/appStore'
import { useSettings, type KeyAction, type Quality } from '@/stores/settingsStore'

type Tab = 'graphics' | 'controls' | 'gameplay'

const KEY_LABELS: Record<KeyAction, string> = {
  forward: 'Move forward',
  back: 'Move back',
  left: 'Move left',
  right: 'Move right',
  jump: 'Jump',
  run: 'Run',
  interact: 'Interact',
  map: 'Map',
}

const QUALITIES: Quality[] = ['low', 'medium', 'high', 'ultra']

function prettyKey(code: string) {
  return code.replace('Key', '').replace('Digit', '').replace('Left', ' L').replace('Right', ' R')
}

function Toggle({ label, desc, value, onChange }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="row">
      <span className="lbl">
        {label}
        {desc && <span className="desc">{desc}</span>}
      </span>
      <button className="switch" role="switch" aria-checked={value} aria-label={label} onClick={() => onChange(!value)} />
    </div>
  )
}

function Slider({
  label, desc, value, min, max, step, onChange, format,
}: {
  label: string; desc?: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; format?: (v: number) => string
}) {
  return (
    <div className="row">
      <label className="lbl">
        {label}
        {desc && <span className="desc">{desc}</span>}
      </label>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
        <span className="val">{format ? format(value) : value}</span>
      </span>
    </div>
  )
}

export function SettingsMenu() {
  const [tab, setTab] = useState<Tab>('graphics')
  const [listening, setListening] = useState<KeyAction | null>(null)
  const { settings: s, set, setKey, applyQuality, reset } = useSettings()
  const closeSettings = useApp((a) => a.closeSettings)

  // Capture the next key press while rebinding
  useEffect(() => {
    if (!listening) return
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.code !== 'Escape') setKey(listening, e.code)
      setListening(null)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [listening, setKey])

  return (
    <div className="overlay" style={{ background: 'transparent', backdropFilter: 'none' }}>
      <div className="panel wide" role="dialog" aria-label="Settings">
        <h2>Settings</h2>
        <p className="sub">Saved automatically on this device.</p>

        <div className="tabs" role="tablist">
          {(['graphics', 'controls', 'gameplay'] as Tab[]).map((t) => (
            <button key={t} role="tab" className="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'graphics' && (
          <>
            <div className="row">
              <span className="lbl">Quality preset<span className="desc">Sets shadows, antialiasing, distance and resolution together</span></span>
              <div className="seg">
                {QUALITIES.map((q) => (
                  <button key={q} aria-pressed={s.quality === q} onClick={() => applyQuality(q)}>
                    {q[0].toUpperCase() + q.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <Toggle label="Shadows" value={s.shadows} onChange={(v) => set('shadows', v)} />
            <Toggle label="Anti-aliasing" desc="Smoother edges. Restarts the 3D view when changed." value={s.antialias} onChange={(v) => set('antialias', v)} />
            <Slider label="Render distance" desc="How far you can see before fog hides the world" value={s.renderDistance} min={80} max={500} step={10} onChange={(v) => set('renderDistance', v)} format={(v) => `${v} m`} />
            <Slider label="Resolution scale" desc="Lower this if the game runs slowly" value={s.resolutionScale} min={0.5} max={1.5} step={0.05} onChange={(v) => set('resolutionScale', v)} format={(v) => `${Math.round(v * 100)}%`} />
          </>
        )}

        {tab === 'controls' && (
          <>
            <Slider label="Mouse sensitivity" value={s.mouseSensitivity} min={0.2} max={3} step={0.1} onChange={(v) => set('mouseSensitivity', v)} format={(v) => v.toFixed(1)} />
            <Toggle label="Invert camera (vertical)" value={s.invertY} onChange={(v) => set('invertY', v)} />
            {(Object.keys(KEY_LABELS) as KeyAction[]).map((a) => (
              <div className="row" key={a}>
                <span className="lbl">{KEY_LABELS[a]}</span>
                <button className={`keybtn ${listening === a ? 'listening' : ''}`} onClick={() => setListening(a)}>
                  {listening === a ? 'Press a key…' : prettyKey(s.keys[a])}
                </button>
              </div>
            ))}
            <p className="sub" style={{ marginTop: 12 }}>Mouse wheel zooms the camera. Esc opens the pause menu.</p>
          </>
        )}

        {tab === 'gameplay' && (
          <>
            <Slider label="Camera distance" value={s.cameraDistance} min={3} max={12} step={0.5} onChange={(v) => set('cameraDistance', v)} format={(v) => `${v} m`} />
            <Toggle label="Show interaction prompts" desc="Takes effect when interactions arrive in Phase 3" value={s.showInteractionPrompts} onChange={(v) => set('showInteractionPrompts', v)} />
            <Toggle label="Show mini-map" value={s.showMinimap} onChange={(v) => set('showMinimap', v)} />
            <Toggle label="Show player names" desc="Takes effect when multiplayer arrives in Phase 4" value={s.showPlayerNames} onChange={(v) => set('showPlayerNames', v)} />
          </>
        )}

        <div className="footer-row">
          <button className="btn small ghost" onClick={reset}>Reset to defaults</button>
          <button className="btn small primary" onClick={closeSettings}>Done</button>
        </div>
      </div>
    </div>
  )
}
