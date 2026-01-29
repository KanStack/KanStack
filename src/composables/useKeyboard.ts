import { onMounted, onUnmounted } from 'vue'

export interface KeyBinding {
  key: string
  modifiers?: {
    ctrl?: boolean
    meta?: boolean
    shift?: boolean
    alt?: boolean
  }
  handler: () => void
  description: string
}

export function useKeyboard(bindings: KeyBinding[]) {
  const handleKeydown = (event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Allow Escape to close even when in input
      if (event.key === 'Escape') {
        const escapeBinding = bindings.find(b => b.key === 'Escape' && !b.modifiers)
        if (escapeBinding) {
          event.preventDefault()
          escapeBinding.handler()
        }
      }
      return
    }

    for (const binding of bindings) {
      const matchesKey = event.key.toLowerCase() === binding.key.toLowerCase()
      const matchesCtrl = !!binding.modifiers?.ctrl === event.ctrlKey
      const matchesMeta = !!binding.modifiers?.meta === event.metaKey
      const matchesShift = !!binding.modifiers?.shift === event.shiftKey
      const matchesAlt = !!binding.modifiers?.alt === event.altKey

      if (matchesKey && matchesCtrl && matchesMeta && matchesShift && matchesAlt) {
        event.preventDefault()
        binding.handler()
        break
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })

  return {
    bindings
  }
}

export const DEFAULT_BINDINGS: KeyBinding[] = [
  {
    key: '?',
    handler: () => {},
    description: 'Show keyboard shortcuts'
  },
  {
    key: 'k',
    handler: () => {},
    description: 'Navigate up'
  },
  {
    key: 'j',
    handler: () => {},
    description: 'Navigate down'
  },
  {
    key: 'h',
    handler: () => {},
    description: 'Navigate left'
  },
  {
    key: 'l',
    handler: () => {},
    description: 'Navigate right'
  },
  {
    key: 'n',
    handler: () => {},
    description: 'New card'
  },
  {
    key: 'e',
    handler: () => {},
    description: 'Edit card'
  },
  {
    key: 'a',
    handler: () => {},
    description: 'Archive card'
  },
  {
    key: 'Enter',
    handler: () => {},
    description: 'Open selected card'
  },
  {
    key: 'Escape',
    handler: () => {},
    description: 'Close modal / Cancel'
  },
  {
    key: 'k',
    modifiers: { meta: true },
    handler: () => {},
    description: 'Open command palette'
  }
]
