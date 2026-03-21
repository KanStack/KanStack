import { describe, expect, it } from 'vitest'

import { useClipboard } from '@/composables/useClipboard'

describe('useClipboard', () => {
  it('round-trips a serialized card without keeping the markdown heading in the body', () => {
    const clipboard = useClipboard()
    const text = clipboard.serializeCards([
      {
        kind: 'card',
        slug: 'example',
        path: 'board/cards/example.md',
        title: 'Example card',
        metadata: {
          title: 'Example card',
          priority: 'high',
          tags: ['ui', 'paste'],
        },
        body: 'First line\n\nSecond line',
        sections: [],
        checklist: [],
        wikilinks: [],
        diagnostics: [],
      },
    ])

    const [parsed] = clipboard.parseClipboardCards(text)

    expect(parsed).toEqual({
      title: 'Example card',
      metadata: {
        priority: 'high',
        tags: ['ui', 'paste'],
      },
      body: 'First line\n\nSecond line',
    })
  })

  it('parses multiple serialized cards from one clipboard payload', () => {
    const clipboard = useClipboard()
    const text = clipboard.serializeCards([
      {
        kind: 'card',
        slug: 'first',
        path: 'board/cards/first.md',
        title: 'First',
        metadata: { title: 'First' },
        body: 'Body one',
        sections: [],
        checklist: [],
        wikilinks: [],
        diagnostics: [],
      },
      {
        kind: 'card',
        slug: 'second',
        path: 'board/cards/second.md',
        title: 'Second',
        metadata: { title: 'Second', type: 'task' },
        body: 'Body two',
        sections: [],
        checklist: [],
        wikilinks: [],
        diagnostics: [],
      },
    ])

    const parsed = clipboard.parseClipboardCards(text)

    expect(parsed).toHaveLength(2)
    expect(parsed[0]?.title).toBe('First')
    expect(parsed[0]?.body).toBe('Body one')
    expect(parsed[1]).toEqual({
      title: 'Second',
      metadata: { type: 'task' },
      body: 'Body two',
    })
  })
})
