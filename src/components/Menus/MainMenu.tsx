import { useApp } from '@/stores/appStore'
import { useT } from '@/stores/langStore'

export function MainMenu() {
  const go = useApp((s) => s.go)
  const openSettings = useApp((s) => s.openSettings)
  const toast = useApp((s) => s.showToast)
  const t = useT()

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
            <span className="ico">▶</span> {t('start')} <span className="hint">Solo</span>
          </button>
          <button className="btn" onClick={() => go('multiplayer')}>
            <span className="ico">🌐</span> {t('multiplayer')}
          </button>
          <button className="btn" onClick={() => go('characterEdit')}>
            <span className="ico">👗</span> {t('charOption')}
          </button>
          <button className="btn" onClick={() => openSettings('menu')}>
            <span className="ico">⚙</span> {t('settings')}
          </button>
          <button className="btn" onClick={() => go('credits')}>
            <span className="ico">✿</span> {t('credits')}
          </button>
          <button
            className="btn ghost"
            onClick={() => toast('You can close this browser tab any time. See you next time!')}
          >
            <span className="ico">⎋</span> {t('exit')}
          </button>
        </nav>
      </div>
    </div>
  )
}
