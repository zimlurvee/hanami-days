import { useEffect, useRef, useState } from 'react'
import { useApp } from '@/stores/appStore'
import { inviteLink, sendChat, useNet } from '@/net/net'
import { isMobile } from '@/stores/deviceStore'
import { lockPointer } from '@/game/input/input'

/** Room code, chat, player list and connection banner. Only mounted inside a room. */
export function OnlineHUD() {
  const room = useNet((s) => s.room)
  const status = useNet((s) => s.status)
  const chat = useNet((s) => s.chat)
  const meId = useNet((s) => s.meId)
  const names = useNet((s) => s.names)
  const chatOpen = useApp((s) => s.chatOpen)
  const setChatOpen = useApp((s) => s.setChatOpen)
  const showToast = useApp((s) => s.showToast)
  const [text, setText] = useState('')
  const [list, setList] = useState(false)
  const [recent, setRecent] = useState(0)
  const [, setTick] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const log = useRef<HTMLDivElement>(null)
  const [meName, setMeName] = useState('')

  useEffect(() => { if (chatOpen) input.current?.focus() }, [chatOpen])
  useEffect(() => {
    setRecent(Date.now())
    log.current?.scrollTo({ top: 1e6 })
  }, [chat.length])
  // Tab toggles the player list while held
  useEffect(() => {
    const dn = (e: KeyboardEvent) => { if (e.code === 'Tab') { e.preventDefault(); setList(true) } }
    const up = (e: KeyboardEvent) => { if (e.code === 'Tab') setList(false) }
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up) }
  }, [])
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [])
  useEffect(() => { try { setMeName(localStorage.getItem('hanami.name') || 'Guest') } catch { /* */ } }, [])

  if (!room) return null
  const isHost = room.hostId === meId
  const close = () => { setChatOpen(false); setText(''); lockPointer() }
  const submit = () => {
    const t = text.trim()
    if (t) sendChat(t)
    close()
  }
  const visible = chatOpen || Date.now() - recent < 8000
  const copy = (value: string, msg: string) => {
    navigator.clipboard?.writeText(value).then(() => showToast(msg), () => showToast(value))
  }

  return (
    <>
      <div className="chip room-chip">
        <strong>{room.name}</strong>
        <span className="code">{room.code}</span>
        <span>👥 {room.count}/{room.maxPlayers}</span>
        {room.locked && <span>🔒</span>}
        <button className="mini" onClick={() => copy(inviteLink(room.code), 'Invite link copied')}>Copy invite</button>
      </div>

      {status === 'reconnecting' && <div className="chip banner">Connection lost — reconnecting…</div>}

      <div className={`chatbox ${visible ? 'on' : ''}`}>
        <div className="chatlog" ref={log}>
          {chat.slice(-30).map((m, i) => (
            <div key={i} className={m.sys ? 'sys' : ''}>
              {!m.sys && <b>{m.name}: </b>}{m.text}
            </div>
          ))}
        </div>
        {chatOpen ? (
          <input
            ref={input}
            className="chatinput"
            value={text}
            maxLength={200}
            placeholder="Say something… (Enter to send, Esc to cancel)"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Enter') submit()
              else if (e.key === 'Escape') close()
            }}
          />
        ) : (
          !isMobile() && <div className="chathint">Press <kbd>Enter</kbd> to chat · hold <kbd>Tab</kbd> for players</div>
        )}
      </div>

      {list && (
        <div className="chip playerlist">
          <div className="ph">Players in {room.name}</div>
          <div>★ {meName} (you){isHost ? ' · host' : ''}</div>
          {Object.values(names).map((p) => (
            <div key={p.id}>{room.hostId === p.id ? '★ ' : '• '}{p.name}</div>
          ))}
        </div>
      )}
    </>
  )
}
