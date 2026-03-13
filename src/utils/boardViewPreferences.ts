import type { KanbanCardDocument } from '@docs/schemas/kanban-parser-schema'
import type { BoardView, BoardViewCardLink } from '@/utils/buildBoardView'
import type { BoardViewPreferences } from '@/types/appConfig'

export interface BoardViewFilterOptions {
  assignees: string[]
  priorities: string[]
  tags: string[]
  types: string[]
}

const PRIORITY_ORDER = new Map([
  ['high', 0],
  ['medium', 1],
  ['low', 2],
])

const DUE_SOON_MS = 7 * 24 * 60 * 60 * 1000

export function applyBoardViewPreferences(
  boardView: BoardView,
  cardsBySlug: Record<string, KanbanCardDocument>,
  preferences: BoardViewPreferences,
): BoardView {
  return {
    descendantBoardCount: boardView.descendantBoardCount,
    columns: boardView.columns.map((column) => {
      const sections = column.sections.map((section) => {
        const filteredCards = section.cards.filter((item) => matchesBoardViewFilters(item, cardsBySlug[item.slug] ?? null, preferences))
        const cards = sortBoardViewCards(filteredCards, cardsBySlug, preferences)
        return {
          ...section,
          cards,
        }
      })

      return {
        ...column,
        sections,
        cards: sections.flatMap((section) => section.cards),
      }
    }),
  }
}

export function collectBoardViewFilterOptions(cardsBySlug: Record<string, KanbanCardDocument>): BoardViewFilterOptions {
  const assignees = new Set<string>()
  const priorities = new Set<string>()
  const tags = new Set<string>()
  const types = new Set<string>()

  for (const card of Object.values(cardsBySlug)) {
    if (typeof card.metadata.assignee === 'string' && card.metadata.assignee.trim()) {
      assignees.add(card.metadata.assignee.trim())
    }
    if (typeof card.metadata.priority === 'string' && card.metadata.priority.trim()) {
      priorities.add(card.metadata.priority.trim())
    }
    if (typeof card.metadata.type === 'string' && card.metadata.type.trim()) {
      types.add(card.metadata.type.trim())
    }
    if (Array.isArray(card.metadata.tags)) {
      for (const tag of card.metadata.tags) {
        if (typeof tag === 'string' && tag.trim()) {
          tags.add(tag.trim())
        }
      }
    }
  }

  return {
    assignees: [...assignees].sort(compareText),
    priorities: [...priorities].sort(comparePriorityValues),
    tags: [...tags].sort(compareText),
    types: [...types].sort(compareText),
  }
}

function matchesBoardViewFilters(
  item: BoardViewCardLink,
  card: KanbanCardDocument | null,
  preferences: BoardViewPreferences,
) {
  const { filters } = preferences
  if (filters.assignee) {
    if ((card?.metadata.assignee ?? '').trim().toLowerCase() !== filters.assignee.trim().toLowerCase()) {
      return false
    }
  }

  if (filters.tags.length > 0) {
    const cardTags = new Set((card?.metadata.tags ?? []).map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))
    if (!filters.tags.every((tag) => cardTags.has(tag.trim().toLowerCase()))) {
      return false
    }
  }

  if (filters.priority) {
    if ((card?.metadata.priority ?? '').trim().toLowerCase() !== filters.priority.trim().toLowerCase()) {
      return false
    }
  }

  if (filters.type) {
    if ((card?.metadata.type ?? '').trim().toLowerCase() !== filters.type.trim().toLowerCase()) {
      return false
    }
  }

  if (!matchesDueStatus(card, filters.dueStatus)) {
    return false
  }

  const query = filters.text.trim().toLowerCase()
  if (!query) {
    return true
  }

  return buildSearchText(item, card).includes(query)
}

function sortBoardViewCards(
  cards: BoardViewCardLink[],
  cardsBySlug: Record<string, KanbanCardDocument>,
  preferences: BoardViewPreferences,
) {
  if (preferences.sort === 'manual') {
    return cards
  }

  return [...cards]
    .map((item, index) => ({ item, index }))
    .sort((left, right) => compareBoardViewCards(left.item, right.item, cardsBySlug, preferences.sort) || left.index - right.index)
    .map((entry) => entry.item)
}

function compareBoardViewCards(
  left: BoardViewCardLink,
  right: BoardViewCardLink,
  cardsBySlug: Record<string, KanbanCardDocument>,
  sort: BoardViewPreferences['sort'],
) {
  const leftCard = cardsBySlug[left.slug] ?? null
  const rightCard = cardsBySlug[right.slug] ?? null

  if (sort === 'title') {
    return compareText(cardTitle(left, leftCard), cardTitle(right, rightCard))
  }

  if (sort === 'due') {
    return compareNullableNumber(dueTimestamp(leftCard), dueTimestamp(rightCard))
      || compareText(cardTitle(left, leftCard), cardTitle(right, rightCard))
  }

  if (sort === 'priority') {
    return comparePriorityValues(leftCard?.metadata.priority ?? null, rightCard?.metadata.priority ?? null)
      || compareText(cardTitle(left, leftCard), cardTitle(right, rightCard))
  }

  return 0
}

function cardTitle(item: BoardViewCardLink, card: KanbanCardDocument | null) {
  return (card?.title ?? item.title ?? item.slug).trim().toLowerCase()
}

function buildSearchText(item: BoardViewCardLink, card: KanbanCardDocument | null) {
  return [
    card?.title,
    item.title,
    item.slug,
    card?.body,
    item.sourceBoardTitle,
    card?.metadata.assignee,
    card?.metadata.priority,
    card?.metadata.type,
    ...(card?.metadata.tags ?? []),
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()
}

function matchesDueStatus(card: KanbanCardDocument | null, dueStatus: BoardViewPreferences['filters']['dueStatus']) {
  if (dueStatus === 'any') {
    return true
  }

  const timestamp = dueTimestamp(card)
  if (timestamp === null) {
    return dueStatus === 'noDue'
  }

  if (dueStatus === 'hasDue') {
    return true
  }

  const now = Date.now()
  if (dueStatus === 'overdue') {
    return timestamp < now
  }

  if (dueStatus === 'dueSoon') {
    return timestamp >= now && timestamp <= now + DUE_SOON_MS
  }

  return false
}

function dueTimestamp(card: KanbanCardDocument | null) {
  if (!card || typeof card.metadata.due !== 'string' || !card.metadata.due.trim()) {
    return null
  }

  const timestamp = Date.parse(card.metadata.due)
  return Number.isNaN(timestamp) ? null : timestamp
}

function comparePriorityValues(left: string | null | undefined, right: string | null | undefined) {
  return compareNullableNumber(priorityRank(left), priorityRank(right))
}

function priorityRank(value: string | null | undefined) {
  if (!value) {
    return null
  }

  return PRIORITY_ORDER.get(value.trim().toLowerCase()) ?? PRIORITY_ORDER.size + 1
}

function compareNullableNumber(left: number | null, right: number | null) {
  if (left === null && right === null) {
    return 0
  }
  if (left === null) {
    return 1
  }
  if (right === null) {
    return -1
  }

  return left - right
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, undefined, { sensitivity: 'base' })
}
