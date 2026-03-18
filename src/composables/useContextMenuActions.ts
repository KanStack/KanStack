import { invoke } from '@tauri-apps/api/core'
import { computed, shallowRef } from 'vue'

import type { KanbanBoardDocument, KanbanCardDocument } from '@docs/schemas/kanban-parser-schema'
import type { WorkspaceCardSelection } from '@/types/workspace'

export interface ContextMenuItem {
  label: string
  action?: () => void | Promise<void>
  divider?: boolean
  shortcut?: string
}

interface CardContext {
  type: 'card'
  x: number
  y: number
  selections: WorkspaceCardSelection[]
  cardsBySlug: Record<string, KanbanCardDocument>
  boardsBySlug: Record<string, KanbanBoardDocument>
  workspaceRoot: string
  onOpen: () => void
  onArchive: () => Promise<void>
  onDelete: () => Promise<void>
  onClose: () => void
}

interface BoardContext {
  type: 'board'
  x: number
  y: number
  board: KanbanBoardDocument
  workspaceRoot: string
  onNewColumn: () => Promise<void>
  onRename: () => void
  onDelete: () => Promise<void>
}

interface ColumnContext {
  type: 'column'
  x: number
  y: number
  columnSlug: string
  isArchiveColumn: boolean
  cardCount: number
  board: KanbanBoardDocument
  boardsBySlug: Record<string, KanbanBoardDocument>
  workspaceRoot: string
  cardsBySlug: Record<string, KanbanCardDocument>
  onNewCard: () => Promise<void>
  onRename: () => void
  onArchiveAll: () => Promise<void>
  onDeleteColumn: () => Promise<void>
  onDeleteAllArchived: () => Promise<void>
}

type Context = CardContext | BoardContext | ColumnContext | null

export function useContextMenuActions() {
  const context = shallowRef<Context>(null)

  const count = computed(() => {
    if (context.value?.type === 'card') {
      return context.value.selections.length
    }
    return 0
  })

  const isCard = computed(() => context.value?.type === 'card')
  const isBoard = computed(() => context.value?.type === 'board')
  const isColumn = computed(() => context.value?.type === 'column')

  function setCardContext(ctx: Omit<CardContext, 'type'>) {
    context.value = { type: 'card', ...ctx }
  }

  function setBoardContext(ctx: Omit<BoardContext, 'type'>) {
    context.value = { type: 'board', ...ctx }
  }

  function setColumnContext(ctx: Omit<ColumnContext, 'type'>) {
    context.value = { type: 'column', ...ctx }
  }

  function clearContext() {
    context.value = null
  }

  async function revealInFileManager(workspaceRoot: string, relativePath: string) {
    try {
      await invoke('reveal_in_file_manager', {
        root: workspaceRoot,
        relativePath,
      })
    } catch (error) {
      console.error('Failed to reveal in file manager:', error)
    }
  }

  function getProjectRoot(workspaceRoot: string): string {
    return workspaceRoot.replace(/[\/\\]TODO$/i, '')
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const items = computed<ContextMenuItem[]>(() => {
    if (!context.value) {
      return []
    }

    if (context.value.type === 'card') {
      const ctx = context.value
      const cardPath = ctx.selections.length === 1
        ? ctx.cardsBySlug[ctx.selections[0].slug]?.path
        : null

      const items: ContextMenuItem[] = []

      if (ctx.selections.length === 1) {
        items.push({
          label: 'Open',
          action: ctx.onOpen,
          shortcut: 'Enter',
        })
        items.push({ label: '', divider: true })
      }

      if (ctx.selections.length > 1) {
        items.push({
          label: `${ctx.selections.length} cards selected`,
        })
        items.push({ label: '', divider: true })
      }

      items.push({
        label: ctx.selections.length === 1 ? 'Archive' : `Archive ${ctx.selections.length}`,
        action: ctx.onArchive,
        shortcut: '⌫',
      })

      items.push({
        label: ctx.selections.length === 1 ? 'Delete' : `Delete ${ctx.selections.length}`,
        action: ctx.onDelete,
        shortcut: '⇧⌫',
      })

      if (cardPath) {
        items.push({ label: '', divider: true })
        items.push({
          label: 'Copy Slug',
          action: () => copyToClipboard(ctx.selections[0].slug),
        })
        items.push({
          label: 'Copy Path',
          action: () => {
            const projectRoot = getProjectRoot(ctx.workspaceRoot)
            copyToClipboard(`${projectRoot}/${cardPath}`)
          },
        })
        items.push({
          label: getRevealLabel(),
          action: () => revealInFileManager(ctx.workspaceRoot, cardPath),
        })
      }

      return items
    }

    if (context.value.type === 'board') {
      const ctx = context.value
      const items: ContextMenuItem[] = []

      items.push({
        label: 'New Column',
        action: ctx.onNewColumn,
        shortcut: '⌘C',
      })

      items.push({ label: '', divider: true })
      items.push({
        label: 'Rename',
        action: ctx.onRename,
        shortcut: '⌘R',
      })
      items.push({
        label: 'Delete Board',
        action: ctx.onDelete,
      })

      items.push({ label: '', divider: true })
      items.push({
        label: 'Copy Path',
        action: () => {
          const projectRoot = getProjectRoot(ctx.workspaceRoot)
          copyToClipboard(`${projectRoot}/${ctx.board.path}`)
        },
      })
      items.push({
        label: getRevealLabel(),
        action: () => revealInFileManager(ctx.workspaceRoot, ctx.board.path),
      })

      return items
    }

    if (context.value.type === 'column') {
      const ctx = context.value

      const items: ContextMenuItem[] = []

      if (ctx.isArchiveColumn) {
        if (ctx.cardCount > 0) {
          items.push({
            label: `Delete All (${ctx.cardCount})`,
            action: ctx.onDeleteAllArchived,
          })
        }
      } else {
items.push({
        label: 'New Card',
        action: ctx.onNewCard,
        shortcut: '⌘N',
      })
      items.push({
        label: 'Rename',
        action: ctx.onRename,
        shortcut: '⌘R',
      })
        if (ctx.cardCount > 0) {
          items.push({ label: '', divider: true })
          items.push({
            label: `Archive All (${ctx.cardCount})`,
            action: ctx.onArchiveAll,
          })
        }
        items.push({
          label: 'Delete Column',
          action: ctx.onDeleteColumn,
          shortcut: '⌫',
        })
      }

      return items
    }

    return []
  })

  return {
    context,
    count,
    isCard,
    isBoard,
    isColumn,
    items,
    setCardContext,
    setBoardContext,
    setColumnContext,
    clearContext,
    revealInFileManager,
    copyToClipboard,
  }
}

function getRevealLabel(): string {
  const platform = navigator.platform.toLowerCase()
  if (platform.includes('win')) {
    return 'Show in Explorer'
  }
  if (platform.includes('linux')) {
    return 'Open Containing Folder'
  }
  return 'Reveal in Finder'
}