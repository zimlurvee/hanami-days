import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/stores/appStore'
import { useWorld } from '@/stores/worldStore'
import { useSettings } from '@/stores/settingsStore'
import { useNet } from '@/net/net'
import { analog, cycleZoom, lookBy, touchInteract, touchJump } from '@/game/input/input'
import { Minimap } from './Minimap'
import { putProp } from '@/game/props/props'
import { OnlineHUD } from '@/components/Multiplayer/OnlineHUD'
import { formatHour } from '@/components/Menus/GameMenu'

const RADIUS = 46

function Joystick() {
  const base = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLDivElement>(null)
  const id = useRef<number | null>(null)

  const move = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect()
    let dx = e.clientX - (r.left + r.width / 2)
    let dy = e.clientY - (r.top + r.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > RADIUS) { dx = (dx / len) * RADIUS; dy = (dy / len) * RADIUS }
    knob.current!.style.transform = `translate(${dx}px, ${dy}px)`
    analog.x = dx / RADIUS
    analog.y = -dy / RADIUS
  }
  const end = () => {
    id.current = null
    analog.x = analog.y = 0
    if (knob.current) knob.current.style.transform = 'translate(0,0)'
  }
  useEffect(() => end, [])

  return (
    <div
      ref={base}
      className="stick"
      onPointerDown={(e) => { id.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); move(e) }}
      onPointerMove={(e) => { if (id.current === e.pointerId) move(e) }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div ref={knob} className="knob" />
    </div>
  )
}

/** Drag anywhere on the free part of the screen to turn the camera. */
function LookPad() {
  const last = useRef<{ id: number; x: number; y: number } | null>(null)
  return (
    <div
      className="lookpad"
      onPointerDown={(e) => { last.current = { id: e.pointerId, x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId) }}
      onPointerMove={(e) => {
        const l = last.current
        if (!l || l.id !== e.pointerId) return
        lookBy(e.clientX - l.x, e.clientY - l.y)
        l.x = e.clientX; l.y = e.clientY
      }}
      onPointerUp={() => { last.current = null }}
      onPointerCancel={() => { last.current = null }}
    />
  )
}

interface BtnProps { cls: string; label: string; onPress?: () => void; soon?: string; icon?: string }

/** A round game button. Fires on touch-down so it feels instant. */
function Btn({ cls, label, onPress, soon, icon }: BtnProps) {
  const toast = useApp((s) => s.showToast)
  return (
    <button
      className={`mbtn ${cls} ${soon ? 'soon' : ''}`}
      onPointerDown={(e) => { e.preventDefault(); if (soon) toast(soon); else onPress?.() }}
    >
      {icon && <span className="mi">{icon}</span>}
      <span>{label}</span>
    </button>
  )
}

export function MobileHUD() {
  const setPaused = useApp((s) => s.setPaused)
  const setChatOpen = useApp((s) => s.setChatOpen)
  const setCharaEdit = useApp((s) => s.setCharaEdit)
  const setPhoto = useApp((s) => s.setPhoto)
  const toast = useApp((s) => s.showToast)
  const hour = useWorld((s) => s.hour)
  const inRoom = useNet((s) => !!s.room)
  const showMap = useSettings((s) => s.settings.showMinimap)
  const set = useSettings((s) => s.set)
  const [portrait, setPortrait] = useState(window.innerHeight > window.innerWidth)

  useEffect(() => {
    const f = () => setPortrait(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', f)
    return () => window.removeEventListener('resize', f)
  }, [])

  return (
    <div className="mhud hud">
      <LookPad />

      <div className="mtop">
        <Btn cls="round" label="MENU" icon="☰" onPress={() => setPaused(true)} />
        <Btn cls="round" label="Radar" onPress={() => set('showMinimap', !showMap)} />
        <Btn cls="round" label="" icon="🏆" soon="Missions are coming later." />
        <Btn cls="round" label="" icon="?" onPress={() => toast('Left stick: move · Drag the screen: look · MENU: areas, character, weather')} />
        {inRoom && <Btn cls="round" label="" icon="💬" onPress={() => setChatOpen(true)} />}
      </div>
      <div className="mtime">{formatHour(hour)}</div>
      <Btn cls="round mitem" label="ITEM" icon="🎒" onPress={() => setCharaEdit('item')} />
      <Btn cls="pill mcharaedit" label="Chara Edit" onPress={() => setCharaEdit('chara')} />

      <div className="mtr">
        <Btn cls="pill" label="SAVE" soon="Saving comes with the next update." />
        <Btn cls="round" label="" icon="📷" onPress={() => setPhoto(true)} />
        <div className="life"><span>LIFE</span><i /></div>
      </div>
      {showMap && <div className="mmap"><Minimap size={110} /></div>}

      <Joystick />

      <Btn cls="big attack" label="ATTACK" soon="Combat is not in this version." />
      <Btn cls="round action" label="ACTION" onPress={touchInteract} />
      <Btn cls="round jetpack" label="JETPACK" soon="Jetpack is coming later." />
      <Btn cls="round jump" label="JUMP" onPress={touchJump} />
      <Btn cls="round zoom" label="ZOOM" onPress={cycleZoom} />
      <Btn cls="round put" label="PUT" onPress={putProp} />

      <OnlineHUD />

      {portrait && <div className="rotate">📱↻ Turn your phone sideways to play</div>}
    </div>
  )
}
