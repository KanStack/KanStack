import { stringify } from 'yaml'

import type {
  KanbanBoardDocument,
  KanbanBoardLink,
  KanbanCardLink,
  KanbanColumn,
  KanbanSection,
  MarkdownRecord,
  MarkdownValue,
} from '@docs/schemas/kanban-parser-schema'
import { ARCHIVE_COLUMN_NAME, ARCHIVE_COLUMN_SLUG, isArchiveColumnSlug } from '@/utils/archiveColumn'
import { serializeBoardSettingsBlock } from '@/utils/serializeBoardSettings'
import type { WorkspaceColumnTemplate } from '@/utils/workspaceColumns'

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
  targetSectionName?: string | null
  targetSectionSlug?: string | null
}

export interface AddSubBoardInput {
  boardSlug: string
  boardTitle?: string
}

export interface RenameBoardColumnResult {
  name: string
  slug: string
}

export function moveBoardCardMarkdown(board: KanbanBoardDocument, input: MoveBoardCardInput) {
  const nextBoard = cloneBoard(board)
  const removedCard = removeCard(nextBoard.columns, input.cardSlug)

  if (!removedCard) {
    throw new Error(`Could not find card \`${input.cardSlug}\` in board \`${board.slug}\`.`)
  }

  const targetColumn = getOrCreateColumn(nextBoard.columns, input.targetColumnSlug, input.targetColumnName)
  const targetSection = getOrCreateSection(targetColumn, input.targetSectionSlug, input.targetSectionName)
  const targetIndex = Math.max(0, Math.min(input.targetIndex, targetSection.cards.length))

  targetSection.cards.splice(targetIndex, 0, removedCard)
  pruneEmptySections(nextBoard.columns)

  return serializeBoardMarkdown(nextBoard)
}

export function addBoardCardMarkdown(board: KanbanBoardDocument, input: AddBoardCardInput) {
  const nextBoard = cloneBoard(board)
  const targetColumn = getOrCreateColumn(nextBoard.columns, input.targetColumnSlug, input.targetColumnName)
  const targetSection = getOrCreateSection(
    targetColumn,
    input.targetSectionSlug ?? null,
    input.targetSectionName ?? null,
  )

  targetSection.cards.push({
    slug: input.cardSlug,
    target: `cards/${input.cardSlug}`,
    title: input.cardTitle,
  })

  pruneEmptySections(nextBoard.columns)
  return serializeBoardMarkdown(nextBoard)
}

export function archiveBoardCardMarkdown(board: KanbanBoardDocument, cardSlug: string) {
  return archiveBoardCardsMarkdown(board, [cardSlug])
}

export function archiveBoardCardsMarkdown(board: KanbanBoardDocument, cardSlugs: string[]) {
  const nextBoard = cloneBoard(board)
  const removedCards = cardSlugs
    .map((slug) => removeCard(nextBoard.columns, slug))
    .filter((card): card is KanbanCardLink => Boolean(card))

  if (!removedCards.length) {
    throw new Error('Could not find any selected cards in the target board.')
  }

  const targetColumn = getOrCreateColumn(nextBoard.columns, ARCHIVE_COLUMN_SLUG, ARCHIVE_COLUMN_NAME)
  const targetSection = getOrCreateSection(targetColumn, null, null)
  targetSection.cards.push(...removedCards)
  pruneEmptySections(nextBoard.columns)

  return serializeBoardMarkdown(nextBoard)
}

export function addSubBoardMarkdown(board: KanbanBoardDocument, input: AddSubBoardInput) {
  const nextBoard = cloneBoard(board)
  nextBoard.subBoards.push({
    slug: input.boardSlug,
    target: `boards/${input.boardSlug}`,
    title: input.boardTitle,
  })

  return serializeBoardMarkdown(nextBoard)
}

export function createBoardMarkdown(title: string, templateBoard?: KanbanBoardDocument) {
  return createBoardMarkdownFromColumns(
    title,
    templateBoard
      ? templateBoard.columns.filter((column) => !isArchiveColumnSlug(column.slug)).map((column) => ({
          name: column.name,
          slug: column.slug,
        }))
      : [],
  )
}

export function createBoardMarkdownFromColumns(title: string, columns: WorkspaceColumnTemplate[]) {
  const nextBoard: KanbanBoardDocument = {
    kind: 'board',
    slug: '',
    path: '',
    title,
    frontmatter: { title },
    columns: columns.map((column, index) => ({
      name: column.name,
      slug: column.slug,
      index,
      sections: [],
    })),
    subBoards: [],
    settings: null,
    diagnostics: [],
  }

  return serializeBoardMarkdown(nextBoard)
}

export function renameBoardMarkdown(board: KanbanBoardDocument, title: string) {
  const nextBoard = cloneBoard(board)
  nextBoard.title = title.trim()
  nextBoard.frontmatter = {
    ...nextBoard.frontmatter,
    title: nextBoard.title,
  }

  return serializeBoardMarkdown(nextBoard)
}

