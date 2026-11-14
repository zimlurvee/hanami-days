import { Component, Suspense, type ReactNode } from 'react'
import type { AvatarAnim } from './Avatar'
import { GlbAvatar } from './GlbAvatar'
import { useCharacter } from '@/stores/characterStore'

/** If the model file fails to load, draw nothing rather than crashing the scene. */
class ModelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.error('Character model failed to load.', err)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

/** The local player's visible body. */
export function CharacterModel({ anim }: { anim: AvatarAnim }) {
  const id = useCharacter((s) => s.model)
  return (
    <ModelBoundary key={id}>
      <Suspense fallback={null}>
        <GlbAvatar id={id} anim={anim} />
      </Suspense>
    </ModelBoundary>
  )
}
