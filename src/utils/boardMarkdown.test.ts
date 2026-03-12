import { describe, expect, it } from 'vitest'

import { parseWorkspace } from '@/utils/parseWorkspace'
import {
  addBoardColumnMarkdown,
  addSubBoardMarkdown,
  archiveBoardCardMarkdown,
  createBoardMarkdown,
  deleteBoardColumnMarkdown,
  moveBoardCardMarkdown,
  reorderBoardColumnsMarkdown,
  renameBoardColumnMarkdown,
  renameBoardMarkdown,
} from '@/utils/serializeBoard'

const BOARD_PATH = 'boards/main.md'

describe('board markdown contract', () => {
  it('parses named sections without flattening them away', () => {
    const board = parseBoard([
      '# Main',
      '',
      '## Todo',
      '',
      '- [[cards/a]]',
      '',
      '### Review',
      '',
      '- [[cards/b]]',
    ].join('\n'))

    expect(board.columns).toHaveLength(1)
    expect(board.columns[0].sections.map((section) => ({
      name: section.name,
      cards: section.cards.map((card) => card.slug),
    }))).toEqual([
      { name: null, cards: ['a'] },
      { name: 'Review', cards: ['b'] },
    ])
  })

  it('preserves sections and settings across board moves', () => {
    const board = parseBoard([
      '# Main',
      '',
      '%% kanban:settings',
      '```json',
      '{"show-sub-boards":true,"show-archive-column":true}',
      '```',
      '%%',
      '',
      '## Todo',
      '',
      '- [[cards/a]]',
      '',
      '### Review',
      '',
      '- [[cards/b]]',
    ].join('\n'))

    const nextContent = moveBoardCardMarkdown(board, {
      cardSlug: 'a',
      targetColumnName: 'Todo',
      targetColumnSlug: 'todo',
      targetSectionName: 'Review',
      targetSectionSlug: 'review',
      targetIndex: 0,
    })

    expect(nextContent).toContain('%% kanban:settings')
    expect(nextContent).toContain('### Review')

    const reparsedBoard = parseBoard(nextContent)
    expect(reparsedBoard.columns[0].sections.map((section) => ({
      name: section.name,
      cards: section.cards.map((card) => card.slug),
    }))).toEqual([
      { name: 'Review', cards: ['a', 'b'] },
    ])
    expect(reparsedBoard.settings?.['show-sub-boards']).toBe(true)
    expect(reparsedBoard.settings?.['show-archive-column']).toBe(true)
  })

  it('creates an archive column on demand when archiving a card', () => {
    const board = parseBoard([
      '# Main',
      '',
      '## Todo',
      '',
      '- [[cards/a]]',
    ].join('\n'))

    const nextContent = archiveBoardCardMarkdown(board, 'a')

    expect(nextContent).toContain('## Archive')

    const reparsedBoard = parseBoard(nextContent)
    expect(reparsedBoard.columns.map((column) => ({
      slug: column.slug,
      cards: column.sections.flatMap((section) => section.cards.map((card) => card.slug)),
    }))).toEqual([
      { slug: 'todo', cards: [] },
      { slug: 'archive', cards: ['a'] },
    ])
  })

  it('creates a linked sub board and preserves parent column structure in the child board', () => {
    const board = parseBoard([
      '---',
      'title: Main',
      '---',
      '',
      '## Todo',
      '',
      '### Review',
      '',
      '## Done',
    ].join('\n'))

    const parentContent = addSubBoardMarkdown(board, {
      boardSlug: 'untitled-board',
      boardTitle: 'Untitled Board',
    })
    const childContent = createBoardMarkdown('Untitled Board', board)

    expect(parentContent).toContain('## Sub Boards')
    expect(parentContent).toContain('- [[boards/untitled-board|Untitled Board]]')

    const childBoard = parseBoard(childContent, 'boards/untitled-board.md')
    expect(childBoard.title).toBe('Untitled Board')
    expect(childBoard.columns.map((column) => ({
      name: column.name,
      sections: column.sections.map((section) => section.name),
    }))).toEqual([
      { name: 'Todo', sections: [] },
      { name: 'Done', sections: [] },
    ])
  })

  it('renames a board title in frontmatter without changing columns', () => {
    const board = parseBoard([
      '---',
      'title: Main',
      '---',
      '',
      '## Todo',
    ].join('\n'))

    const renamedContent = renameBoardMarkdown(board, 'Renamed Board')
    const renamedBoard = parseBoard(renamedContent)

    expect(renamedBoard.title).toBe('Renamed Board')
    expect(renamedBoard.columns.map((column) => column.name)).toEqual(['Todo'])
  })

  it('adds, renames, and deletes columns while preserving board content', () => {
    const board = parseBoard([
      '# Main',
      '',
      '## Todo',
      '',
      '- [[cards/a]]',
    ].join('\n'))

    const withColumn = parseBoard(addBoardColumnMarkdown(board, { name: 'Doing', slug: 'doing' }))
    expect(withColumn.columns.map((column) => column.slug)).toEqual(['todo', 'doing'])

    const renamedColumn = parseBoard(renameBoardColumnMarkdown(withColumn, 'doing', 'In Progress', 'in-progress'))
    expect(renamedColumn.columns.map((column) => ({ name: column.name, slug: column.slug }))).toEqual([
      { name: 'Todo', slug: 'todo' },
      { name: 'In Progress', slug: 'in-progress' },
    ])

    const withoutColumn = parseBoard(deleteBoardColumnMarkdown(renamedColumn, 'in-progress'))
    expect(withoutColumn.columns.map((column) => column.slug)).toEqual(['todo'])
    expect(withoutColumn.columns[0].sections[0].cards.map((card) => card.slug)).toEqual(['a'])
  })

  it('keeps archive last for added and reordered columns', () => {
    const board = parseBoard([
      '# Main',
      '',
      '## Todo',
      '',
      '## Archive',
    ].join('\n'))

    const withColumn = parseBoard(addBoardColumnMarkdown(board, { name: 'Doing', slug: 'doing' }))
    expect(withColumn.columns.map((column) => column.slug)).toEqual(['todo', 'doing', 'archive'])

    const reorderedBoard = parseBoard(reorderBoardColumnsMarkdown(withColumn, ['doing', 'todo', 'archive']))
    expect(reorderedBoard.columns.map((column) => column.slug)).toEqual(['doing', 'todo', 'archive'])
  })
})

function parseBoard(content: string, path = BOARD_PATH) {
  return parseWorkspace({
    rootPath: '/tmp/workspace',
    boards: [{ path, content }],
    cards: [],
  }).boards[0]
}
