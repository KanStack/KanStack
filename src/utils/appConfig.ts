import type { AppConfig, BoardViewFilters, BoardViewPreferences } from '@/types/appConfig'

export function createDefaultBoardViewFilters(): BoardViewFilters {
  return {
    text: '',
    assignee: null,
    tags: [],
    priority: null,
    type: null,
    dueStatus: 'any',
  }
}

export function createDefaultBoardViewPreferences(): BoardViewPreferences {
  return {
    sort: 'manual',
    filters: createDefaultBoardViewFilters(),
  }
}

export function createDefaultAppConfig(): AppConfig {
  return {
    knownBoardRoots: [],
    workspacePath: null,
    view: createDefaultBoardViewPreferences(),
  }
}

export function normalizeBoardViewPreferences(value: Partial<BoardViewPreferences> | null | undefined): BoardViewPreferences {
  const defaults = createDefaultBoardViewPreferences()
  const filters: Partial<BoardViewFilters> = value?.filters ?? {}

  return {
    sort: value?.sort ?? defaults.sort,
    filters: {
      text: typeof filters.text === 'string' ? filters.text : defaults.filters.text,
      assignee: typeof filters.assignee === 'string' && filters.assignee.length > 0 ? filters.assignee : null,
      tags: Array.isArray(filters.tags) ? filters.tags.filter((tag): tag is string => typeof tag === 'string' && tag.length > 0) : [],
      priority: typeof filters.priority === 'string' && filters.priority.length > 0 ? filters.priority : null,
      type: typeof filters.type === 'string' && filters.type.length > 0 ? filters.type : null,
      dueStatus: filters.dueStatus ?? defaults.filters.dueStatus,
    },
  }
}

export function normalizeAppConfig(value: Partial<AppConfig> | null | undefined): AppConfig {
  return {
    knownBoardRoots: Array.isArray(value?.knownBoardRoots)
      ? value!.knownBoardRoots.filter((root): root is string => typeof root === 'string' && root.length > 0)
      : [],
    workspacePath: typeof value?.workspacePath === 'string' && value.workspacePath.length > 0
      ? value.workspacePath
      : null,
    view: normalizeBoardViewPreferences(value?.view),
  }
}

export function hasActiveBoardViewFilters(filters: BoardViewFilters) {
  return Boolean(
    filters.text.trim()
    || filters.assignee
    || filters.tags.length > 0
    || filters.priority
    || filters.type
    || filters.dueStatus !== 'any',
  )
}

export function isCardReorderEnabled(preferences: BoardViewPreferences) {
  return preferences.sort === 'manual' && !hasActiveBoardViewFilters(preferences.filters)
}

export function countActiveBoardViewFilters(filters: BoardViewFilters) {
  let count = 0
  if (filters.text.trim()) {
    count += 1
  }
  if (filters.assignee) {
    count += 1
  }
  if (filters.tags.length > 0) {
    count += 1
  }
  if (filters.priority) {
    count += 1
  }
  if (filters.type) {
    count += 1
  }
  if (filters.dueStatus !== 'any') {
    count += 1
  }

  return count
}

export function isDefaultBoardViewPreferences(preferences: BoardViewPreferences) {
  return preferences.sort === 'manual' && !hasActiveBoardViewFilters(preferences.filters)
}
