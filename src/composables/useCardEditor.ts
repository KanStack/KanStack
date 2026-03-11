import { computed, onUnmounted, reactive, shallowRef, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'

import type { KanbanCardDocument, KanbanCardMetadata } from '@docs/schemas/kanban-parser-schema'
import { serializeCardMarkdown } from '@/utils/serializeCard'

const CARD_TYPES = ['task', 'bug', 'feature', 'research', 'chore'] as const
const CARD_PRIORITIES = ['low', 'medium', 'high'] as const
const AUTOSAVE_DELAY_MS = 500

interface CardEditorSession {
  card: KanbanCardDocument
  workspaceRoot: string
}

export function useCardEditor() {
  const session = shallowRef<CardEditorSession | null>(null)
  const isSaving = shallowRef(false)
  const isDeleting = shallowRef(false)
  const errorMessage = shallowRef<string | null>(null)
  const isHydrating = shallowRef(false)
  const lastSavedSnapshot = shallowRef('')
  const draft = reactive({
    title: '',
    type: '',
    priority: '',
    assignee: '',
    tags: '',
    estimate: '',
    body: ''
  })
  let autosaveTimer: number | null = null

  const hasPendingChanges = computed(() => Boolean(session.value) && createDraftSnapshot(draft) !== lastSavedSnapshot.value)

  const saveStatus = computed(() => {
    if (isSaving.value) {
      return 'saving...'
    }

    if (errorMessage.value) {
      return 'save failed'
    }

    if (hasPendingChanges.value) {
      return 'editing...'
    }

    return 'saved'
  })

  function open(card: KanbanCardDocument, workspaceRoot: string) {
    clearAutosaveTimer()
    isHydrating.value = true
    session.value = { card, workspaceRoot }
    errorMessage.value = null
    draft.title = card.title
    draft.type = readString(card.metadata.type)
    draft.priority = readString(card.metadata.priority)
    draft.assignee = readString(card.metadata.assignee)
    draft.tags = Array.isArray(card.metadata.tags) ? card.metadata.tags.join(', ') : ''
    draft.estimate = typeof card.metadata.estimate === 'number' ? String(card.metadata.estimate) : ''
    draft.body = card.body
    lastSavedSnapshot.value = createDraftSnapshot(draft)
    isHydrating.value = false
  }

  function close() {
    clearAutosaveTimer()
    session.value = null
    errorMessage.value = null
    isHydrating.value = false
    isSaving.value = false
    isDeleting.value = false
  }

  async function save() {
    if (!session.value || isSaving.value) {
      return false
    }

    const snapshot = createDraftSnapshot(draft)
    if (snapshot === lastSavedSnapshot.value) {
      return true
    }

    const title = draft.title.trim()
    if (!title) {
      errorMessage.value = 'Title is required.'
      return false
    }

    const metadata: KanbanCardMetadata = {
      ...session.value.card.metadata,
      title,
      type: normalizeCardType(draft.type),
      priority: normalizeCardPriority(draft.priority),
      assignee: normalizeOptionalString(draft.assignee),
      tags: normalizeTags(draft.tags),
      estimate: normalizeEstimate(draft.estimate)
    }

    const content = serializeCardMarkdown({
      title,
      metadata,
      body: draft.body
    })

    isSaving.value = true
    errorMessage.value = null

    try {
      await invoke('save_card_file', {
        root: session.value.workspaceRoot,
        path: session.value.card.path,
        content
      })

      lastSavedSnapshot.value = snapshot
      return true
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to save the card.'
      return false
    } finally {
      isSaving.value = false
    }
  }

  async function flushSave() {
    clearAutosaveTimer()
    return save()
  }

  async function deleteCard() {
    if (!session.value || isDeleting.value) {
      return false
    }

    isDeleting.value = true
    errorMessage.value = null

    try {
      await invoke('delete_card_file', {
        root: session.value.workspaceRoot,
        path: session.value.card.path,
        slug: session.value.card.slug
      })

      return true
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to delete the card.'
      return false
    } finally {
      isDeleting.value = false
    }
  }

  function scheduleSave() {
    if (!session.value || isHydrating.value) {
      return
    }

    clearAutosaveTimer()
    autosaveTimer = window.setTimeout(() => {
      void save()
    }, AUTOSAVE_DELAY_MS)
  }

  function clearAutosaveTimer() {
    if (autosaveTimer === null) {
      return
    }

    window.clearTimeout(autosaveTimer)
    autosaveTimer = null
  }

  watch(draft, () => {
    scheduleSave()
  }, { deep: true })

  onUnmounted(() => {
    clearAutosaveTimer()
  })

  return {
    session,
    draft,
    isDeleting,
    isSaving,
    errorMessage,
    hasPendingChanges,
    saveStatus,
    open,
    close,
    save,
    flushSave,
    deleteCard
  }
}

function createDraftSnapshot(draft: {
  title: string
  type: string
  priority: string
  assignee: string
  tags: string
  estimate: string
  body: string
}) {
  return JSON.stringify(draft)
}

function normalizeOptionalString(value: string) {
  const trimmed = value.trim()
  return trimmed || undefined
}

function normalizeCardType(value: string): KanbanCardMetadata['type'] {
  return CARD_TYPES.find((entry) => entry === value.trim())
}

function normalizeCardPriority(value: string): KanbanCardMetadata['priority'] {
  return CARD_PRIORITIES.find((entry) => entry === value.trim())
}

function normalizeTags(value: string) {
  const tags = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

  return tags.length ? tags : undefined
}

function normalizeEstimate(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : ''
}
