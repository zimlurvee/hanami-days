import { useApp } from '@/stores/appStore'
import { useCharacter, SIZE_MIN, SIZE_MAX } from '@/stores/characterStore'
import { CHARACTERS } from '@/game/characters/models'

/**
 * First version of Character Option: pick which character you play as. It changes
 * the real 3D model in game. Hair, outfit and colour editing arrive next, and
 * saved slots are stored on this device (no account needed).
 */
export function CharacterSelect() {
  const go = useApp((s) => s.go)
  const model = useCharacter((s) => s.model)
  const setModel = useCharacter((s) => s.setModel)
  const size = useCharacter((s) => s.size)
  const setSize = useCharacter((s) => s.setSize)

  return (
    <div className="screen">
      <div className="panel wide">
        <h2>Character Option</h2>
        <p className="sub">Choose who you play as. Your choice is remembered on this device.</p>

        <div className="char-grid" role="radiogroup" aria-label="Character">
          {CHARACTERS.map((c) => (
            <button
              key={c.id}
              role="radio"
              aria-checked={model === c.id}
              className={`char-card ${model === c.id ? 'selected' : ''}`}
              onClick={() => setModel(c.id)}
            >
              <span className="char-initial">{c.label[0]}</span>
              <span className="char-name">{c.label}</span>
              <span className="char-blurb">{c.blurb}</span>
              {c.credit && <span className="char-credit">{c.credit}</span>}
            </button>
          ))}
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          <label className="lbl">Size<span className="desc">Make your character smaller or taller</span></label>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="range" min={SIZE_MIN} max={SIZE_MAX} step={0.05} value={size} onChange={(e) => setSize(Number(e.target.value))} aria-label="Character size" />
            <span className="val">{Math.round(size * 100)}%</span>
          </span>
        </div>

        <p className="sub" style={{ marginTop: 16 }}>
          Hair, face, outfit and colour editing will be added to Chara Edit, which you open from the in-game menu.
        </p>

        <div className="footer-row">
          <button className="btn small" onClick={() => go('menu')}>← Back</button>
          <button className="btn small primary" onClick={() => go('playing')}>Play as this character</button>
        </div>
      </div>
    </div>
  )
}
