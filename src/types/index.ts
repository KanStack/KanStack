// Types for KanStack data structures

export interface AppConfig {
  app_version: string
  settings: AppSettings
  projects: ProjectEntry[]
  summary_settings: SummarySettings
}

export interface AppSettings {
  theme: string
  font: string
  auto_save: boolean
  default_project_location: string
}

export interface ProjectEntry {
  id: string
  name: string
  path: string
  type: 'local' | 'custom'
  last_opened: string
}

export interface SummarySettings {
  visible_projects: string[]
  filters: FilterSettings
}

export interface FilterSettings {
  exclude_archived: boolean
  tags: string[]
}

export interface ProjectMeta {
  id: string
  name: string
  created_at: string
  updated_at: string
  settings: ProjectSettings
}

export interface ProjectSettings {
  tags: string[]
  custom_fields: CustomField[]
}

export interface CustomField {
  id: string
  name: string
  type: string
}

export interface Board {
  id: string
  version: string
  schema_version: number
  name: string
  project_id: string
  created_at: string
  updated_at: string
  columns: Column[]
  cards: Card[]
}

export interface Column {
  id: string
  name: string
  order: string
  wip_limit?: number
}

export interface Card {
  id: string
  column_id: string
  title: string
  content: string
  content_type: string
  order: string
  tags: string[]
  due_date?: string
  priority: number
  parent_id?: string
  linked_refs: LinkedRef[]
  checklist: ChecklistItem[]
  status: 'active' | 'archived'
  archived: boolean
  archived_at?: string
  created_at: string
  updated_at: string
  metadata: Record<string, any>
}

export interface LinkedRef {
  card_id: string
  project_id: string
}

export interface ChecklistItem {
  id: string
  text: string
  checked: boolean
}

export interface CardWithContext {
  card: Card
  source: {
    project_id: string
    project_path: string
    is_available: boolean
  }
}
