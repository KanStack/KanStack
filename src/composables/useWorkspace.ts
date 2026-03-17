import { computed, onMounted, onUnmounted, shallowRef } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { open } from '@tauri-apps/plugin-dialog'

import type { KanbanBoardDocument, KanbanCardDocument } from '@docs/schemas/kanban-parser-schema'
import type { AppConfig, BoardViewPreferences, Theme } from '@/types/appConfig'
import type { LoadedWorkspace, WorkspaceMutationPayload, WorkspaceSnapshot } from '@/types/workspace'
import { createDefaultAppConfig, normalizeAppConfig, normalizeBoardViewPreferences } from '@/utils/appConfig'
import { buildLoadedWorkspace, createWorkspaceSnapshotSignature } from '@/utils/workspaceSnapshot'

const LEGACY_WORKSPACE_STORAGE_KEY = 'kanstack.workspacePath'
const WORKSPACE_CHANGED_EVENT = 'workspace-changed'

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', theme)
}

interface LoadWorkspaceOptions {
  preserveSelection?: boolean
  silent?: boolean
  surfaceErrors?: boolean
}

interface WorkspaceChangedPayload {
  rootPath: string
}

interface KnownBoardTreeSyncResult {
  knownBoardRoots: string[]
  missingBoardRoots: string[]
  suggestedRootPath: string | null
  updatedBoardRoots: string[]
}

interface WorkspaceLoadResult {
  missingBoardRoots: string[]
}

interface BoardNavOption {
  slug: string
  title: string
}

