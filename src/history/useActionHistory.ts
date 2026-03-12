import { computed, shallowRef } from 'vue'

import type { WorkspaceCardSelection, WorkspaceSnapshot } from '@/types/workspace'

const HISTORY_LIMIT = 100

export interface HistoryStateSnapshot {
  currentBoardSlug: string | null
  selectedCard: WorkspaceCardSelection | null
  selectedColumnSlug: string | null
  snapshot: WorkspaceSnapshot
}

interface HistoryEntry {
  after: HistoryStateSnapshot
  before: HistoryStateSnapshot
  label: string
}

export function useActionHistory() {
  const past = shallowRef<HistoryEntry[]>([])
  const future = shallowRef<HistoryEntry[]>([])

  function push(entry: HistoryEntry) {
    past.value = [...past.value, entry].slice(-HISTORY_LIMIT)
    future.value = []
  }

  function shiftUndo() {
    const entry = past.value[past.value.length - 1] ?? null
    if (!entry) {
      return null
    }

    past.value = past.value.slice(0, -1)
    future.value = [entry, ...future.value].slice(0, HISTORY_LIMIT)
    return entry
  }

  function shiftRedo() {
    const entry = future.value[0] ?? null
    if (!entry) {
      return null
    }

    future.value = future.value.slice(1)
    past.value = [...past.value, entry].slice(-HISTORY_LIMIT)
    return entry
  }

  function clear() {
    past.value = []
    future.value = []
  }

  return {
    canRedo: computed(() => future.value.length > 0),
    canUndo: computed(() => past.value.length > 0),
    clear,
    nextRedoLabel: computed(() => future.value[0]?.label ?? null),
    nextUndoLabel: computed(() => past.value[past.value.length - 1]?.label ?? null),
    push,
    shiftRedo,
    shiftUndo,
  }
}
