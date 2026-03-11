import { stringify } from 'yaml'

import type {
  KanbanBoardDocument,
  KanbanBoardLink,
  KanbanBoardSettings,
  KanbanCardLink,
  KanbanColumn,
  KanbanSection,
  MarkdownRecord,
  MarkdownValue,
} from '@docs/schemas/kanban-parser-schema'

export interface MoveBoardCardInput {
  cardSlug: string
  targetColumnName: string
  targetColumnSlug: string
  targetSectionName: string | null
  targetSectionSlug: string | null
  targetIndex: number
}

export interface AddBoardCardInput {
  cardSlug: string
  cardTitle?: string
  targetColumnName: string
  targetColumnSlug: string
}

export function moveBoardCardMarkdown(board: KanbanBoardDocument, input: MoveBoardCardInput) {
  console.debug('[kanstack:serialize-board:move:start]', {
    boardSlug: board.slug,
    cardSlug: input.cardSlug,
    targetColumnSlug: input.targetColumnSlug,
    targetColumnName: input.targetColumnName,
    targetSectionSlug: input.targetSectionSlug,
    targetSectionName: input.targetSectionName,
    targetIndex: input.targetIndex,
    boardColumns: board.columns.map((column) => ({
      slug: column.slug,
      name: column.name,
      sections: column.sections.map((section) => ({
        slug: section.slug,
        name: section.name,
        cards: section.cards.map((card) => card.slug),
      })),
    })),
  })

  const nextBoard = cloneBoard(board)
  const removedCard = removeCard(nextBoard.columns, input.cardSlug)

  if (!removedCard) {
    console.debug('[kanstack:serialize-board:move:not-found]', {
      boardSlug: board.slug,
      cardSlug: input.cardSlug,
    })
    throw new Error(`Could not find card \`${input.cardSlug}\` in board \`${board.slug}\`.`)
  }

  const targetColumn = getOrCreateColumn(nextBoard.columns, input.targetColumnSlug, input.targetColumnName)
  const targetSection = getOrCreateSection(targetColumn, input.targetSectionSlug, input.targetSectionName)
  const targetIndex = Math.max(0, Math.min(input.targetIndex, targetSection.cards.length))

  targetSection.cards.splice(targetIndex, 0, removedCard)
  pruneEmptySections(nextBoard.columns)

  console.debug('[kanstack:serialize-board:move:complete]', {
    boardSlug: board.slug,
    cardSlug: input.cardSlug,
    insertedInto: {
      columnSlug: targetColumn.slug,
      sectionSlug: targetSection.slug,
      targetIndex,
    },
    resultingColumns: nextBoard.columns.map((column) => ({
      slug: column.slug,
      sections: column.sections.map((section) => ({
        slug: section.slug,
        cards: section.cards.map((card) => card.slug),
      })),
    })),
  })

  return serializeBoardMarkdown(nextBoard)
}

export function addBoardCardMarkdown(board: KanbanBoardDocument, input: AddBoardCardInput) {
  const nextBoard = cloneBoard(board)
  const targetColumn = getOrCreateColumn(nextBoard.columns, input.targetColumnSlug, input.targetColumnName)
  const targetSection = getOrCreateSection(targetColumn, null, null)

  targetSection.cards.push({
    slug: input.cardSlug,
    target: `cards/${input.cardSlug}`,
    title: input.cardTitle,
  })

  pruneEmptySections(nextBoard.columns)
  return serializeBoardMarkdown(nextBoard)
}

function pruneEmptySections(columns: KanbanColumn[]) {
  for (const column of columns) {
    const cards = column.sections.flatMap((section) => section.cards)
    column.sections = cards.length
      ? [{ name: null, slug: null, index: 0, cards }]
      : []
  }
}

