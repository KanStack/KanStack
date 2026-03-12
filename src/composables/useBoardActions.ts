import { shallowRef } from 'vue'
import { invoke } from '@tauri-apps/api/core'

import type {
  KanbanBoardDocument,
  KanbanBoardSettings,
  KanbanCardDocument,
} from '@docs/schemas/kanban-parser-schema'
import type { WorkspaceFileSnapshot, WorkspaceSnapshot } from '@/types/workspace'
import type { MoveBoardCardInput } from '@/utils/serializeBoard'
import {
  addBoardCardMarkdown,
  addSubBoardMarkdown,
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
import { getBoardRenameTarget } from '@/utils/renameTarget'
import { serializeCardMarkdown } from '@/utils/serializeCard'
import { updateBoardSettingsMarkdown } from '@/utils/serializeBoardSettings'
import { boardSlugFromTitle, cardSlugFromTitle, getNextAvailableSlug } from '@/utils/slug'
import { slugifySegment } from '@/utils/kanbanPath'
import { countCardsInColumn, deriveWorkspaceColumns, insertWorkspaceColumnBeforeArchive, reorderWorkspaceColumns } from '@/utils/workspaceColumns'

interface UseBoardActionsOptions {
  getBoardsBySlug: () => Record<string, KanbanBoardDocument>
  getWorkspaceRoot: () => string | null
  getBoardFilesBySlug: () => Record<string, WorkspaceFileSnapshot>
  getCardsBySlug: () => Record<string, KanbanCardDocument>
}

export function useBoardActions(options: UseBoardActionsOptions) {
  const isCreatingCard = shallowRef(false)
  const isCreatingColumn = shallowRef(false)
  const isCreatingSubBoard = shallowRef(false)
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

    const slug = getNextCardSlug(Object.keys(options.getCardsBySlug()))
    const title = 'Untitled Card'
    const targetColumn = board.columns.find((column) => !isArchiveColumnSlug(column.slug)) ?? board.columns[0]
    const targetSection = targetColumn.sections[0] ?? null
    const cardContent = serializeCardMarkdown({
      title,
      metadata: { title },
      body: '',
    })
    const boardContent = addBoardCardMarkdown(board, {
      cardSlug: slug,
      targetColumnName: targetColumn.name,
      targetColumnSlug: targetColumn.slug,
      targetSectionName: targetSection?.name ?? null,
      targetSectionSlug: targetSection?.slug ?? null,
    })

    isCreatingCard.value = true

    try {
      const snapshot = await invoke<WorkspaceSnapshot>('create_card_in_board', {
        root: workspaceRoot,
        cardPath: `cards/${slug}.md`,
        cardContent,
        boardPath: board.path,
        boardContent,
      })
      return { slug, snapshot }
    } catch (error) {
      console.error('Failed to create card', error)
      return null
    } finally {
      isCreatingCard.value = false
    }
  }

  async function createSubBoard(board: KanbanBoardDocument) {
    const workspaceRoot = options.getWorkspaceRoot()
    if (!workspaceRoot || isCreatingSubBoard.value) {
      return null
    }

    const title = 'Untitled Board'
    const slug = getNextBoardSlug(Object.keys(options.getBoardsBySlug()))
    const boardContent = createBoardMarkdownFromColumns(title, deriveWorkspaceColumns(options.getBoardsBySlug(), board))
    const parentBoardContent = addSubBoardMarkdown(board, {
      boardSlug: slug,
      boardTitle: title,
    })

    isCreatingSubBoard.value = true

    try {
      const snapshot = await invoke<WorkspaceSnapshot>('create_sub_board', {
        root: workspaceRoot,
        boardPath: `boards/${slug}.md`,
        boardContent,
        parentBoardPath: board.path,
        parentBoardContent,
      })
      return { slug, snapshot }
    } catch (error) {
      console.error('Failed to create sub board', error)
      return null
    } finally {
      isCreatingSubBoard.value = false
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

    const target = getBoardRenameTarget(normalizedTitle, board.slug, Object.keys(options.getBoardsBySlug()))
    if (target.slug === board.slug && normalizedTitle === board.title) {
      return {
        slug: board.slug,
        snapshot: null,
      }
    }

    const content = renameBoardMarkdown(board, normalizedTitle)
    isRenamingBoard.value = true

    try {
      const snapshot = await invoke<WorkspaceSnapshot>('rename_board', {
        root: workspaceRoot,
        oldPath: board.path,
        newPath: target.path,
        oldSlug: board.slug,
        newSlug: target.slug,
        newTitle: normalizedTitle,
        content,
      })

      return {
        slug: target.slug,
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
    isCreatingSubBoard,
    isDeletingColumn,
    isMovingCard,
    isRenamingColumn,
    isRenamingBoard,
    isSavingPreference,
    addColumn,
    moveCard,
    saveBoardSettings,
    createCard,
    createSubBoard,
    archiveCard,
    archiveCards,
    deleteColumn,
    reorderColumns,
    renameColumn,
    renameBoard,
  }
}

function getNextBoardSlug(existingSlugs: string[]) {
  return getNextAvailableSlug(boardSlugFromTitle('Untitled Board'), existingSlugs)
}

function getNextCardSlug(existingSlugs: string[]) {
  return getNextAvailableSlug(cardSlugFromTitle('Untitled Card'), existingSlugs)
}
