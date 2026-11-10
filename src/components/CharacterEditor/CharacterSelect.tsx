import { useApp } from '@/stores/appStore'
import { useCharacter } from '@/stores/characterStore'
import { CHARACTERS } from '@/game/characters/models'

/**
 * First version of Character Edit: pick which character you play as. It changes
 * the real 3D model in game. Hair, outfit and colour editing arrive next, and
 * saving to an account comes with Supabase.
 */
export function CharacterSelect() {
  const go = useApp((s) => s.go)
  const model = useCharacter((s) => s.model)
  const setModel = useCharacter((s) => s.setModel)

  return (
    <div className="screen">
      <div className="panel wide">
        <h2>Character Edit</h2>
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

        <p className="sub" style={{ marginTop: 16 }}>
          Coming next: hair, face, outfit and colour editing, plus saved character slots on your account.
        </p>

        <div className="footer-row">
          <button className="btn small" onClick={() => go('menu')}>← Back</button>
          <button className="btn small primary" onClick={() => go('playing')}>Play as this character</button>
        </div>
      </div>
    </div>
  )
}
