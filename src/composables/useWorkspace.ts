import { computed, onMounted, onUnmounted, shallowRef } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-dialog'

import type { KanbanBoardDocument, KanbanCardDocument } from '@docs/schemas/kanban-parser-schema'
import type { LoadedWorkspace, WorkspaceSnapshot } from '@/types/workspace'
import { parseWorkspace } from '@/utils/parseWorkspace'

const STORAGE_KEY = 'kanstack.workspacePath'
const WORKSPACE_CHANGED_EVENT = 'workspace-changed'

interface LoadWorkspaceOptions {
  preserveSelection?: boolean
  silent?: boolean
  surfaceErrors?: boolean
}

interface WorkspaceChangedPayload {
  rootPath: string
}

export function useWorkspace() {
  const workspace = shallowRef<LoadedWorkspace | null>(null)
  const currentBoardSlug = shallowRef<string | null>(null)
  const selectedCardSlug = shallowRef<string | null>(null)
  const workspacePath = shallowRef<string | null>(null)
  const lastSnapshotSignature = shallowRef<string | null>(null)
  const isLoading = shallowRef(false)
  const isRefreshing = shallowRef(false)
  const errorMessage = shallowRef<string | null>(null)
  let unlistenWorkspaceChanges: UnlistenFn | null = null

  const currentBoard = computed<KanbanBoardDocument | null>(() => {
    if (!workspace.value || !currentBoardSlug.value) {
      return null
    }

    return workspace.value.boardsBySlug[currentBoardSlug.value] ?? null
  })

  const selectedCard = computed<KanbanCardDocument | null>(() => {
    if (!workspace.value || !selectedCardSlug.value) {
      return null
    }

    return workspace.value.cardsBySlug[selectedCardSlug.value] ?? null
  })

  const boardOptions = computed(() => {
    if (!workspace.value) {
      return []
    }

    return workspace.value.boardOrder.map((slug) => {
      const board = workspace.value!.boardsBySlug[slug]
      return { slug, title: board.title }
    })
  })

  async function openWorkspace() {
    const selection = await open({
      directory: true,
      multiple: false,
      defaultPath: workspacePath.value ?? workspace.value?.rootPath ?? undefined
    })

    if (typeof selection !== 'string') {
      return
    }

    await loadWorkspace(selection)
  }

  async function restoreWorkspace() {
    const savedPath = window.localStorage.getItem(STORAGE_KEY)
    if (!savedPath) {
      return
    }

    await loadWorkspace(savedPath, { surfaceErrors: false })
  }

  async function loadWorkspace(path: string, options: LoadWorkspaceOptions = {}) {
    const {
      preserveSelection = false,
      silent = false,
      surfaceErrors = true
    } = options

    if (silent) {
      if (isRefreshing.value || isLoading.value) {
        return
      }

      isRefreshing.value = true
    } else {
      isLoading.value = true
      errorMessage.value = null
    }

    try {
      const snapshot = await invoke<WorkspaceSnapshot>('load_workspace', { path })
      const signature = createSnapshotSignature(snapshot)

      if (silent && signature === lastSnapshotSignature.value) {
        return
      }

      applyWorkspaceSnapshot(snapshot, path, signature, preserveSelection)
      if (!silent) {
        await startWorkspaceWatch(path)
      }
      errorMessage.value = null
    } catch (error) {
      if (silent) {
        return
      }

      await stopWorkspaceWatch()
      clearWorkspaceState()

      if (surfaceErrors) {
        errorMessage.value = error instanceof Error ? error.message : 'Failed to load the selected workspace.'
      }
    } finally {
      if (silent) {
        isRefreshing.value = false
      } else {
        isLoading.value = false
      }
    }
  }

  async function refreshWorkspace() {
    if (!workspacePath.value) {
      return
    }

    await loadWorkspace(workspacePath.value, {
      preserveSelection: true,
      silent: true,
      surfaceErrors: false
    })
  }

  function selectBoard(slug: string) {
    currentBoardSlug.value = slug
    selectedCardSlug.value = null
  }

  function selectCard(slug: string) {
    if (!workspace.value?.cardsBySlug[slug]) {
      return
    }

    selectedCardSlug.value = slug
  }

  function closeCard() {
    selectedCardSlug.value = null
  }

  function applyWorkspaceSnapshot(
    snapshot: WorkspaceSnapshot,
    path: string,
    signature: string,
    preserveSelection: boolean
  ) {
      const parseResult = parseWorkspace(snapshot)
      const boardsBySlug = Object.fromEntries(parseResult.boards.map((board) => [board.slug, board]))
      const boardFilesBySlug = Object.fromEntries(snapshot.boards.map((boardFile) => [slugFromPath(boardFile.path), boardFile]))
      const cardsBySlug = Object.fromEntries(parseResult.cards.map((card) => [card.slug, card]))
      const boardOrder = parseResult.boards.map((board) => board.slug)

      workspace.value = {
        rootPath: snapshot.rootPath,
        parseResult,
        boardsBySlug,
        boardFilesBySlug,
        cardsBySlug,
        boardOrder
      }

    workspacePath.value = path
    lastSnapshotSignature.value = signature
    currentBoardSlug.value = preserveSelection && currentBoardSlug.value && boardsBySlug[currentBoardSlug.value]
      ? currentBoardSlug.value
      : boardsBySlug.main
        ? 'main'
        : boardOrder[0] ?? null
    selectedCardSlug.value = preserveSelection && selectedCardSlug.value && cardsBySlug[selectedCardSlug.value]
      ? selectedCardSlug.value
      : null

    window.localStorage.setItem(STORAGE_KEY, path)
  }

  function clearWorkspaceState() {
    workspace.value = null
    workspacePath.value = null
    lastSnapshotSignature.value = null
    currentBoardSlug.value = null
    selectedCardSlug.value = null
    window.localStorage.removeItem(STORAGE_KEY)
  }

  async function startWorkspaceWatch(path: string) {
    await invoke('watch_workspace', { path })
  }

  async function stopWorkspaceWatch() {
    await invoke('unwatch_workspace')
  }

  async function attachWorkspaceListener() {
    if (unlistenWorkspaceChanges) {
      return
    }

    unlistenWorkspaceChanges = await listen<WorkspaceChangedPayload>(WORKSPACE_CHANGED_EVENT, (event) => {
      if (!workspacePath.value || event.payload.rootPath !== workspacePath.value) {
        return
      }

      void refreshWorkspace()
    })
  }

  onMounted(() => {
    void attachWorkspaceListener()
  })

  onUnmounted(() => {
    if (unlistenWorkspaceChanges) {
      unlistenWorkspaceChanges()
      unlistenWorkspaceChanges = null
    }

    void stopWorkspaceWatch()
  })

  return {
    workspace,
    currentBoard,
    currentBoardSlug,
    boardOptions,
    selectedCard,
    isLoading,
    errorMessage,
    openWorkspace,
    restoreWorkspace,
    selectBoard,
    selectCard,
    closeCard
  }
}

function createSnapshotSignature(snapshot: WorkspaceSnapshot) {
  return JSON.stringify({
    boards: snapshot.boards,
    cards: snapshot.cards
  })
}

function slugFromPath(path: string) {
  const filename = path.split('/').pop() ?? path
  return filename.replace(/\.md$/, '')
}
