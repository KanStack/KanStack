import type { KanbanBoardDocument, KanbanCardDocument, KanbanParseResult } from '@docs/schemas/kanban-parser-schema'

export interface WorkspaceFileSnapshot {
  path: string
  content: string
}

export interface WorkspaceSnapshot {
  rootPath: string
  rootBoardPath: string
  boards: WorkspaceFileSnapshot[]
  cards: WorkspaceFileSnapshot[]
}

export interface WorkspaceCardSelection {
  slug: string
  sourceBoardSlug: string
}

export interface VisibleBoardCardSelection extends WorkspaceCardSelection {
  columnIndex: number
  rowIndex: number
}

export interface WorkspaceMutationPayload {
  currentBoardSlug?: string | null
  selectedCard?: WorkspaceCardSelection | null
  snapshot: WorkspaceSnapshot
}

export interface LoadedWorkspace {
  rootPath: string
  rootBoardSlug: string
  snapshot: WorkspaceSnapshot
  parseResult: KanbanParseResult
  boardsBySlug: Record<string, KanbanBoardDocument>
  boardFilesBySlug: Record<string, WorkspaceFileSnapshot>
  cardsBySlug: Record<string, KanbanCardDocument>
  boardOrder: string[]
}
