import { guessDevice, useDevice, type Device } from '@/stores/deviceStore'

/** First screen on a new device: pick PC or Mobile controls. Can be changed later in Settings. */
export function DeviceSelect() {
  const setDevice = useDevice((s) => s.setDevice)
  const guess = guessDevice()
  const card = (d: Device, icon: string, title: string, lines: string[]) => (
    <button className={`device-card ${guess === d ? 'guess' : ''}`} onClick={() => setDevice(d)}>
      <span className="device-ico">{icon}</span>
      <span className="device-title">{title}</span>
      {lines.map((l) => <span key={l} className="device-line">{l}</span>)}
      {guess === d && <span className="badge">Looks like your device</span>}
    </button>
  )
  return (
    <div className="screen">
      <div style={{ width: 'min(620px, 100%)' }}>
        <div className="title-block">
          <div className="jp">桜 日和 オンライン</div>
          <h1>Hanami Days Online</h1>
          <div className="tag">What are you playing on?</div>
        </div>
        <div className="device-grid">
          {card('pc', '🖥', 'PC', ['Keyboard and mouse', 'WASD to move, mouse to look'])}
          {card('mobile', '📱', 'Mobile', ['Touch controls', 'Joystick, buttons, drag to look', 'Best in landscape'])}
        </div>
        <p className="sub" style={{ textAlign: 'center', marginTop: 14 }}>You can change this any time in Settings → Controls.</p>
      </div>
    </div>
  )
}
