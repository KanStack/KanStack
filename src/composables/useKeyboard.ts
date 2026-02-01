import { onMounted, onUnmounted } from 'vue'

export interface KeyBinding {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  handler: () => void
  description: string
}

export function useKeyboard(bindings: KeyBinding[]) {
  const handleKeydown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
    
    // Allow Escape to close even when in input
    if (isInput && event.key === 'Escape') {
      const escBinding = bindings.find(b => b.key === 'Escape' && !b.ctrl && !b.meta && !b.shift && !b.alt)
      if (escBinding) {
        event.preventDefault()
        escBinding.handler()
      }
      return
    }
    
    if (isInput) return

    for (const b of bindings) {
      if (event.key.toLowerCase() === b.key.toLowerCase() &&
          !!b.ctrl === event.ctrlKey &&
          !!b.meta === event.metaKey &&
          !!b.shift === event.shiftKey &&
          !!b.alt === event.altKey) {
        event.preventDefault()
        b.handler()
        break
      }
    }
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown))
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

  return { bindings }
}

export const DEFAULT_BINDINGS: KeyBinding[] = [
  { key: '?', handler: () => {}, description: 'Show keyboard shortcuts' },
  { key: 'k', handler: () => {}, description: 'Navigate up' },
  { key: 'j', handler: () => {}, description: 'Navigate down' },
  { key: 'h', handler: () => {}, description: 'Navigate left' },
  { key: 'l', handler: () => {}, description: 'Navigate right' },
  { key: 'n', handler: () => {}, description: 'New card' },
  { key: 'e', handler: () => {}, description: 'Edit card' },
  { key: 'a', handler: () => {}, description: 'Archive card' },
  { key: 'Enter', handler: () => {}, description: 'Open selected card' },
  { key: 'Escape', handler: () => {}, description: 'Close modal / Cancel' },
  { key: 'k', meta: true, handler: () => {}, description: 'Open command palette' }
]
