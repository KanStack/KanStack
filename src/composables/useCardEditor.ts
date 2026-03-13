import { computed, onUnmounted, reactive, shallowRef, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'

import type { KanbanCardDocument, KanbanCardMetadata } from '@docs/schemas/kanban-parser-schema'
import type { WorkspaceMutationPayload, WorkspaceSnapshot } from '@/types/workspace'
import { getCardRenameTarget } from '@/utils/renameTarget'
import { serializeCardMarkdown } from '@/utils/serializeCard'

const CARD_TYPES = ['task', 'bug', 'feature', 'research', 'chore'] as const
const CARD_PRIORITIES = ['low', 'medium', 'high'] as const
const AUTOSAVE_DELAY_MS = 500

interface CardEditorSession {
  card: KanbanCardDocument
  workspaceRoot: string
}

interface UseCardEditorOptions {
  getBoardCardPaths: (cardPath: string) => string[]
  getSourceBoardSlug: () => string | null
}

interface SaveResult {
  mutation: WorkspaceMutationPayload | null
  ok: boolean
}

export function useCardEditor(options: UseCardEditorOptions) {
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
    due: '',
    tags: '',
    estimate: '',
    body: ''
  })
  let autosaveTimer: number | null = null
  let activeSavePromise: Promise<SaveResult> | null = null
  let saveQueued = false

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
    draft.due = readLocalDateTime(card.metadata.due)
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
    saveQueued = false
    activeSavePromise = null
  }

  async function save(): Promise<SaveResult> {
    if (!session.value) {
      return { ok: false, mutation: null }
    }

    if (activeSavePromise) {
      saveQueued = true
      return activeSavePromise
    }

    activeSavePromise = runSaveLoop()
    const result = await activeSavePromise
    activeSavePromise = null
    return result
  }

  async function runSaveLoop(): Promise<SaveResult> {
    let didSave = false
    let lastMutation: WorkspaceMutationPayload | null = null

    do {
      saveQueued = false
      const result = await saveOnce()
      didSave = didSave || result.ok
      lastMutation = result.mutation ?? lastMutation
    } while (saveQueued && session.value)

    return {
      ok: didSave || !hasPendingChanges.value,
      mutation: lastMutation,
    }
  }

  async function saveOnce(): Promise<SaveResult> {
    if (!session.value || isSaving.value) {
      return { ok: false, mutation: null }
    }

    const snapshot = createDraftSnapshot(draft)
    if (snapshot === lastSavedSnapshot.value) {
      return { ok: true, mutation: null }
    }

    const title = draft.title.trim()
    if (!title) {
      errorMessage.value = 'Title is required.'
      return { ok: false, mutation: null }
    }

    const metadata: KanbanCardMetadata = {
      ...session.value.card.metadata,
      title,
      type: normalizeCardType(draft.type),
      priority: normalizeCardPriority(draft.priority),
      assignee: normalizeOptionalString(draft.assignee),
      due: normalizeLocalDateTime(draft.due),
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
      const renameTarget = getCardRenameTarget(
        title,
        session.value.card.path,
        options.getBoardCardPaths(session.value.card.path),
      )
      let mutation: WorkspaceMutationPayload | null = null

      if (title !== session.value.card.title || renameTarget.slug !== session.value.card.slug) {
        const snapshot = await invoke<WorkspaceSnapshot>('rename_card', {
          root: session.value.workspaceRoot,
          boardPath: `${session.value.card.path.replace(/\/cards\/[^/]+\.md$/i, '')}/todo.md`,
          oldPath: session.value.card.path,
          newPath: renameTarget.path,
          oldSlug: session.value.card.path,
          newSlug: renameTarget.slug,
          newTitle: title,
          content,
        })

        session.value = {
          ...session.value,
          card: {
            ...session.value.card,
            body: draft.body,
            metadata,
            path: renameTarget.path,
            slug: renameTarget.slug,
            title,
          },
        }

        const sourceBoardSlug = options.getSourceBoardSlug()
        mutation = {
          snapshot,
          selectedCard: sourceBoardSlug
            ? {
                slug: renameTarget.slug,
                sourceBoardSlug,
              }
            : null,
        }
      } else {
        await invoke('save_card_file', {
          root: session.value.workspaceRoot,
          path: session.value.card.path,
          content
        })
      }

      lastSavedSnapshot.value = snapshot
      if (createDraftSnapshot(draft) !== snapshot) {
        saveQueued = true
      }
      return { ok: true, mutation }
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to save the card.'
      return { ok: false, mutation: null }
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
        boardPath: `${session.value.card.path.replace(/\/cards\/[^/]+\.md$/i, '')}/todo.md`,
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
    if (isSaving.value) {
      saveQueued = true
    }
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
  due: string
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

function normalizeLocalDateTime(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed) ? trimmed : undefined
}

function readLocalDateTime(value: unknown) {
  if (typeof value !== 'string') {
    return ''
  }

  const trimmed = value.trim()
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/)
  return match?.[1] ?? ''
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
