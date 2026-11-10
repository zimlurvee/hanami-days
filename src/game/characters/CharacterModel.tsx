import { Component, Suspense, type ReactNode } from 'react'
import { Avatar, type AvatarAnim } from './Avatar'
import { GlbAvatar } from './GlbAvatar'
import { DEFAULT_APPEARANCE } from './appearance'
import { useCharacter } from '@/stores/characterStore'

/** If a model file fails to load, fall back to the built-in character instead of crashing the scene. */
class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.error('Character model failed to load, using the built-in character.', err)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/** The local player's visible body, chosen in Character Option or the pause menu. */
export function CharacterModel({ anim }: { anim: AvatarAnim }) {
  const id = useCharacter((s) => s.model)
  const size = useCharacter((s) => s.size)
  const builtIn = (
    <group scale={size}>
      <Avatar appearance={DEFAULT_APPEARANCE} anim={anim} />
    </group>
  )
  if (id === 'student') return builtIn
  return (
    <ModelBoundary key={id} fallback={builtIn}>
      <Suspense fallback={builtIn}>
        <GlbAvatar id={id} anim={anim} />
      </Suspense>
    </ModelBoundary>
  )
}