function serializeBoardMarkdown(board: KanbanBoardDocument) {
  const parts: string[] = []
  const frontmatter = serializeRecord(board.frontmatter)
  if (frontmatter) {
    parts.push(`---\n${frontmatter}\n---`)
  }

  const settings = serializeSettings(board.settings)
  if (settings) {
    parts.push(settings)
  }

  for (const column of board.columns) {
    const columnLines: string[] = [`## ${column.name}`]

    for (const section of column.sections) {
      for (const card of section.cards) {
        columnLines.push('', serializeWikiBullet(card))
      }
    }

    parts.push(trimTrailingBlankLines(columnLines.join('\n')))
  }

  if (board.subBoards.length) {
    const subBoardLines = ['## Sub Boards']
    for (const subBoard of board.subBoards) {
      subBoardLines.push('', serializeWikiBullet(subBoard))
    }
    parts.push(trimTrailingBlankLines(subBoardLines.join('\n')))
  }

  return `${parts.filter(Boolean).join('\n\n').trimEnd()}\n`
}

function serializeSettings(settings: KanbanBoardSettings | null) {
  if (!settings) {
    return ''
  }

  const cleaned = cleanRecord(settings)
  if (!Object.keys(cleaned).length) {
    return ''
  }

  return ['%% kanban:settings', '```json', JSON.stringify(cleaned, null, 2), '```', '%%'].join('\n')
}

function serializeRecord(record: MarkdownRecord) {
  const cleaned = cleanRecord(record)
  if (!Object.keys(cleaned).length) {
    return ''
  }

  return stringify(cleaned, { lineWidth: 0, simpleKeys: true }).trimEnd()
}

function cleanRecord(record: MarkdownRecord) {
  return Object.fromEntries(
    Object.entries(record)
      .map(([key, value]) => [key, cleanValue(value)])
      .filter(([, value]) => value !== undefined),
  ) as MarkdownRecord
}

function cleanValue(value: MarkdownValue | undefined): MarkdownValue | undefined {
  if (value === undefined) {
    return undefined
  }

  if (Array.isArray(value)) {
    const cleaned = value
      .map((entry) => cleanValue(entry))
      .filter((entry): entry is MarkdownValue => entry !== undefined)
    return cleaned.length ? cleaned : undefined
  }

  if (value && typeof value === 'object') {
    const cleaned = cleanRecord(value as MarkdownRecord)
    return Object.keys(cleaned).length ? cleaned : undefined
  }

  return value
}

function removeCard(columns: KanbanColumn[], cardSlug: string) {
  for (const column of columns) {
    for (const section of column.sections) {
      const index = section.cards.findIndex((card) => card.slug === cardSlug)
      if (index >= 0) {
        return section.cards.splice(index, 1)[0]
      }
    }
  }

  return null
}

function getOrCreateColumn(columns: KanbanColumn[], slug: string, name: string) {
  const existing = columns.find((column) => column.slug === slug)
  if (existing) {
    return existing
  }

  const column: KanbanColumn = {
    name,
    slug,
    index: columns.length,
    sections: [],
  }
  columns.push(column)
  return column
}

function getOrCreateSection(column: KanbanColumn, _slug: string | null, _name: string | null) {
  const existing = column.sections.find((section) => (section.slug ?? null) === null)
  if (existing) {
    return existing
  }

  const section: KanbanSection = {
    name: null,
    slug: null,
    index: 0,
    cards: [],
  }

  column.sections = [section]
  return section
}

function serializeWikiBullet(link: KanbanCardLink | KanbanBoardLink) {
  const label = link.title ? `${link.target}|${link.title}` : link.target
  return `- [[${label}]]`
}

function trimTrailingBlankLines(value: string) {
  return value.replace(/(\n\s*)+$/, '')
}

function cloneBoard(board: KanbanBoardDocument): KanbanBoardDocument {
  return {
    ...board,
    frontmatter: structuredClone(board.frontmatter),
    settings: board.settings ? structuredClone(board.settings) : null,
    columns: board.columns.map((column) => ({
      ...column,
      sections: column.sections.map((section) => ({
        ...section,
        cards: section.cards.map((card) => ({ ...card })),
      })),
    })),
    subBoards: board.subBoards.map((subBoard) => ({ ...subBoard })),
    diagnostics: [...board.diagnostics],
  }
}