export function addBoardColumnMarkdown(board: KanbanBoardDocument, column: WorkspaceColumnTemplate) {
  const nextBoard = cloneBoard(board)
  const existing = nextBoard.columns.find((entry) => entry.slug === column.slug)
  if (!existing) {
    const archiveIndex = nextBoard.columns.findIndex((entry) => entry.slug === ARCHIVE_COLUMN_SLUG)
    const nextColumn: KanbanColumn = {
      name: column.name,
      slug: column.slug,
      index: nextBoard.columns.length,
      sections: [],
    }

    if (archiveIndex === -1) {
      nextBoard.columns.push(nextColumn)
    } else {
      nextBoard.columns.splice(archiveIndex, 0, nextColumn)
    }
  }

  reindexColumns(nextBoard.columns)
  return serializeBoardMarkdown(nextBoard)
}

export function renameBoardColumnMarkdown(
  board: KanbanBoardDocument,
  currentSlug: string,
  nextName: string,
  nextSlug: string,
) {
  const nextBoard = cloneBoard(board)
  const column = nextBoard.columns.find((entry) => entry.slug === currentSlug)
  if (!column) {
    throw new Error(`Could not find column \`${currentSlug}\` in board \`${board.slug}\`.`)
  }

  column.name = nextName
  column.slug = nextSlug
  reindexColumns(nextBoard.columns)
  renameColumnSettings(nextBoard, currentSlug, nextSlug)
  return serializeBoardMarkdown(nextBoard)
}

export function deleteBoardColumnMarkdown(board: KanbanBoardDocument, columnSlug: string) {
  const nextBoard = cloneBoard(board)
  nextBoard.columns = nextBoard.columns.filter((column) => column.slug !== columnSlug)
  reindexColumns(nextBoard.columns)
  deleteColumnSettings(nextBoard, columnSlug)
  return serializeBoardMarkdown(nextBoard)
}

export function reorderBoardColumnsMarkdown(board: KanbanBoardDocument, orderedSlugs: string[]) {
  const nextBoard = cloneBoard(board)
  const orderMap = new Map(orderedSlugs.map((slug, index) => [slug, index]))

  nextBoard.columns = [...nextBoard.columns].sort((left, right) => {
    const leftIndex = orderMap.get(left.slug) ?? Number.MAX_SAFE_INTEGER
    const rightIndex = orderMap.get(right.slug) ?? Number.MAX_SAFE_INTEGER
    return leftIndex - rightIndex
  })

  reindexColumns(nextBoard.columns)
  return serializeBoardMarkdown(nextBoard)
}

export function syncBoardColumnsMarkdown(board: KanbanBoardDocument, columns: WorkspaceColumnTemplate[]) {
  const nextBoard = cloneBoard(board)
  const existingBySlug = new Map(nextBoard.columns.map((column) => [column.slug, column]))

  nextBoard.columns = columns.map((column, index) => {
    const existing = existingBySlug.get(column.slug)
    return existing
      ? { ...existing, name: column.name, slug: column.slug, index }
      : { name: column.name, slug: column.slug, index, sections: [] }
  })

  deleteOrphanedColumnSettings(nextBoard, new Set(columns.map((column) => column.slug)))
  return serializeBoardMarkdown(nextBoard)
}

function pruneEmptySections(columns: KanbanColumn[]) {
  for (const column of columns) {
    column.sections = column.sections
      .filter((section) => section.cards.length > 0 || section.name !== null)
      .map((section, index) => ({
        ...section,
        index,
      }))
  }
}

function serializeBoardMarkdown(board: KanbanBoardDocument) {
  const parts: string[] = []
  const frontmatter = serializeRecord(board.frontmatter)
  if (frontmatter) {
    parts.push(`---\n${frontmatter}\n---`)
  }

  const settings = serializeBoardSettingsBlock(board.settings)
  if (settings) {
    parts.push(settings)
  }

  for (const column of board.columns) {
    const columnLines: string[] = [`## ${column.name}`]

    for (const section of column.sections) {
      if (section.name) {
        columnLines.push('', `### ${section.name}`)
      }

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

function renameColumnSettings(board: KanbanBoardDocument, currentSlug: string, nextSlug: string) {
  const columnSettings = board.settings?.['column-settings']
  if (!columnSettings || currentSlug === nextSlug) {
    return
  }

  if (columnSettings[currentSlug]) {
    columnSettings[nextSlug] = columnSettings[currentSlug]
    delete columnSettings[currentSlug]
  }
}

function deleteColumnSettings(board: KanbanBoardDocument, columnSlug: string) {
  const columnSettings = board.settings?.['column-settings']
  if (!columnSettings) {
    return
  }

  delete columnSettings[columnSlug]
}

function deleteOrphanedColumnSettings(board: KanbanBoardDocument, allowedSlugs: Set<string>) {
  const columnSettings = board.settings?.['column-settings']
  if (!columnSettings) {
    return
  }

  for (const slug of Object.keys(columnSettings)) {
    if (!allowedSlugs.has(slug)) {
      delete columnSettings[slug]
    }
  }
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

function reindexColumns(columns: KanbanColumn[]) {
  columns.forEach((column, index) => {
    column.index = index
  })
}

function getOrCreateSection(column: KanbanColumn, _slug: string | null, _name: string | null) {
  const existing = column.sections.find((section) => {
    if (_slug !== null) {
      return section.slug === _slug
    }

    return section.slug === null && section.name === _name
  })

  if (existing) {
    return existing
  }

  const section: KanbanSection = {
    name: _name,
    slug: _slug,
    index: column.sections.length,
    cards: [],
  }

  column.sections.push(section)
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
