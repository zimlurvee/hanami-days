import { useApp, type CharaTab } from '@/stores/appStore'
import { useCharacter, SIZE_MIN, SIZE_MAX } from '@/stores/characterStore'
import { CHARACTERS } from '@/game/characters/models'
import { runtime } from '@/game/runtime'
import { useState } from 'react'
import { useProps, PROP_KINDS } from '@/stores/propsStore'
import { putProp } from '@/game/props/props'

const POSES = [
  { id: 1, label: '👋 Wave' },
  { id: 2, label: '🙌 Cheer' },
  { id: 3, label: '🧘 Sit' },
  { id: 4, label: '🙇 Bow' },
  { id: 0, label: '✕ Stop' },
]

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
  const [pose, setPose] = useState(runtime.pose)
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

        {tab === 'pose' && (
          <>
            <div className="boxtitle">Pose mode</div>
            <div className="agrid c3">
              {POSES.map((po) => (
                <button key={po.id} className={`abtn ${pose === po.id ? 'on' : ''}`} onClick={() => { runtime.pose = po.id; setPose(po.id) }}>{po.label}</button>
              ))}
            </div>
            <p className="sub">Stand still and pick a pose. Walking or jumping ends it. Everyone in the room sees it. Poses work on the School Girl and OC; the Student only stands.</p>
          </>
        )}
        {tab === 'item' && <p className="sub">Items you can hold and wear (bags, food, accessories) are planned. For objects to place in the world, see Menu → Props.</p>}
      </div>
    </aside>
  )
}
