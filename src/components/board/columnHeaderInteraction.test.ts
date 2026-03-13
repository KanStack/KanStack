import { describe, expect, it } from 'vitest'

import { shouldStartColumnHeaderDrag, TITLE_CONTROL_SELECTOR } from './columnHeaderInteraction'

describe('columnHeaderInteraction', () => {
  it('does not start a header drag from the title control', () => {
    const target = {
      closest(selector: string) {
        return selector === TITLE_CONTROL_SELECTOR ? {} : null
      },
    }

    expect(shouldStartColumnHeaderDrag(target as unknown as EventTarget)).toBe(false)
  })

  it('starts a header drag for non-title targets', () => {
    const target = {
      closest() {
        return null
      },
    }

    expect(shouldStartColumnHeaderDrag(target as unknown as EventTarget)).toBe(true)
  })

  it('falls back to allowing drag when the target has no closest lookup', () => {
    expect(shouldStartColumnHeaderDrag({} as EventTarget)).toBe(true)
  })
})
