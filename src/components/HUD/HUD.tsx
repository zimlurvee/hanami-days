import { useEffect, useState } from 'react'
import { Minimap } from './Minimap'
import { runtime } from '@/game/runtime'
import { useWorld } from '@/stores/worldStore'
import { useSettings } from '@/stores/settingsStore'
import { useApp } from '@/stores/appStore'
import { formatHour } from '@/components/Menus/PauseMenu'

const WEATHER_ICON = { sunny: '☀', cloudy: '☁', rainy: '🌧' } as const

const keyName = (code: string) => code.replace('Key', '').replace('Space', 'Space').replace('ShiftLeft', 'Shift')

export function HUD() {
  const [location, setLocation] = useState(runtime.locationName)
  const [locked, setLocked] = useState(false)
  const hour = useWorld((s) => s.hour)
  const weather = useWorld((s) => s.weather)
  const showMap = useSettings((s) => s.settings.showMinimap)
  const keys = useSettings((s) => s.settings.keys)
  const paused = useApp((s) => s.paused)

  // Poll the mutable runtime a few times a second instead of re-rendering per frame
  useEffect(() => {
    const id = window.setInterval(() => {
      setLocation(runtime.locationName)
      setLocked(!!document.pointerLockElement)
    }, 250)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="hud">
      <div className="tl">
        <div className="chip name">
          <span className="avatar-dot" />
          <div>
            <div>Guest</div>
            <div className="meter" title="Stamina"><i /></div>
          </div>
        </div>
        <div className="chip loc">📍 {location}</div>
      </div>

      <div className="tr">
        <div className="chip">
          {WEATHER_ICON[weather]} {formatHour(hour)}
        </div>
        {showMap && <Minimap size={window.innerWidth < 640 ? 110 : 160} />}
      </div>

      <div className="chip bl">
        <div><kbd>{keyName(keys.forward)}</kbd><kbd>{keyName(keys.left)}</kbd><kbd>{keyName(keys.back)}</kbd><kbd>{keyName(keys.right)}</kbd> Move &nbsp; <kbd>{keyName(keys.run)}</kbd> Run</div>
        <div><kbd>{keyName(keys.jump)}</kbd> Jump &nbsp; <kbd>Mouse</kbd> Look &nbsp; <kbd>Wheel</kbd> Zoom &nbsp; <kbd>Esc</kbd> Pause</div>
      </div>

      {!locked && !paused && <div className="chip bc">Click the game to capture the mouse</div>}
    </div>
  )
}