export function useWorkspace() {
  const appConfig = shallowRef<AppConfig>(createDefaultAppConfig())
  const workspace = shallowRef<LoadedWorkspace | null>(null)
  const currentBoardSlug = shallowRef<string | null>(null)
  const selectedCardSlug = shallowRef<string | null>(null)
  const selectedCardSourceBoardSlug = shallowRef<string | null>(null)
  const workspacePath = shallowRef<string | null>(null)
  const lastSnapshotSignature = shallowRef<string | null>(null)
  const isLoading = shallowRef(false)
  const isRefreshing = shallowRef(false)
  const errorMessage = shallowRef<string | null>(null)
  const viewPreferences = computed(() => appConfig.value.view)
  let watchedWorkspacePath: string | null = null
  let unlistenWorkspaceChanges: UnlistenFn | null = null
  let pendingConfigWrite: number | null = null

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

  async function loadAppConfig() {
    const config = normalizeAppConfig(await invoke<AppConfig>('load_app_config'))
    appConfig.value = config
    workspacePath.value = config.workspacePath
    applyTheme(config.theme)
    return config
  }

  async function persistAppConfig(config: AppConfig) {
    const savedConfig = normalizeAppConfig(await invoke<AppConfig>('save_app_config', { config }))
    appConfig.value = savedConfig
    workspacePath.value = savedConfig.workspacePath
    return savedConfig
  }

  function queueAppConfigWrite() {
    if (pendingConfigWrite !== null) {
      window.clearTimeout(pendingConfigWrite)
    }

    pendingConfigWrite = window.setTimeout(() => {
      pendingConfigWrite = null
      void persistAppConfig(appConfig.value)
    }, 180)
  }

  async function persistWorkspacePath(path: string | null) {
    const nextConfig = normalizeAppConfig({
      ...appConfig.value,
      workspacePath: path,
    })
    appConfig.value = nextConfig
    workspacePath.value = nextConfig.workspacePath

    if (path) {
      window.localStorage.removeItem(LEGACY_WORKSPACE_STORAGE_KEY)
    } else {
      window.localStorage.removeItem(LEGACY_WORKSPACE_STORAGE_KEY)
    }

    await persistAppConfig(nextConfig)
  }

  function syncKnownBoardRoots(knownBoardRoots: string[]) {
    appConfig.value = normalizeAppConfig({
      ...appConfig.value,
      knownBoardRoots,
    })
  }

  function updateViewPreferences(preferences: BoardViewPreferences) {
    appConfig.value = normalizeAppConfig({
      ...appConfig.value,
      view: normalizeBoardViewPreferences(preferences),
    })
    queueAppConfigWrite()
  }

  function setTheme(theme: Theme) {
    appConfig.value = normalizeAppConfig({
      ...appConfig.value,
      theme,
    })
    applyTheme(theme)
    queueAppConfigWrite()
  }

  const theme = computed(() => appConfig.value.theme)

  async function openWorkspace() {
    const selection = await open({
      directory: true,
      multiple: false,
      defaultPath: workspacePath.value ?? workspace.value?.rootPath ?? undefined
    })

    if (typeof selection !== 'string') {
      return null
    }

    const selectedRootPath = coerceBoardRootSelection(selection)
    const syncResult = await syncKnownBoardTree({
      additionalBoardRoots: [selectedRootPath],
      focusRootPath: selectedRootPath,
    })

    const loadResult = await loadWorkspace(syncResult.suggestedRootPath ?? selectedRootPath)
    return {
      missingBoardRoots: [...syncResult.missingBoardRoots, ...(loadResult?.missingBoardRoots ?? [])],
    } satisfies WorkspaceLoadResult
  }

  async function closeWorkspace() {
    await stopWorkspaceWatch()
    clearWorkspaceState()
    errorMessage.value = null
    await persistWorkspacePath(null)
  }

  async function syncKnownBoardTree(options: {
    additionalBoardRoots?: string[]
    focusRootPath?: string | null
  }) {
    const result = await invoke<KnownBoardTreeSyncResult>('sync_known_board_tree', {
      additionalBoardRoots: (options.additionalBoardRoots ?? []).map(normalizeTodoRootPath),
      focusRootPath: options.focusRootPath ?? null,
    })
    syncKnownBoardRoots(result.knownBoardRoots)
    return result
  }

  async function attachExistingBoard() {
    const selection = await open({
      directory: true,
      multiple: false,
      defaultPath: workspacePath.value ? parentDirectoryOfTodoRoot(workspacePath.value) : undefined,
    })

    if (typeof selection !== 'string') {
      return null
    }

    const attachedRootPath = coerceBoardRootSelection(selection)
    const result = await registerKnownBoardRoots([attachedRootPath])

    return {
      attachedRootPath,
      missingBoardRoots: result.missingBoardRoots,
    }
  }

  async function restoreWorkspace() {
    try {
      const config = await loadAppConfig()
      const legacyPath = window.localStorage.getItem(LEGACY_WORKSPACE_STORAGE_KEY)
      const savedPath = config.workspacePath ?? legacyPath

      if (!config.workspacePath && legacyPath) {
        await persistWorkspacePath(legacyPath)
      }

      if (!savedPath) {
        return
      }

      await loadWorkspace(savedPath, { surfaceErrors: false })
    } catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to restore app config.'
    }
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
        return null
      }

      applyWorkspaceSnapshot(snapshot, path, signature, preserveSelection)
      if (!silent) {
        await replaceWorkspaceWatch(path)
      }
      const syncResult = silent
        ? null
        : await syncKnownBoardTree({
            additionalBoardRoots: snapshotBoardRoots(snapshot),
            focusRootPath: path,
          })
      const shouldReloadCurrentRoot = !silent
        && Boolean(syncResult?.updatedBoardRoots.some((rootPath) => isBoardWithinWorkspaceTree(rootPath, path)))

      if (!silent && syncResult?.suggestedRootPath && syncResult.suggestedRootPath !== path) {
        return await loadWorkspace(syncResult.suggestedRootPath, {
          preserveSelection: true,
          surfaceErrors,
        })
      }

      if (shouldReloadCurrentRoot) {
        return await loadWorkspace(path, {
          preserveSelection: true,
          surfaceErrors,
        })
      }

      errorMessage.value = null
      if (!silent && appConfig.value.workspacePath !== path) {
        await persistWorkspacePath(path)
      }
      return {
        missingBoardRoots: syncResult?.missingBoardRoots ?? [],
      } satisfies WorkspaceLoadResult
    } catch (error) {
      if (silent) {
        return null
      }

      await stopWorkspaceWatch()
      clearWorkspaceState()
      await persistWorkspacePath(null)

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

  async function loadWorkspaceRoot(path: string) {
    return await loadWorkspace(path)
  }

  async function registerKnownBoardRoots(boardRoots: string[]) {
    const syncResult = await syncKnownBoardTree({
      additionalBoardRoots: boardRoots,
      focusRootPath: workspacePath.value,
    })

    const nextWorkspacePath = workspacePath.value
      ? syncResult.suggestedRootPath ?? workspacePath.value
      : null

    if (nextWorkspacePath && (
      nextWorkspacePath !== workspacePath.value
      || syncResult.updatedBoardRoots.some((rootPath) => isBoardWithinWorkspaceTree(rootPath, workspacePath.value!))
    )) {
      const loadResult = await loadWorkspace(nextWorkspacePath, {
        preserveSelection: true,
      })
      return {
        missingBoardRoots: [...syncResult.missingBoardRoots, ...(loadResult?.missingBoardRoots ?? [])],
      } satisfies WorkspaceLoadResult
    }

    return {
      missingBoardRoots: syncResult.missingBoardRoots,
    } satisfies WorkspaceLoadResult
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
        : nextWorkspace.boardsBySlug[nextWorkspace.rootBoardSlug]
          ? nextWorkspace.rootBoardSlug
          : nextWorkspace.boardOrder[0] ?? null
    selectedCardSlug.value = payload.selectedCard?.slug && nextWorkspace.cardsBySlug[payload.selectedCard.slug]
      ? payload.selectedCard.slug
      : null
    selectedCardSourceBoardSlug.value = payload.selectedCard?.sourceBoardSlug
      && nextWorkspace.boardsBySlug[payload.selectedCard.sourceBoardSlug]
      ? payload.selectedCard.sourceBoardSlug
      : null
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
      : nextWorkspace.boardsBySlug[nextWorkspace.rootBoardSlug]
        ? nextWorkspace.rootBoardSlug
        : nextWorkspace.boardOrder[0] ?? null
    selectedCardSlug.value = preserveSelection ? selectedCardSlug.value : null
    selectedCardSourceBoardSlug.value = preserveSelection ? selectedCardSourceBoardSlug.value : null
  }

  function clearWorkspaceState() {
    workspace.value = null
    workspacePath.value = null
    lastSnapshotSignature.value = null
    currentBoardSlug.value = null
    selectedCardSlug.value = null
    selectedCardSourceBoardSlug.value = null
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
    if (pendingConfigWrite !== null) {
      window.clearTimeout(pendingConfigWrite)
      pendingConfigWrite = null
    }

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
    viewPreferences,
    theme,
    openWorkspace,
    attachExistingBoard,
    closeWorkspace,
    restoreWorkspace,
    loadWorkspaceRoot,
    registerKnownBoardRoots,
    selectBoard,
    selectCard,
    closeCard,
    applyWorkspaceMutation,
    updateViewPreferences,
    setTheme,
  }
}

