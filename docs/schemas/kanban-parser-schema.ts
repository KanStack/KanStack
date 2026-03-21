export type MarkdownValue =
  | string
  | number
  | boolean
  | null
  | MarkdownValue[]
  | { [key: string]: MarkdownValue | undefined }

export type MarkdownRecord = Record<string, MarkdownValue | undefined>

export interface KanbanDiagnostic {
  level: 'error' | 'warning'
  code: string
  message: string
  path: string
  line?: number
  column?: number
}

export interface KanbanCardLink {
  slug: string
  target: string
  title?: string
}

export interface KanbanBoardLink {
  slug: string
  target: string
  title?: string
}

export interface KanbanChecklistItem {
  checked: boolean
  text: string
}

export interface KanbanCardSection {
  name: string
  slug: string
  index: number
  markdown: string
  checklist: KanbanChecklistItem[]
  wikilinks: string[]
}

export interface KanbanSection {
  name: string | null
  slug: string | null
  index: number
  cards: KanbanCardLink[]
}

export interface KanbanColumn {
  name: string
  slug: string
  index: number
  sections: KanbanSection[]
}

export type KanbanCardType = 'task' | 'bug' | 'feature' | 'research' | 'chore'
export type KanbanCardPriority = 'low' | 'medium' | 'high'

export interface KanbanCardMetadata extends MarkdownRecord {
  title?: string
  type?: KanbanCardType | string
  priority?: KanbanCardPriority | string
  assignee?: string
  due?: string
  tags?: MarkdownValue[]
  estimate?: number
}

export interface KanbanColumnSetting extends MarkdownRecord {
  'wip-limit'?: number
  collapsed?: boolean
  'default-section'?: string
  hidden?: boolean
}

export interface KanbanBoardSettings extends MarkdownRecord {
  'show-sub-boards'?: boolean
  'show-archive-column'?: boolean
  'group-by'?: string
  'show-empty-columns'?: boolean
  'card-preview'?: string
  'list-collapse'?: MarkdownValue[]
  'column-settings'?: Record<string, KanbanColumnSetting>
}

export interface KanbanCardDocument {
  kind: 'card'
  slug: string
  path: string
  title: string
  metadata: KanbanCardMetadata
  body: string
  sections: KanbanCardSection[]
  checklist: KanbanChecklistItem[]
  wikilinks: string[]
  diagnostics: KanbanDiagnostic[]
}

export interface KanbanBoardDocument {
  kind: 'board'
  slug: string
  path: string
  title: string
  frontmatter: MarkdownRecord
  columns: KanbanColumn[]
  subBoards: KanbanBoardLink[]
  settings: KanbanBoardSettings | null
  diagnostics: KanbanDiagnostic[]
}

export interface KanbanParseResult {
  version: 'kanban-parser/v1'
  boards: KanbanBoardDocument[]
  cards: KanbanCardDocument[]
  diagnostics: KanbanDiagnostic[]
}
