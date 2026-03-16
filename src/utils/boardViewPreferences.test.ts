import { describe, expect, it } from 'vitest'

import type { KanbanCardDocument } from '@docs/schemas/kanban-parser-schema'
import { createDefaultBoardViewPreferences, isCardReorderEnabled } from '@/utils/appConfig'
import { applyBoardViewPreferences } from '@/utils/boardViewPreferences'
import type { BoardView } from '@/utils/buildBoardView'

describe('board view preferences', () => {
  it('sorts cards by title without mutating manual order', () => {
    const boardView = createBoardView()
    const preferences = createDefaultBoardViewPreferences()
    preferences.sort = 'title'

    const sorted = applyBoardViewPreferences(boardView, createCardsBySlug(), preferences)

    expect(sorted.columns[0].sections[0].cards.map((card) => card.slug)).toEqual(['a-card', 'b-card'])
    expect(boardView.columns[0].sections[0].cards.map((card) => card.slug)).toEqual(['b-card', 'a-card'])
  })

  it('filters cards by assignee and keeps reorder available when filters are active', () => {
    const preferences = createDefaultBoardViewPreferences()
    preferences.filters.assignee = 'galen'

    const filtered = applyBoardViewPreferences(createBoardView(), createCardsBySlug(), preferences)

    expect(filtered.columns[0].sections[0].cards.map((card) => card.slug)).toEqual(['a-card'])
    expect(isCardReorderEnabled(preferences)).toBe(true)
  })
})

function createBoardView(): BoardView {
  return {
    descendantBoardCount: 0,
    columns: [
      {
        name: 'Todo',
        slug: 'todo',
        index: 0,
        cards: [
          createCardLink('b-card', 'Root Board'),
          createCardLink('a-card', 'Root Board'),
        ],
        sections: [
          {
            name: null,
            slug: null,
            key: 'default',
            index: 0,
            cards: [
              createCardLink('b-card', 'Root Board'),
              createCardLink('a-card', 'Root Board'),
            ],
          },
        ],
      },
    ],
  }
}

function createCardsBySlug(): Record<string, KanbanCardDocument> {
  const cardsBySlug: Record<string, KanbanCardDocument> = {
    'a-card': {
      kind: 'card',
      slug: 'a-card',
      path: 'TODO/cards/a-card.md',
      title: 'Alpha',
      metadata: { assignee: 'galen', priority: 'high' },
      body: 'Important task',
      sections: [],
      checklist: [],
      wikilinks: [],
      diagnostics: [],
    },
    'b-card': {
      kind: 'card',
      slug: 'b-card',
      path: 'TODO/cards/b-card.md',
      title: 'Beta',
      metadata: { assignee: 'sara', priority: 'low' },
      body: 'Routine task',
      sections: [],
      checklist: [],
      wikilinks: [],
      diagnostics: [],
    },
  }

  return cardsBySlug
}

function createCardLink(slug: string, sourceBoardTitle: string) {
  return {
    slug,
    target: `cards/${slug}`,
    isRolledUp: false,
    sourceBoardSlug: 'root-board',
    sourceBoardTitle,
    sourceSectionName: null,
    sourceSectionSlug: null,
  }
}
