export type MarkdownPrimitive = string | number | boolean | null

export type MarkdownValue =
  | MarkdownPrimitive
  | MarkdownValue[]
  | { [key: string]: MarkdownValue | undefined }

export interface MarkdownRecord {
  [key: string]: MarkdownValue | undefined
}

export interface KanbanParseResult {
  version: "kanban-parser/v1"
  boards: KanbanBoardDocument[]
  cards: KanbanCardDocument[]
  diagnostics: KanbanDiagnostic[]
}

export interface KanbanDiagnostic {
  level: "error" | "warning"
  code: string
  message: string
  path: string
  line?: number
  column?: number
}

export interface KanbanBoardDocument {
  kind: "board"
  slug: string
  path: string
  title: string
  frontmatter: MarkdownRecord
  columns: KanbanColumn[]
  subBoards: KanbanBoardLink[]
  settings: KanbanBoardSettings | null
  diagnostics: KanbanDiagnostic[]
}

export interface KanbanColumn {
  name: string
  slug: string
  index: number
  sections: KanbanSection[]
}

export interface KanbanSection {
  name: string | null
  slug: string | null
  index: number
  cards: KanbanCardLink[]
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

export interface KanbanBoardSettings extends MarkdownRecord {
  "sort-order"?: "manual" | "title" | "due" | "priority" | "updated" | "created"
  "group-by"?: "none" | "section" | "assignee" | "priority" | "type" | "due"
  "show-empty-columns"?: boolean
  "show-sub-boards"?: boolean
  "show-archive-column"?: boolean
  "card-preview"?: "none" | "metadata" | "body"
  "list-collapse"?: boolean[]
  "column-settings"?: Record<string, KanbanColumnSettings>
  defaults?: KanbanCardDefaults
  inherit?: KanbanInheritanceSettings
  "saved-views"?: KanbanSavedView[]
  "card-badges"?: string[]
}

export interface KanbanColumnSettings extends MarkdownRecord {
  "sort-order"?: "manual" | "title" | "due" | "priority" | "updated" | "created"
  "wip-limit"?: number
  collapsed?: boolean
  "default-section"?: string
  hidden?: boolean
}

export interface KanbanInheritanceSettings extends MarkdownRecord {
  defaults?: boolean
  "saved-views"?: boolean
}

export interface KanbanSavedView extends MarkdownRecord {
  name: string
  filter: MarkdownRecord
}

export interface KanbanCardDefaults extends MarkdownRecord {
  title?: string
  type?: "task" | "bug" | "feature" | "research" | "chore"
  priority?: "low" | "medium" | "high"
  tags?: string[]
  assignee?: string
  owners?: string[]
  estimate?: number
}

export interface KanbanCardDocument {
  kind: "card"
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

export interface KanbanCardMetadata extends MarkdownRecord {
  title?: string
  type?: "task" | "bug" | "feature" | "research" | "chore"
  priority?: "low" | "medium" | "high"
  tags?: string[]
  assignee?: string
  owners?: string[]
  due?: string
  estimate?: number
  blocked_by?: string[]
  blocks?: string[]
  related?: string[]
  scheduled?: string
  started?: string
  completed?: string
  template?: string
}

export interface KanbanCardSection {
  name: string
  slug: string
  index: number
  markdown: string
  checklist: KanbanChecklistItem[]
  wikilinks: string[]
}

export interface KanbanChecklistItem {
  text: string
  checked: boolean
}
