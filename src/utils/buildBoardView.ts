import type {
  KanbanBoardDocument,
  KanbanBoardLink,
  KanbanCardLink,
  KanbanSection,
} from '@docs/schemas/kanban-parser-schema'
import { sectionKeyFromSlug } from '@/utils/kanbanPath'

export interface BoardViewCardLink extends KanbanCardLink {
  isRolledUp: boolean
  sourceBoardSlug: string
  sourceBoardTitle: string
  sourceSectionName: string | null
  sourceSectionSlug: string | null
}

export interface BoardViewSection {
  name: string | null
  slug: string | null
  key: string
  index: number
  cards: BoardViewCardLink[]
}

export interface BoardViewColumn {
  name: string
  slug: string
  index: number
  sections: BoardViewSection[]
  cards: BoardViewCardLink[]
}

export interface BoardView {
  columns: BoardViewColumn[]
  descendantBoardCount: number
}

interface MutableColumn {
  name: string
  slug: string
  index: number
  sections: BoardViewSection[]
  cards: BoardViewCardLink[]
  sectionMap: Map<string, BoardViewSection>
}

export function buildBoardView(
  board: KanbanBoardDocument,
  boardsBySlug: Record<string, KanbanBoardDocument>,
  includeSubBoards: boolean,
): BoardView {
  const columns: MutableColumn[] = []
  const columnMap = new Map<string, MutableColumn>()

  mergeBoard(columns, columnMap, board, false)

  const visitedBoards = new Set<string>()
  if (includeSubBoards) {
    for (const link of board.subBoards) {
      walkSubBoards(link, boardsBySlug, visitedBoards, (descendantBoard) => {
        mergeBoard(columns, columnMap, descendantBoard, true)
      })
    }
  }

  return {
    columns: columns.map((column) => ({
      name: column.name,
      slug: column.slug,
      index: column.index,
      sections: column.sections,
      cards: column.cards,
    })),
    descendantBoardCount: visitedBoards.size,
  }
}

function walkSubBoards(
  link: KanbanBoardLink,
  boardsBySlug: Record<string, KanbanBoardDocument>,
  visitedBoards: Set<string>,
  visit: (board: KanbanBoardDocument) => void,
) {
  const board = boardsBySlug[link.slug]
  if (!board || visitedBoards.has(board.slug)) {
    return
  }

  visitedBoards.add(board.slug)
  visit(board)

  for (const childLink of board.subBoards) {
    walkSubBoards(childLink, boardsBySlug, visitedBoards, visit)
  }
}

function mergeBoard(
  columns: MutableColumn[],
  columnMap: Map<string, MutableColumn>,
  board: KanbanBoardDocument,
  isRolledUp: boolean,
) {
  for (const column of board.columns) {
    const targetColumn = getOrCreateColumn(columns, columnMap, column.slug, column.name)

    for (const section of column.sections) {
      const targetSection = getOrCreateSection(targetColumn, section)
      const cards = section.cards.map((cardLink) => createViewCardLink(cardLink, board, section, isRolledUp))
      targetSection.cards.push(...cards)
      targetColumn.cards.push(...cards)
    }
  }
}

function getOrCreateColumn(
  columns: MutableColumn[],
  columnMap: Map<string, MutableColumn>,
  slug: string,
  name: string,
) {
  const existing = columnMap.get(slug)
  if (existing) {
    return existing
  }

  const column: MutableColumn = {
    name,
    slug,
    index: columns.length,
    sections: [],
    cards: [],
    sectionMap: new Map<string, BoardViewSection>(),
  }
  columns.push(column)
  columnMap.set(slug, column)
  return column
}

function getOrCreateSection(column: MutableColumn, section: KanbanSection) {
  const key = sectionKeyFromSlug(section.slug)
  const existing = column.sectionMap.get(key)
  if (existing) {
    return existing
  }

  const nextSection: BoardViewSection = {
    name: section.name,
    slug: section.slug,
    key,
    index: column.sections.length,
    cards: [],
  }

  column.sections.push(nextSection)
  column.sectionMap.set(key, nextSection)
  return nextSection
}

function createViewCardLink(
  cardLink: KanbanCardLink,
  board: KanbanBoardDocument,
  section: KanbanSection,
  isRolledUp: boolean,
): BoardViewCardLink {
  return {
    ...cardLink,
    isRolledUp,
    sourceBoardSlug: board.slug,
    sourceBoardTitle: board.title,
    sourceSectionName: section.name,
    sourceSectionSlug: section.slug,
  }
}
