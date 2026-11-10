import { useApp } from '@/stores/appStore'

export function CreditsScreen() {
  const go = useApp((s) => s.go)
  return (
    <div className="screen">
      <div className="panel">
        <h2>Credits</h2>
        <p className="sub">Hanami Days Online is an original game. Every model, colour and interface element is generated in code.</p>
        <ul className="list">
          <li>Inspired in spirit by open-ended school-life sandbox games</li>
          <li>Built with React, Vite, TypeScript, Three.js, React Three Fiber, Rapier and Zustand</li>
          <li>Planned: Supabase for accounts, Colyseus for realtime multiplayer</li>
          <li>Suburban and industrial buildings: City Kit Suburban and City Kit Industrial by Kenney (kenney.nl), CC0</li>
          <li>Font: M PLUS Rounded 1c (SIL Open Font License)</li>
        </ul>
        <div className="footer-row">
          <button className="btn small" onClick={() => go('menu')}>← Back</button>
        </div>
      </div>
    </div>
  )
}
