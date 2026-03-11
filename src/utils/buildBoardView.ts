import type {
  KanbanBoardDocument,
  KanbanBoardLink,
  KanbanCardLink,
} from '@docs/schemas/kanban-parser-schema'

export interface BoardViewCardLink extends KanbanCardLink {
  isRolledUp: boolean
  sourceBoardSlug: string
  sourceBoardTitle: string
}

export interface BoardViewColumn {
  name: string
  slug: string
  index: number
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
  cards: BoardViewCardLink[]
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
      targetColumn.cards.push(
        ...section.cards.map((cardLink) => createViewCardLink(cardLink, board, isRolledUp)),
      )
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
    cards: [],
  }
  columns.push(column)
  columnMap.set(slug, column)
  return column
}

function createViewCardLink(
  cardLink: KanbanCardLink,
  board: KanbanBoardDocument,
  isRolledUp: boolean,
): BoardViewCardLink {
  return {
    ...cardLink,
    isRolledUp,
    sourceBoardSlug: board.slug,
    sourceBoardTitle: board.title,
  }
}
