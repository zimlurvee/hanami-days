import { useMemo } from 'react'

/** Soft sky, hills and falling sakura petals behind every menu screen. */
export function Backdrop() {
  const petals = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: `${(i * 47) % 100}%`,
        delay: `${-((i * 1.7) % 14)}s`,
        duration: `${9 + ((i * 3) % 7)}s`,
        scale: 0.7 + ((i * 13) % 10) / 14,
      })),
    [],
  )
  return (
    <div className="backdrop" aria-hidden>
      <div className="hills" />
      {petals.map((p, i) => (
        <span
          key={i}
          className="petal"
          style={{ left: p.left, animationDelay: p.delay, animationDuration: p.duration, transform: `scale(${p.scale})` }}
        />
      ))}
    </div>
  )
}
