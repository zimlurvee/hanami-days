import { lazy, Suspense } from 'react'
import { useApp } from '@/stores/appStore'
import { Backdrop } from '@/components/UI/Backdrop'
import { MainMenu } from '@/components/Menus/MainMenu'
import { SettingsMenu } from '@/components/Menus/SettingsMenu'
import { CreditsScreen } from '@/components/Menus/CreditsScreen'
import { ComingSoon } from '@/components/Menus/ComingSoon'
import { PauseMenu } from '@/components/Menus/PauseMenu'
import { HUD } from '@/components/HUD/HUD'

// The 3D engine is a big chunk, so it only loads once the player starts a game.
const GameCanvas = lazy(() => import('@/game/GameCanvas').then((m) => ({ default: m.GameCanvas })))

export default function App() {
  const screen = useApp((s) => s.screen)
  const settingsReturn = useApp((s) => s.settingsReturn)
  const paused = useApp((s) => s.paused)
  const toast = useApp((s) => s.toast)

  const inGame = screen === 'playing' || (screen === 'settings' && settingsReturn === 'playing')

  return (
    <>
      {!inGame && <Backdrop />}

      {inGame && (
        <>
          <Suspense fallback={<div className="loading">Loading Hanami Town…</div>}>
            <GameCanvas />
          </Suspense>
          {screen === 'playing' && <HUD />}
          {screen === 'playing' && paused && <PauseMenu />}
        </>
      )}

      {screen === 'menu' && <MainMenu />}
      {screen === 'settings' && <SettingsMenu />}
      {screen === 'credits' && <CreditsScreen />}
      {(screen === 'multiplayer' || screen === 'characterEdit' || screen === 'profile') && <ComingSoon screen={screen} />}

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  )
}
