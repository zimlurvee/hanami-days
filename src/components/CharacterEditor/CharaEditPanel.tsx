import { useApp, type CharaTab } from '@/stores/appStore'
import { useCharacter, SIZE_MIN, SIZE_MAX } from '@/stores/characterStore'
import { CHARACTERS } from '@/game/characters/models'
import { runtime } from '@/game/runtime'
import { useState } from 'react'

const TABS: { id: CharaTab; label: string }[] = [
  { id: 'camera', label: 'Camera, Effect' },
  { id: 'chara', label: 'Chara Edit' },
  { id: 'pose', label: 'Pose mode' },
  { id: 'item', label: 'Item' },
]

/**
 * The in-game "Chara Edit" mechanic (not the same as Character Option in the
 * main menu). A side panel that stays open while you walk around, like the
 * original: Camera/Effect, Chara Edit, Pose mode, Item and Hide.
 */
export function CharaEditPanel() {
  const tab = useApp((s) => s.charaEdit)
  const setTab = useApp((s) => s.setCharaEdit)
  const setPhoto = useApp((s) => s.setPhoto)
  const model = useCharacter((s) => s.model)
  const setModel = useCharacter((s) => s.setModel)
  const size = useCharacter((s) => s.size)
  const setSize = useCharacter((s) => s.setSize)
  const [zoom, setZoom] = useState(runtime.cam.zoom)
  if (!tab) return null

  return (
    <aside className="charapanel" aria-label="Chara Edit">
      <div className="ctabs">
        {TABS.map((t) => (
          <button key={t.id} className={`pill ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
        <button className="pill" onClick={() => setTab(null)}>_Hide</button>
      </div>

      <div className="cbody">
        {tab === 'camera' && (
          <>
            <div className="row">
              <label className="lbl">Camera distance</label>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="range" min={0.35} max={2.4} step={0.05} value={zoom}
                  onChange={(e) => { const v = Number(e.target.value); runtime.cam.zoom = v; setZoom(v) }} aria-label="Camera distance" />
              </span>
            </div>
            <div className="row">
              <span className="lbl">Photo mode<span className="desc">Hides the screen buttons. Esc or the red ✕ brings them back.</span></span>
              <button className="btn small" onClick={() => { setTab(null); setPhoto(true) }}>📷 Hide HUD</button>
            </div>
            <p className="sub">Filters and effects are planned.</p>
          </>
        )}

        {tab === 'chara' && (
          <>
            <div className="boxtitle">Character</div>
            <div className="agrid c3">
              {CHARACTERS.map((c) => (
                <button key={c.id} className={`abtn ${model === c.id ? 'on' : ''}`} onClick={() => setModel(c.id)}>
                  {c.id === 'student' ? 'Student' : c.id === 'schoolgirl' ? 'School Girl' : 'OC'}
                </button>
              ))}
            </div>
            <div className="row">
              <label className="lbl">Size</label>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="range" min={SIZE_MIN} max={SIZE_MAX} step={0.05} value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="Character size" />
                <span className="val">{Math.round(size * 100)}%</span>
              </span>
            </div>
            <p className="sub">Face, hair and outfit editing are planned.</p>
          </>
        )}

        {tab === 'pose' && <p className="sub">Pose mode (sit, wave, peace sign and more) is the next mechanic to be built.</p>}
        {tab === 'item' && <p className="sub">Items you can hold and wear (bags, food, accessories) are planned together with Props.</p>}
      </div>
    </aside>
  )
}
