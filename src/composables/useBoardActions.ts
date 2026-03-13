import { shallowRef } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'

import type {
  KanbanBoardDocument,
  KanbanBoardSettings,
  KanbanCardDocument,
} from '@docs/schemas/kanban-parser-schema'
import type { WorkspaceFileSnapshot, WorkspaceSnapshot } from '@/types/workspace'
import type { MoveBoardCardInput } from '@/utils/serializeBoard'
import {
  addBoardCardMarkdown,
  archiveBoardCardMarkdown,
  archiveBoardCardsMarkdown,
  createBoardMarkdownFromColumns,
  deleteBoardColumnMarkdown,
  moveBoardCardMarkdown,
  reorderBoardColumnsMarkdown,
  renameBoardColumnMarkdown,
  renameBoardMarkdown,
  syncBoardColumnsMarkdown,
} from '@/utils/serializeBoard'
import { isArchiveColumnSlug } from '@/utils/archiveColumn'
import { serializeCardMarkdown } from '@/utils/serializeCard'
import { updateBoardSettingsMarkdown } from '@/utils/serializeBoardSettings'
import { cardSlugFromTitle, getNextAvailableSlug } from '@/utils/slug'
import {
  buildBoardCardPath,
  buildBoardCardTarget,
  cardIdFromCardPath,
  slugifySegment,
} from '@/utils/kanbanPath'
import { countCardsInColumn, deriveWorkspaceColumns, insertWorkspaceColumnBeforeArchive, reorderWorkspaceColumns } from '@/utils/workspaceColumns'

const DEFAULT_NEW_BOARD_COLUMNS = [
  { name: 'Backlog', slug: 'backlog' },
  { name: 'In Progress', slug: 'in-progress' },
  { name: 'Review', slug: 'review' },
  { name: 'Done', slug: 'done' },
]

interface UseBoardActionsOptions {
  getBoardsBySlug: () => Record<string, KanbanBoardDocument>
  getWorkspaceRoot: () => string | null
  getBoardFilesBySlug: () => Record<string, WorkspaceFileSnapshot>
  getCardsBySlug: () => Record<string, KanbanCardDocument>
}

