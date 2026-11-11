import { useEffect } from 'react'
import { runtime } from '@/game/runtime'
import { useApp } from '@/stores/appStore'
import { useItems } from '@/stores/itemsStore'
import { MISSIONS, useMissions } from '@/stores/missionsStore'
import { useNet } from '@/net/net'

/** Watches what the player does and pays out missions. Renders nothing. */
export function MissionTracker() {
  useEffect(() => {
    const id = window.setInterval(() => {
      const m = useMissions.getState()
      const loc = runtime.locationName
      const hits: string[] = []
      for (const mi of MISSIONS) if (mi.visit?.includes(loc)) hits.push(mi.id)
      if (runtime.pose > 0) hits.push('pose')
      if (useItems.getState().worn.length > 0) hits.push('item')
      const room = useNet.getState().room
      if (room && room.count >= 2) hits.push('friend')
      for (const h of hits) {
        if (m.complete(h)) {
          const mi = MISSIONS.find((x) => x.id === h)!
          useApp.getState().showToast(`Mission complete: ${mi.title} (+¥${mi.reward})`)
        }
      }
    }, 1000)
    return () => window.clearInterval(id)
  }, [])
  return null
}
