import type { KanbanBoardDocument, KanbanCardDocument, KanbanParseResult } from '@docs/schemas/kanban-parser-schema'

export interface WorkspaceFileSnapshot {
  path: string
  content: string
}

export interface WorkspaceSnapshot {
  rootPath: string
  boards: WorkspaceFileSnapshot[]
  cards: WorkspaceFileSnapshot[]
}

export interface LoadedWorkspace {
  rootPath: string
  parseResult: KanbanParseResult
  boardsBySlug: Record<string, KanbanBoardDocument>
  boardFilesBySlug: Record<string, WorkspaceFileSnapshot>
  cardsBySlug: Record<string, KanbanCardDocument>
  boardOrder: string[]
}
