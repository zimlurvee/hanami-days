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
          <li>This work is based on <a href="https://sketchfab.com/3d-models/anime-school-girl-rigged-fafb9852faa14d48852e860868aa8cd9" target="_blank" rel="noreferrer">"Anime school girl (Rigged)"</a> by <a href="https://sketchfab.com/darknessvoid403" target="_blank" rel="noreferrer">darknessvoid403</a>, licensed under <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC-BY-4.0</a></li>
          <li>This work is based on <a href="https://sketchfab.com/3d-models/random-oc-caf2b80feea24f2096ca52cfcda97939" target="_blank" rel="noreferrer">"Random oc"</a> by <a href="https://sketchfab.com/Delenapro" target="_blank" rel="noreferrer">Delenapro</a>, licensed under <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC-BY-4.0</a></li>
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
