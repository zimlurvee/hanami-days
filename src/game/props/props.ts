import { useProps, MAX_PROPS_PER_PLAYER, MAX_PROPS_PER_ROOM } from '@/stores/propsStore'
import { useApp } from '@/stores/appStore'
import { runtime } from '@/game/runtime'
import { isOnline, sendProp, sendPropDel, sendPropClear, useNet } from '@/net/net'

let localId = 0

/** Is this prop mine (so I may delete it)? The host may delete anything online. */
export function canRemove(owner: string): boolean {
  const net = useNet.getState()
  if (!net.room) return true
  return owner === net.meId || net.room.hostId === net.meId
}

export function myId(): string {
  return useNet.getState().meId ?? 'me'
}

/** Put the selected prop on the ground in front of the player (PUT button / G key). */
export function putProp() {
  const toast = useApp.getState().showToast
  const { selected, props, add } = useProps.getState()
  const p = runtime.player
  const x = p.x + Math.sin(p.yaw) * 1.4
  const z = p.z + Math.cos(p.yaw) * 1.4
  const yaw = p.yaw + Math.PI
  const mine = props.filter((q) => q.owner === myId()).length
  if (mine >= MAX_PROPS_PER_PLAYER) {
    toast(`You can place up to ${MAX_PROPS_PER_PLAYER} props. Remove one in Menu → Props.`)
    return
  }
  if (isOnline()) {
    if (!useNet.getState().room?.propsAllowed) { toast('Props are turned off in this room.'); return }
    sendProp(selected, x, p.y, z, yaw)
    return
  }
  if (props.length >= MAX_PROPS_PER_ROOM) { toast('Too many props.'); return }
  add({ id: `L${++localId}`, kind: selected, x, y: p.y, z, yaw, owner: 'me' })
}

export function removeProp(id: string) {
  if (isOnline()) sendPropDel(id)
  else useProps.getState().remove(id)
}

export function clearMyProps(all = false) {
  if (isOnline()) sendPropClear(all)
  else useProps.getState().set([])
}
