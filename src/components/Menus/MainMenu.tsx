import { useApp } from '@/stores/appStore'

export function MainMenu() {
  const go = useApp((s) => s.go)
  const openSettings = useApp((s) => s.openSettings)
  const toast = useApp((s) => s.showToast)

  return (
    <div className="screen">
      <div style={{ width: 'min(460px, 100%)' }}>
        <div className="title-block">
          <div className="jp">桜 日和 オンライン</div>
          <h1>Hanami Days Online</h1>
          <div className="tag">A cheerful school-town life sandbox</div>
        </div>
        <nav className="menu-list" aria-label="Main menu">
          <button className="btn primary" onClick={() => go('playing')}>
            <span className="ico">▶</span> Start Game <span className="hint">Solo</span>
          </button>
          <button className="btn" onClick={() => go('multiplayer')}>
            <span className="ico">🌐</span> Multiplayer
          </button>
          <button className="btn" onClick={() => go('characterEdit')}>
            <span className="ico">👗</span> Character Option
          </button>
          <button className="btn" onClick={() => openSettings('menu')}>
            <span className="ico">⚙</span> Settings
          </button>
          <button className="btn" onClick={() => go('credits')}>
            <span className="ico">✿</span> Credits
          </button>
          <button
            className="btn ghost"
            onClick={() => toast('You can close this browser tab any time. See you next time!')}
          >
            <span className="ico">⎋</span> Exit
          </button>
        </nav>
      </div>
    </div>
  )
}
