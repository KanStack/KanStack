import { describe, expect, it } from 'vitest'

import { createDefaultBoardViewPreferences, isCardReorderEnabled } from '@/utils/appConfig'

describe('app config card reorder gating', () => {
  it('keeps card reorder enabled when a board sort is active', () => {
    const preferences = createDefaultBoardViewPreferences()
    preferences.sort = 'title'

    expect(isCardReorderEnabled(preferences)).toBe(true)
  })

  it('keeps card reorder enabled when board filters are active', () => {
    const preferences = createDefaultBoardViewPreferences()
    preferences.filters.assignee = 'galen'
    preferences.filters.text = 'bug'

    expect(isCardReorderEnabled(preferences)).toBe(true)
  })
})
