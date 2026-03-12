import { computed, onMounted, onUnmounted, shallowRef } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-dialog'

import type { KanbanBoardDocument, KanbanCardDocument } from '@docs/schemas/kanban-parser-schema'
import type { LoadedWorkspace, WorkspaceMutationPayload, WorkspaceSnapshot } from '@/types/workspace'
import { buildLoadedWorkspace, createWorkspaceSnapshotSignature } from '@/utils/workspaceSnapshot'

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

interface BoardNavOption {
  slug: string
  title: string
}

export function useWorkspace() {
  const workspace = shallowRef<LoadedWorkspace | null>(null)
  const currentBoardSlug = shallowRef<string | null>(null)
  const selectedCardSlug = shallowRef<string | null>(null)
  const selectedCardSourceBoardSlug = shallowRef<string | null>(null)
  const workspacePath = shallowRef<string | null>(null)
  const lastSnapshotSignature = shallowRef<string | null>(null)
  const isLoading = shallowRef(false)
  const isRefreshing = shallowRef(false)
  const errorMessage = shallowRef<string | null>(null)
  let watchedWorkspacePath: string | null = null
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

  const selectedCardSourceBoard = computed<KanbanBoardDocument | null>(() => {
    if (!workspace.value || !selectedCardSourceBoardSlug.value) {
      return null
    }

    return workspace.value.boardsBySlug[selectedCardSourceBoardSlug.value] ?? null
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
  const boardRelations = computed(() => buildBoardRelations(workspace.value))
  const boardLineage = computed<BoardNavOption[]>(() => {
    if (!workspace.value || !currentBoardSlug.value) {
      return []
    }

    const lineage: string[] = []
    const visited = new Set<string>()
    let slug: string | null = currentBoardSlug.value

    while (slug && !visited.has(slug) && workspace.value.boardsBySlug[slug]) {
      visited.add(slug)
      lineage.unshift(slug)
      slug = boardRelations.value.parentBySlug[slug] ?? null
    }

    return lineage.map((entrySlug) => ({
      slug: entrySlug,
      title: workspace.value!.boardsBySlug[entrySlug].title,
    }))
  })
  const siblingBoards = computed<BoardNavOption[]>(() => {
    if (!workspace.value || !currentBoardSlug.value) {
      return []
    }

    const parentSlug = boardRelations.value.parentBySlug[currentBoardSlug.value] ?? null
    const candidateSlugs = parentSlug
      ? (boardRelations.value.childrenBySlug[parentSlug] ?? [])
      : boardRelations.value.rootSlugs

    return candidateSlugs
      .filter((slug) => slug !== currentBoardSlug.value && workspace.value!.boardsBySlug[slug])
      .map((slug) => ({ slug, title: workspace.value!.boardsBySlug[slug].title }))
  })
  const childBoards = computed<BoardNavOption[]>(() => {
    if (!workspace.value || !currentBoard.value) {
      return []
    }

    return currentBoard.value.subBoards
      .map((link) => workspace.value!.boardsBySlug[link.slug])
      .filter((board): board is KanbanBoardDocument => Boolean(board))
      .map((board) => ({ slug: board.slug, title: board.title }))
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
      const signature = createWorkspaceSnapshotSignature(snapshot)

      if (silent && signature === lastSnapshotSignature.value) {
        return
      }

      applyWorkspaceSnapshot(snapshot, path, signature, preserveSelection)
      if (!silent) {
        await replaceWorkspaceWatch(path)
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
    selectedCardSourceBoardSlug.value = null
  }

  function selectCard(selection: { slug: string; sourceBoardSlug: string }) {
    const { slug, sourceBoardSlug } = selection
    if (!workspace.value?.cardsBySlug[slug]) {
      return
    }

    selectedCardSlug.value = slug
    selectedCardSourceBoardSlug.value = sourceBoardSlug
  }

  function closeCard() {
    selectedCardSlug.value = null
    selectedCardSourceBoardSlug.value = null
  }

  function applyWorkspaceMutation(payload: WorkspaceMutationPayload) {
    const path = workspacePath.value ?? payload.snapshot.rootPath
    const signature = createWorkspaceSnapshotSignature(payload.snapshot)
    const nextWorkspace = buildLoadedWorkspace(payload.snapshot)

    workspace.value = nextWorkspace
    workspacePath.value = path
    lastSnapshotSignature.value = signature
    currentBoardSlug.value = payload.currentBoardSlug && nextWorkspace.boardsBySlug[payload.currentBoardSlug]
      ? payload.currentBoardSlug
      : currentBoardSlug.value && nextWorkspace.boardsBySlug[currentBoardSlug.value]
        ? currentBoardSlug.value
        : nextWorkspace.boardsBySlug.main
          ? 'main'
          : nextWorkspace.boardOrder[0] ?? null
    selectedCardSlug.value = payload.selectedCard?.slug && nextWorkspace.cardsBySlug[payload.selectedCard.slug]
      ? payload.selectedCard.slug
      : null
    selectedCardSourceBoardSlug.value = payload.selectedCard?.sourceBoardSlug
      && nextWorkspace.boardsBySlug[payload.selectedCard.sourceBoardSlug]
      ? payload.selectedCard.sourceBoardSlug
      : null

    window.localStorage.setItem(STORAGE_KEY, path)
  }

  function applyWorkspaceSnapshot(
    snapshot: WorkspaceSnapshot,
    path: string,
    signature: string,
    preserveSelection: boolean
  ) {
    const nextWorkspace = buildLoadedWorkspace(snapshot)

    workspace.value = nextWorkspace

    workspacePath.value = path
    lastSnapshotSignature.value = signature
    currentBoardSlug.value = preserveSelection && currentBoardSlug.value && nextWorkspace.boardsBySlug[currentBoardSlug.value]
      ? currentBoardSlug.value
      : nextWorkspace.boardsBySlug.main
        ? 'main'
        : nextWorkspace.boardOrder[0] ?? null
    selectedCardSlug.value = preserveSelection ? selectedCardSlug.value : null
    selectedCardSourceBoardSlug.value = preserveSelection ? selectedCardSourceBoardSlug.value : null

    window.localStorage.setItem(STORAGE_KEY, path)
  }

  function clearWorkspaceState() {
    workspace.value = null
    workspacePath.value = null
    lastSnapshotSignature.value = null
    currentBoardSlug.value = null
    selectedCardSlug.value = null
    selectedCardSourceBoardSlug.value = null
    window.localStorage.removeItem(STORAGE_KEY)
  }

  async function replaceWorkspaceWatch(path: string) {
    if (watchedWorkspacePath === path) {
      return
    }

    if (watchedWorkspacePath) {
      await stopWorkspaceWatch()
    }

    await invoke('watch_workspace', { path })
    watchedWorkspacePath = path
  }

  async function stopWorkspaceWatch() {
    if (!watchedWorkspacePath) {
      return
    }

    await invoke('unwatch_workspace')
    watchedWorkspacePath = null
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
    boardLineage,
    siblingBoards,
    childBoards,
    selectedCard,
    selectedCardSlug,
    selectedCardSourceBoard,
    isLoading,
    errorMessage,
    openWorkspace,
    restoreWorkspace,
    selectBoard,
    selectCard,
    closeCard,
    applyWorkspaceMutation,
  }
}

function buildBoardRelations(workspace: LoadedWorkspace | null) {
  const parentBySlug: Record<string, string | null> = {}
  const childrenBySlug: Record<string, string[]> = {}

  if (!workspace) {
    return {
      childrenBySlug,
      parentBySlug,
      rootSlugs: [] as string[],
    }
  }

  for (const slug of workspace.boardOrder) {
    parentBySlug[slug] = null
    childrenBySlug[slug] = []
  }

  for (const board of Object.values(workspace.boardsBySlug)) {
    for (const link of board.subBoards) {
      if (!workspace.boardsBySlug[link.slug]) {
        continue
      }

      if (parentBySlug[link.slug] === null) {
        parentBySlug[link.slug] = board.slug
      }

      childrenBySlug[board.slug].push(link.slug)
    }
  }

  return {
    childrenBySlug,
    parentBySlug,
    rootSlugs: workspace.boardOrder.filter((slug) => parentBySlug[slug] === null),
  }
}
