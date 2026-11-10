import { lazy, Suspense, useEffect, useState } from 'react'
import { useApp } from '@/stores/appStore'
import { Backdrop } from '@/components/UI/Backdrop'
import { MainMenu } from '@/components/Menus/MainMenu'
import { SettingsMenu } from '@/components/Menus/SettingsMenu'
import { CreditsScreen } from '@/components/Menus/CreditsScreen'
import { MultiplayerMenu } from '@/components/Multiplayer/MultiplayerMenu'
import { GameMenu } from '@/components/Menus/GameMenu'
import { CharaEditPanel } from '@/components/CharacterEditor/CharaEditPanel'
import { HUD } from '@/components/HUD/HUD'
import { MobileHUD } from '@/components/HUD/MobileHUD'
import { DeviceSelect } from '@/components/Device/DeviceSelect'
import { useDevice } from '@/stores/deviceStore'
import { CharacterSelect } from '@/components/CharacterEditor/CharacterSelect'

// The 3D engine is a big chunk, so it only loads once the player starts a game.
const GameCanvas = lazy(() => import('@/game/GameCanvas').then((m) => ({ default: m.GameCanvas })))

export default function App() {
  const device = useDevice((s) => s.device)
  const screen = useApp((s) => s.screen)
  const settingsReturn = useApp((s) => s.settingsReturn)
  const paused = useApp((s) => s.paused)
  const toast = useApp((s) => s.toast)
  const photo = useApp((s) => s.photo)

  // Invite links look like https://site/?room=ABC123
  const [inviteCode] = useState(() => {
    try { return (new URLSearchParams(location.search).get('room') ?? '').toUpperCase().slice(0, 8) } catch { return '' }
  })
  useEffect(() => {
    if (inviteCode) useApp.getState().go('multiplayer')
  }, [inviteCode])

  const inGame = screen === 'playing' || (screen === 'settings' && settingsReturn === 'playing')

  if (device === null) {
    return (
      <>
        <Backdrop />
        <DeviceSelect />
      </>
    )
  }

  return (
    <>
      {!inGame && <Backdrop />}

      {inGame && (
        <>
          <Suspense fallback={<div className="loading">Loading Hanami Town…</div>}>
            <GameCanvas />
          </Suspense>
          {screen === 'playing' && !photo && (device === 'mobile' ? <MobileHUD /> : <HUD />)}
          {screen === 'playing' && !photo && <CharaEditPanel />}
          {screen === 'playing' && photo && (
            <button className="photo-exit" onClick={() => useApp.getState().setPhoto(false)} aria-label="Exit photo mode">✕</button>
          )}
          {screen === 'playing' && paused && <GameMenu />}
        </>
      )}

      {screen === 'menu' && <MainMenu />}
      {screen === 'settings' && <SettingsMenu />}
      {screen === 'credits' && <CreditsScreen />}
      {screen === 'characterEdit' && <CharacterSelect />}
      {screen === 'multiplayer' && <MultiplayerMenu initialCode={inviteCode} />}

      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  )
}