export function useBoardActions(options: UseBoardActionsOptions) {
  const isCreatingCard = shallowRef(false)
  const isCreatingColumn = shallowRef(false)
  const isCreatingBoard = shallowRef(false)
  const isDeletingColumn = shallowRef(false)
  const isMovingCard = shallowRef(false)
  const isRenamingColumn = shallowRef(false)
  const isRenamingBoard = shallowRef(false)
  const isSavingPreference = shallowRef(false)

  async function moveCard(board: KanbanBoardDocument, input: MoveBoardCardInput) {
    const workspaceRoot = options.getWorkspaceRoot()
    if (!workspaceRoot || isMovingCard.value) {
      return false
    }

    const nextContent = moveBoardCardMarkdown(board, input)
    isMovingCard.value = true

    try {
      return await invoke<WorkspaceSnapshot>('save_board_file', {
        root: workspaceRoot,
        path: board.path,
        content: nextContent,
      })
    } catch (error) {
      console.error('Failed to move card', error)
      return null
    } finally {
      isMovingCard.value = false
    }
  }

  async function saveBoardSettings(board: KanbanBoardDocument, settings: KanbanBoardSettings) {
    const workspaceRoot = options.getWorkspaceRoot()
    const boardFileContent = options.getBoardFilesBySlug()[board.slug]?.content ?? null
    if (!workspaceRoot || !boardFileContent || isSavingPreference.value) {
      return null
    }

    const nextContent = updateBoardSettingsMarkdown(boardFileContent, settings)
    isSavingPreference.value = true

    try {
      return await invoke<WorkspaceSnapshot>('save_board_file', {
        root: workspaceRoot,
        path: board.path,
        content: nextContent,
      })
    } catch (error) {
      console.error('Failed to save board settings', error)
      return null
    } finally {
      isSavingPreference.value = false
    }
  }

  async function createCard(board: KanbanBoardDocument) {
    const workspaceRoot = options.getWorkspaceRoot()
    if (!workspaceRoot || board.columns.length === 0 || isCreatingCard.value) {
      return null
    }

    const slug = getNextCardSlug(Object.values(options.getCardsBySlug()), board)
    const title = 'Untitled Card'
    const cardPath = buildBoardCardPath(board, slug)
    const targetColumn = board.columns.find((column) => !isArchiveColumnSlug(column.slug)) ?? board.columns[0]
    const targetSection = targetColumn.sections[0] ?? null
    const cardContent = serializeCardMarkdown({
      title,
      metadata: { title },
      body: '',
    })
    const boardContent = addBoardCardMarkdown(board, {
      cardSlug: cardIdFromCardPath(cardPath),
      cardTarget: buildBoardCardTarget(slug),
      targetColumnName: targetColumn.name,
      targetColumnSlug: targetColumn.slug,
      targetSectionName: targetSection?.name ?? null,
      targetSectionSlug: targetSection?.slug ?? null,
    })

    isCreatingCard.value = true

    try {
      const snapshot = await invoke<WorkspaceSnapshot>('create_card_in_board', {
        root: workspaceRoot,
        cardPath,
        cardContent,
        boardPath: board.path,
        boardContent,
      })
      return { slug: cardIdFromCardPath(cardPath), snapshot }
    } catch (error) {
      console.error('Failed to create card', error)
      return null
    } finally {
      isCreatingCard.value = false
    }
  }

  async function createBoard() {
    const workspaceRoot = options.getWorkspaceRoot()
    if (isCreatingBoard.value) {
      return null
    }

    const selection = await open({
      directory: true,
      multiple: false,
      defaultPath: workspaceRoot ? defaultBoardDirectory(workspaceRoot) : undefined,
      title: 'Choose where to create the new board',
    })

    if (typeof selection !== 'string') {
      return null
    }

    const title = 'Untitled Board'
    const referenceBoard = Object.values(options.getBoardsBySlug())[0]
    const boardColumns = referenceBoard
      ? deriveWorkspaceColumns(options.getBoardsBySlug(), referenceBoard)
      : DEFAULT_NEW_BOARD_COLUMNS
    const boardContent = createBoardMarkdownFromColumns(title, boardColumns)

    isCreatingBoard.value = true

    try {
      const todoPath = await invoke<string>('create_board', {
        destinationPath: selection,
        boardContent,
      })
      return { todoPath }
    } catch (error) {
      console.error('Failed to create board', error)
      return null
    } finally {
      isCreatingBoard.value = false
    }
  }

  async function addColumn(preferredBoard: KanbanBoardDocument) {
    const workspaceRoot = options.getWorkspaceRoot()
    if (!workspaceRoot || isCreatingColumn.value) {
      return null
    }

    const nextName = 'Untitled Column'
    const globalColumns = deriveWorkspaceColumns(options.getBoardsBySlug(), preferredBoard)
    const nextSlug = getNextAvailableSlug(
      slugifySegment(nextName) || 'untitled-column',
      globalColumns.map((column) => column.slug),
    )
    const nextColumns = insertWorkspaceColumnBeforeArchive(globalColumns, { name: nextName, slug: nextSlug })
    const snapshot = await saveColumns(
      Object.values(options.getBoardsBySlug()).map((board) => ({
        path: board.path,
        content: syncBoardColumnsMarkdown(board, nextColumns),
      })),
      'create',
    )

    if (!snapshot) {
      return null
    }

    return {
      name: nextName,
      slug: nextSlug,
      snapshot,
    }
  }

  async function renameColumn(preferredBoard: KanbanBoardDocument, currentSlug: string, nextName: string) {
    const workspaceRoot = options.getWorkspaceRoot()
    const normalizedName = nextName.trim()
    if (!workspaceRoot || !normalizedName || isRenamingColumn.value) {
      return null
    }

    if (isArchiveColumnSlug(currentSlug)) {
      throw new Error('Archive column cannot be renamed.')
    }

    const globalColumns = deriveWorkspaceColumns(options.getBoardsBySlug(), preferredBoard)
    const siblingSlugs = globalColumns.map((column) => column.slug).filter((slug) => slug !== currentSlug)
    const nextSlug = getNextAvailableSlug(slugifySegment(normalizedName) || currentSlug, siblingSlugs)
    const snapshot = await saveColumns(
      Object.values(options.getBoardsBySlug()).map((board) => ({
        path: board.path,
        content: renameBoardColumnMarkdown(board, currentSlug, normalizedName, nextSlug),
      })),
      'rename',
    )

    if (!snapshot) {
      return null
    }

    return {
      name: normalizedName,
      slug: nextSlug,
      snapshot,
    }
  }

  async function deleteColumn(columnSlug: string) {
    const workspaceRoot = options.getWorkspaceRoot()
    if (!workspaceRoot || isDeletingColumn.value) {
      return null
    }

    if (isArchiveColumnSlug(columnSlug)) {
      throw new Error('Archive column cannot be deleted.')
    }

    const boards = Object.values(options.getBoardsBySlug())
    const hasCards = boards.some((board) => countCardsInColumn(board.columns.find((column) => column.slug === columnSlug)) > 0)
    if (hasCards) {
      return { blocked: true as const, snapshot: null }
    }

    const snapshot = await saveColumns(
      boards.map((board) => ({
        path: board.path,
        content: deleteBoardColumnMarkdown(board, columnSlug),
      })),
      'delete',
    )

    if (!snapshot) {
      return null
    }

    return { blocked: false as const, snapshot }
  }

  async function reorderColumns(preferredBoard: KanbanBoardDocument, draggedSlug: string, targetIndex: number) {
    const workspaceRoot = options.getWorkspaceRoot()
    if (!workspaceRoot || isRenamingColumn.value) {
      return null
    }

    const globalColumns = deriveWorkspaceColumns(options.getBoardsBySlug(), preferredBoard)
    const reorderedColumns = reorderWorkspaceColumns(globalColumns, draggedSlug, targetIndex)
    const snapshot = await saveColumns(
      Object.values(options.getBoardsBySlug()).map((board) => ({
        path: board.path,
        content: reorderBoardColumnsMarkdown(board, reorderedColumns.map((column) => column.slug)),
      })),
      'rename',
    )

    return snapshot
  }

  async function saveColumns(
    boards: Array<{ path: string; content: string }>,
    mode: 'create' | 'rename' | 'delete',
  ) {
    const workspaceRoot = options.getWorkspaceRoot()
    if (!workspaceRoot) {
      return null
    }

    if (mode === 'create') {
      isCreatingColumn.value = true
    }

    if (mode === 'rename') {
      isRenamingColumn.value = true
    }

    if (mode === 'delete') {
      isDeletingColumn.value = true
    }

    try {
      return await invoke<WorkspaceSnapshot>('save_workspace_boards', {
        root: workspaceRoot,
        boards,
      })
    } catch (error) {
      console.error(`Failed to ${mode} column`, error)
      return null
    } finally {
      if (mode === 'create') {
        isCreatingColumn.value = false
      }
      if (mode === 'rename') {
        isRenamingColumn.value = false
      }
      if (mode === 'delete') {
        isDeletingColumn.value = false
      }
    }
  }

  async function archiveCard(board: KanbanBoardDocument, cardSlug: string) {
    return archiveCards(board, [cardSlug])
  }

  async function archiveCards(board: KanbanBoardDocument, cardSlugs: string[]) {
    const workspaceRoot = options.getWorkspaceRoot()
    if (!workspaceRoot || isMovingCard.value) {
      return false
    }

    const nextContent = cardSlugs.length === 1
      ? archiveBoardCardMarkdown(board, cardSlugs[0])
      : archiveBoardCardsMarkdown(board, cardSlugs)
    isMovingCard.value = true

    try {
      return await invoke<WorkspaceSnapshot>('save_board_file', {
        root: workspaceRoot,
        path: board.path,
        content: nextContent,
      })
    } catch (error) {
      console.error('Failed to archive card', error)
      return null
    } finally {
      isMovingCard.value = false
    }
  }

  async function renameBoard(board: KanbanBoardDocument, title: string) {
    const workspaceRoot = options.getWorkspaceRoot()
    const normalizedTitle = title.trim()
    if (!workspaceRoot || !normalizedTitle || isRenamingBoard.value) {
      return null
    }

    if (normalizedTitle === board.title) {
      return {
        slug: board.slug,
        snapshot: null,
      }
    }

    const content = renameBoardMarkdown(board, normalizedTitle)
    isRenamingBoard.value = true

    try {
      const snapshot = await invoke<WorkspaceSnapshot>('save_board_file', {
        root: workspaceRoot,
        path: board.path,
        content,
      })

      return {
        slug: board.slug,
        snapshot,
      }
    } catch (error) {
      console.error('Failed to rename board', error)
      return null
    } finally {
      isRenamingBoard.value = false
    }
  }

  return {
    isCreatingCard,
    isCreatingColumn,
    isCreatingBoard,
    isDeletingColumn,
    isMovingCard,
    isRenamingColumn,
    isRenamingBoard,
    isSavingPreference,
    addColumn,
    moveCard,
    saveBoardSettings,
    createCard,
    createBoard,
    archiveCard,
    archiveCards,
    deleteColumn,
    reorderColumns,
    renameColumn,
    renameBoard,
  }
}

function getNextCardSlug(cards: KanbanCardDocument[], board: KanbanBoardDocument) {
  const cardDirectoryPrefix = `${board.slug}/cards/`
  const existingSlugs = cards
    .filter((card) => card.path.startsWith(cardDirectoryPrefix))
    .map((card) => card.path.split('/').pop()?.replace(/\.md$/i, '') ?? '')
    .filter(Boolean)

  return getNextAvailableSlug(cardSlugFromTitle('Untitled Card'), existingSlugs)
}

function defaultBoardDirectory(workspaceRoot: string) {
  return workspaceRoot.replace(/[\\/]TODO$/i, '')
}
