import { reactive } from 'vue'

export interface DragItem {
  cardId: string
  sourceColumnId: string
  sourceParentId?: string
  meta?: Record<string, unknown>
}

export interface DropTarget {
  columnId: string
  cardId?: string
  insertIndex?: number
  beforeCardId?: string
  afterCardId?: string
}

const LOG = '[DragDrop]'

/**
 * Shared drag-and-drop composable using pointer events instead of HTML5 DnD.
 * HTML5 drag-and-drop does not work in Tauri v2's WKWebView on macOS,
 * so we implement our own with pointer events + a ghost element.
 *
 * Tree elements are registered separately from card elements so that
 * insert-position calculations use the full visual height of a card
 * including all its descendant sub-items, while hit-testing still
 * targets individual card surfaces.
 */
export function useDragDrop(
  onDrop: (item: DragItem, target: DropTarget) => void | Promise<void>
) {
  let recentlyDragged = false

  const state = reactive({
    draggedItem: null as DragItem | null,
    dragOverColumnId: null as string | null,
    dragOverCardId: null as string | null,
    insertBeforeCardId: null as string | null,
    insertAfterCardId: null as string | null,
    isDragging: false,
    ghostEl: null as HTMLElement | null,
    startX: 0,
    startY: 0,
    dragStarted: false,
  })

  const columnElements = new Map<string, HTMLElement>()
  const cardElements = new Map<string, HTMLElement>()
  // Tree elements: card id -> wrapper div that includes the card + all children.
  // Used for accurate height-based insert position calculations.
  const treeElements = new Map<string, HTMLElement>()

  function registerColumn(columnId: string, el: HTMLElement | null) {
    el ? columnElements.set(columnId, el) : columnElements.delete(columnId)
  }

  function registerCard(cardId: string, el: HTMLElement | null) {
    el ? cardElements.set(cardId, el) : cardElements.delete(cardId)
  }

  function registerTree(cardId: string, el: HTMLElement | null) {
    el ? treeElements.set(cardId, el) : treeElements.delete(cardId)
  }

  function handlePointerDown(item: DragItem, event: PointerEvent) {
    if (event.button !== 0) return

    state.draggedItem = { ...item, meta: item.meta ? { ...item.meta } : undefined }
    state.startX = event.clientX
    state.startY = event.clientY
    state.dragStarted = false
    state.isDragging = true

    const target = event.currentTarget as HTMLElement
    target.setPointerCapture(event.pointerId)
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'
  }

  function handlePointerMove(event: PointerEvent) {
    if (!state.isDragging || !state.draggedItem) return

    if (!state.dragStarted) {
      const dx = event.clientX - state.startX
      const dy = event.clientY - state.startY
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return
      state.dragStarted = true
      createGhost(event)
    }

    if (state.ghostEl) {
      state.ghostEl.style.left = `${event.clientX + 10}px`
      state.ghostEl.style.top = `${event.clientY + 10}px`
    }

    const hitCardId = getCardAtPoint(event.clientX, event.clientY)
    const hitColumnId = hitCardId ? getColumnForCard(hitCardId) : getColumnAtPoint(event.clientX, event.clientY)

    state.dragOverCardId = hitCardId
    state.dragOverColumnId = hitColumnId

    // Calculate insert position for reordering within column
    if (hitColumnId && !hitCardId) {
      const insertPos = getInsertPosition(event.clientX, event.clientY, hitColumnId)
      state.insertBeforeCardId = insertPos.afterCardId || null
      state.insertAfterCardId = insertPos.beforeCardId || null
    } else {
      state.insertBeforeCardId = null
      state.insertAfterCardId = null
    }
  }

  function handlePointerUp(event: PointerEvent) {
    if (!state.isDragging) return

    // Restore text selection
    document.body.style.userSelect = ''
    document.body.style.webkitUserSelect = ''

    // Snapshot state before cleanup
    const item = state.draggedItem ? { ...state.draggedItem } : null
    const targetColumnId = state.dragOverColumnId
    const targetCardId = state.dragOverCardId
    const didDrag = state.dragStarted

    // Get insert position before reset
    const insertBeforeCardId = state.insertBeforeCardId
    const insertAfterCardId = state.insertAfterCardId

    // Reset
    removeGhost()
    state.isDragging = false
    state.dragStarted = false
    state.dragOverColumnId = null
    state.dragOverCardId = null
    state.insertBeforeCardId = null
    state.insertAfterCardId = null
    state.draggedItem = null

    if (didDrag) {
      recentlyDragged = true
      setTimeout(() => { recentlyDragged = false }, 50)
    }

    const target = event.currentTarget as HTMLElement
    if (target.hasPointerCapture?.(event.pointerId)) {
      target.releasePointerCapture(event.pointerId)
    }

    if (!item || !didDrag || !targetColumnId) return

    const droppedOnCard = !!targetCardId && targetCardId !== item.cardId
    const movedColumn = item.sourceColumnId !== targetColumnId
    const hasParent = !!item.sourceParentId
    const isReordering = !!insertBeforeCardId || !!insertAfterCardId

    // Skip only when nothing meaningful happened (root card, same column, no card target, no reordering)
    if (!droppedOnCard && !movedColumn && !hasParent && !isReordering) return

    console.log(LOG, 'drop:', item.cardId, '→', { targetColumnId, targetCardId, movedColumn, droppedOnCard, hasParent })

    const dropTarget: DropTarget = {
      columnId: targetColumnId,
      cardId: droppedOnCard ? targetCardId! : undefined,
      beforeCardId: insertAfterCardId || undefined,
      afterCardId: insertBeforeCardId || undefined,
    }

    Promise.resolve(onDrop(item, dropTarget))
      .catch((err) => console.error(LOG, 'onDrop error:', err))
  }

  function createGhost(event: PointerEvent) {
    const ghost = document.createElement('div')
    ghost.textContent = 'Moving card...'
    ghost.style.cssText = `
      position: fixed; left: ${event.clientX + 10}px; top: ${event.clientY + 10}px;
      padding: 6px 12px; background: var(--bg-tertiary, #2a2a2a);
      border: 1px solid var(--border-visible, #666); color: var(--text-primary, #fff);
      font-size: 12px; pointer-events: none; z-index: 9999; opacity: 0.9;
    `
    document.body.appendChild(ghost)
    state.ghostEl = ghost
  }

  function removeGhost() {
    state.ghostEl?.remove()
    state.ghostEl = null
  }

  function getColumnAtPoint(x: number, y: number): string | null {
    for (const [id, el] of columnElements) {
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id
    }
    return null
  }

  function getCardAtPoint(x: number, y: number): string | null {
    const draggedId = state.draggedItem?.cardId
    for (const [id, el] of cardElements) {
      if (id === draggedId) continue
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id
    }
    return null
  }

  function getColumnForCard(cardId: string): string | null {
    const el = cardElements.get(cardId)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return getColumnAtPoint(r.left + r.width / 2, r.top + r.height / 2)
  }

  /**
   * Determines where a card should be inserted within a column.
   * Uses tree elements (card + all descendants) for rect calculations
   * so that cards with many sub-items are correctly measured at their
   * full visual height. Falls back to card elements when no tree
   * element is registered.
   */
  function getInsertPosition(_x: number, y: number, columnId: string): { beforeCardId?: string; afterCardId?: string } {
    const draggedId = state.draggedItem?.cardId
    const columnCards: Array<{ id: string; rect: DOMRect }> = []

    // Collect all card elements in this column, using tree rects for
    // accurate height that includes sub-items.
    for (const [id, el] of cardElements) {
      if (id === draggedId) continue
      const cardColumnId = getColumnForCard(id)
      if (cardColumnId === columnId) {
        // Prefer the tree element rect (includes children) over the
        // bare card element rect.
        const treeEl = treeElements.get(id)
        const rect = treeEl ? treeEl.getBoundingClientRect() : el.getBoundingClientRect()
        columnCards.push({ id, rect })
      }
    }

    if (columnCards.length === 0) {
      return {}
    }

    // Sort by vertical position
    columnCards.sort((a, b) => a.rect.top - b.rect.top)

    // Deduplicate: if a parent and child are both in the list,
    // only keep root-level entries (those whose tree rect isn't
    // fully contained inside another entry's tree rect).
    const roots: typeof columnCards = []
    for (const card of columnCards) {
      const isNested = columnCards.some(
        other => other.id !== card.id &&
          other.rect.top <= card.rect.top &&
          other.rect.bottom >= card.rect.bottom
      )
      if (!isNested) roots.push(card)
    }

    const cards = roots.length > 0 ? roots : columnCards

    // Find where the drop point falls using the full tree height
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]
      const midY = card.rect.top + card.rect.height / 2

      if (y < midY) {
        // Dropping before this card
        return {
          beforeCardId: i > 0 ? cards[i - 1].id : undefined,
          afterCardId: card.id
        }
      }
    }

    // Dropping after the last card
    return {
      beforeCardId: cards[cards.length - 1].id,
      afterCardId: undefined
    }
  }

  function wasDragging(): boolean {
    return recentlyDragged
  }

  return { state, registerColumn, registerCard, registerTree, handlePointerDown, handlePointerMove, handlePointerUp, wasDragging }
}
