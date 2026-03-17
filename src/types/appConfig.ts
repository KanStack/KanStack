export type BoardViewSort = 'manual' | 'title' | 'due' | 'priority'

export type BoardViewDueStatus = 'any' | 'overdue' | 'dueSoon' | 'hasDue' | 'noDue'

export interface BoardViewFilters {
  text: string
  assignee: string | null
  tags: string[]
  priority: string | null
  type: string | null
  dueStatus: BoardViewDueStatus
}

export interface BoardViewPreferences {
  sort: BoardViewSort
  filters: BoardViewFilters
}

export type Theme = 'light' | 'dark'

export interface AppConfig {
  knownBoardRoots: string[]
  workspacePath: string | null
  view: BoardViewPreferences
  theme: Theme
}
