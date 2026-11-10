import { useApp, type Screen } from '@/stores/appStore'

/**
 * Honest stand-in for menus whose backing systems are scheduled for a later
 * phase. It says exactly what is missing so no button pretends to work.
 */
const INFO: Partial<Record<Screen, { title: string; phase: string; needs: string[] }>> = {
  multiplayer: {
    title: 'Multiplayer',
    phase: 'Phase 4',
    needs: [
      'A Colyseus server (hosted outside Netlify) for rooms, codes, sync and chat',
      'Supabase sign-in so rooms know who you are',
      'Create / join / public room browser, host controls, invite links',
    ],
  },
  profile: {
    title: 'Profile',
    phase: 'Phase 2',
    needs: [
      'Supabase email sign-in, username and profile picture',
      'Saved characters, favourite rooms and room history',
    ],
  },
}

export function ComingSoon({ screen }: { screen: Screen }) {
  const go = useApp((s) => s.go)
  const info = INFO[screen]
  if (!info) return null
  return (
    <div className="screen">
      <div className="panel">
        <span className="badge">Planned for {info.phase}</span>
        <h2>{info.title}</h2>
        <p className="sub">This menu is not built yet. Here is what it needs before it can work properly:</p>
        <ul className="list">
          {info.needs.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <div className="footer-row">
          <button className="btn small" onClick={() => go('menu')}>← Back</button>
        </div>
      </div>
    </div>
  )
}
