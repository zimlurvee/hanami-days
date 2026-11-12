import { useApp, type CharaTab } from '@/stores/appStore'
import { useCharacter, SIZE_MIN, SIZE_MAX } from '@/stores/characterStore'
import { CHARACTERS } from '@/game/characters/models'
import { runtime } from '@/game/runtime'
import { useState } from 'react'
import { ITEMS, MAX_ITEMS, useItems } from '@/stores/itemsStore'
import { useT } from '@/stores/langStore'
import { CLIP_BASE, EMOTES, loadPack } from '@/game/characters/clips'

const POSES = [
  { id: 1, label: '👋', key: 'wave' },
  { id: 2, label: '🙌', key: 'cheer' },
  { id: 3, label: '🧘', key: 'sit' },
  { id: 4, label: '🙇', key: 'bow' },
  { id: 0, label: '✕', key: 'stop' },
]

const TABS: { id: CharaTab; key: string }[] = [
  { id: 'camera', key: 'camera' },
  { id: 'chara', key: 'charaEdit' },
  { id: 'pose', key: 'pose' },
  { id: 'item', key: 'item' },
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
  const worn = useItems((s) => s.worn)
  const toggleItem = useItems((s) => s.toggle)
  const t = useT()
  if (!tab) return null

  return (
    <aside className="charapanel" aria-label="Chara Edit">
      <div className="ctabs">
        {TABS.map((tb) => (
          <button key={tb.id} className={`pill ${tab === tb.id ? 'on' : ''}`} onClick={() => setTab(tb.id)}>{t(tb.key)}</button>
        ))}
        <button className="pill" onClick={() => setTab(null)}>{t('hide')}</button>
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
                <button key={po.id} className={`abtn ${pose === po.id ? 'on' : ''}`} onClick={() => { runtime.pose = po.id; setPose(po.id) }}>{po.label} {t(po.key)}</button>
              ))}
            </div>
            <div className="boxtitle">Emotes</div>
            <div className="agrid c3 emotes">
              {EMOTES.map((em, i) => (
                <button key={em.clip} className={`abtn ${pose === CLIP_BASE + i ? 'on' : ''}`}
                  onMouseEnter={() => void loadPack()}
                  onClick={() => { runtime.pose = CLIP_BASE + i; setPose(CLIP_BASE + i) }}>{em.label}</button>
              ))}
            </div>
            <p className="sub">Emotes use the Satomi Makise animation pack by S0ul2450Official (see Credits). Stand still and pick a pose. Walking or jumping ends it. Everyone in the room sees it. Poses work on the School Girl and OC; the Student only stands.</p>
          </>
        )}
        {tab === 'item' && (
          <>
            <div className="boxtitle">{t('item')}</div>
            <div className="agrid">
              {ITEMS.map((it) => (
                <button key={it.id} className={`abtn ${worn.includes(it.id) ? 'on' : ''}`} onClick={() => toggleItem(it.id)}>{it.icon} {it.label}</button>
              ))}
            </div>
            <p className="sub">{t('putOn')} (max {MAX_ITEMS}). Other players see what you wear. Accessories show on the School Girl and OC. Objects to place in the world are in Menu → Props.</p>
          </>
        )}
      </div>
    </aside>
  )
}
