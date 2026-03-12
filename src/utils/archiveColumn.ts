import type { KanbanBoardDocument } from '@docs/schemas/kanban-parser-schema'

export const ARCHIVE_COLUMN_NAME = 'Archive'
export const ARCHIVE_COLUMN_SLUG = 'archive'
export const SHOW_ARCHIVE_COLUMN_SETTING = 'show-archive-column'

export function isArchiveColumnSlug(slug: string) {
  return slug === ARCHIVE_COLUMN_SLUG
}

export function findArchiveColumn(board: KanbanBoardDocument) {
  return board.columns.find((column) => isArchiveColumnSlug(column.slug)) ?? null
}