function snapshotBoardRoots(snapshot: WorkspaceSnapshot) {
  const projectRoot = parentDirectoryOfTodoRoot(snapshot.rootPath)
  return snapshot.boards.map((board) => normalizeTodoRootPath(joinTodoRoot(projectRoot, board.path)))
}

function joinTodoRoot(projectRoot: string, boardPath: string) {
  const normalizedProjectRoot = normalizeTodoRootPath(projectRoot)
  const normalizedBoardPath = boardPath
    .replace(/\\/g, '/')
    .replace(/\/todo\.md$/i, '')

  return `${normalizedProjectRoot}/${normalizedBoardPath}`
}

function coerceBoardRootSelection(selection: string) {
  const normalizedSelection = normalizeTodoRootPath(selection)
  return normalizedSelection.endsWith('/TODO') ? normalizedSelection : `${normalizedSelection}/TODO`
}

function parentDirectoryOfTodoRoot(todoRoot: string) {
  return normalizeTodoRootPath(todoRoot).replace(/\/TODO$/i, '')
}

function normalizeTodoRootPath(path: string) {
  return path.replace(/\\/g, '/').replace(/\/+$/, '')
}

function isBoardWithinWorkspaceTree(boardRoot: string, workspaceRoot: string) {
  const normalizedBoardRoot = normalizeTodoRootPath(boardRoot)
  const normalizedWorkspaceRoot = normalizeTodoRootPath(workspaceRoot)
  const workspaceProjectRoot = `${parentDirectoryOfTodoRoot(normalizedWorkspaceRoot)}/`

  return normalizedBoardRoot === normalizedWorkspaceRoot
    || normalizedBoardRoot.startsWith(workspaceProjectRoot)
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
