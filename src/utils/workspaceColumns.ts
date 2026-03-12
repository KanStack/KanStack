import type { KanbanBoardDocument, KanbanColumn } from '@docs/schemas/kanban-parser-schema'
import { ARCHIVE_COLUMN_SLUG } from '@/utils/archiveColumn'

export interface WorkspaceColumnTemplate {
  name: string
  slug: string
}

export function deriveWorkspaceColumns(
  boardsBySlug: Record<string, KanbanBoardDocument>,
  preferredBoard?: KanbanBoardDocument | null,
) {
  const templates: WorkspaceColumnTemplate[] = []
  const seen = new Set<string>()

  const orderedBoards = preferredBoard
    ? [preferredBoard, ...Object.values(boardsBySlug).filter((board) => board.slug !== preferredBoard.slug)]
    : Object.values(boardsBySlug)

  for (const board of orderedBoards) {
    for (const column of board.columns) {
      if (seen.has(column.slug)) {
        continue
      }

      seen.add(column.slug)
      templates.push({
        name: column.name,
        slug: column.slug,
      })
    }
  }

  return normalizeWorkspaceColumns(templates)
}

export function countCardsInColumn(column: KanbanColumn | undefined) {
  if (!column) {
    return 0
  }

  return column.sections.reduce((total, section) => total + section.cards.length, 0)
}

export function insertWorkspaceColumnBeforeArchive(
  columns: WorkspaceColumnTemplate[],
  nextColumn: WorkspaceColumnTemplate,
) {
  const nextColumns = columns.filter((column) => column.slug !== nextColumn.slug)
  const archiveIndex = nextColumns.findIndex((column) => column.slug === ARCHIVE_COLUMN_SLUG)

  if (archiveIndex === -1) {
    nextColumns.push(nextColumn)
  } else {
    nextColumns.splice(archiveIndex, 0, nextColumn)
  }

  return normalizeWorkspaceColumns(nextColumns)
}

export function reorderWorkspaceColumns(
  columns: WorkspaceColumnTemplate[],
  draggedSlug: string,
  targetIndex: number,
) {
  const movableColumns = columns.filter((column) => column.slug !== ARCHIVE_COLUMN_SLUG)
  const archiveColumn = columns.find((column) => column.slug === ARCHIVE_COLUMN_SLUG) ?? null
  const draggedIndex = movableColumns.findIndex((column) => column.slug === draggedSlug)

  if (draggedIndex === -1) {
    return normalizeWorkspaceColumns(columns)
  }

  const [draggedColumn] = movableColumns.splice(draggedIndex, 1)
  const nextIndex = Math.max(0, Math.min(targetIndex, movableColumns.length))
  movableColumns.splice(nextIndex, 0, draggedColumn)

  return archiveColumn ? [...movableColumns, archiveColumn] : movableColumns
}

function normalizeWorkspaceColumns(columns: WorkspaceColumnTemplate[]) {
  const archiveColumn = columns.find((column) => column.slug === ARCHIVE_COLUMN_SLUG) ?? null
  const normalColumns = columns.filter((column) => column.slug !== ARCHIVE_COLUMN_SLUG)

  return archiveColumn ? [...normalColumns, archiveColumn] : normalColumns
}
