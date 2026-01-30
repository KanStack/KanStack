import { reactive } from 'vue'

export interface DragItem {
  cardId: string
  sourceColumnId: string
  /** Extra data consumers can attach (e.g. board path for summary view) */
  meta?: Record<string, unknown>
}

const LOG = '[DragDrop]'

/**
 * Shared drag-and-drop composable using pointer events instead of HTML5 DnD.
 * HTML5 drag-and-drop does not work in Tauri v2's WKWebView on macOS,
 * so we implement our own with pointer events + a ghost element.
 */
export function useDragDrop(onDrop: (item: DragItem, targetColumnId: string) => void | Promise<void>) {
  let recentlyDragged = false

  const state = reactive({
    draggedItem: null as DragItem | null,
    dragOverColumnId: null as string | null,
    isDragging: false,
    ghostEl: null as HTMLElement | null,
    startX: 0,
    startY: 0,
    dragStarted: false, // true once we pass the movement threshold
  })

  // Map of column element refs registered by the view
  const columnElements = new Map<string, HTMLElement>()

  function registerColumn(columnId: string, el: HTMLElement | null) {
    if (el) {
      columnElements.set(columnId, el)
    } else {
      columnElements.delete(columnId)
    }
  }

  function handlePointerDown(item: DragItem, event: PointerEvent) {
    // Only left click
    if (event.button !== 0) return

    console.log(LOG, 'pointerdown', item.cardId)

    state.draggedItem = {
      cardId: item.cardId,
      sourceColumnId: item.sourceColumnId,
      meta: item.meta ? { ...item.meta } : undefined,
    }
    state.startX = event.clientX
    state.startY = event.clientY
    state.dragStarted = false
    state.isDragging = true

    // Capture pointer for reliable move/up tracking
    const target = event.currentTarget as HTMLElement
    target.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent) {
    if (!state.isDragging || !state.draggedItem) return

    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY

    // Require 5px movement before starting drag (prevents click interference)
    if (!state.dragStarted) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return
      state.dragStarted = true
      console.log(LOG, 'drag started (threshold passed)')
      createGhost(event)
    }

    // Move ghost
    if (state.ghostEl) {
      state.ghostEl.style.left = `${event.clientX + 10}px`
      state.ghostEl.style.top = `${event.clientY + 10}px`
    }

    // Hit-test columns
    const hitColumnId = getColumnAtPoint(event.clientX, event.clientY)
    if (hitColumnId !== state.dragOverColumnId) {
      if (hitColumnId) {
        console.log(LOG, 'hovering over column:', hitColumnId)
      }
      state.dragOverColumnId = hitColumnId
    }
  }

  function handlePointerUp(event: PointerEvent) {
    if (!state.isDragging) return

    const item = state.draggedItem
    const targetColumnId = state.dragOverColumnId

    console.log(LOG, 'pointerup', {
      hadDragStarted: state.dragStarted,
      cardId: item?.cardId,
      targetColumnId,
    })

    // Track that we just dragged so click can be suppressed
    const didDrag = state.dragStarted
    
    // Clean up
    removeGhost()
    state.isDragging = false
    state.dragStarted = false
    state.dragOverColumnId = null
    state.draggedItem = null

    if (didDrag) {
      recentlyDragged = true
      setTimeout(() => { recentlyDragged = false }, 50)
    }

    // Release pointer capture
    const target = event.currentTarget as HTMLElement
    if (target.hasPointerCapture?.(event.pointerId)) {
      target.releasePointerCapture(event.pointerId)
    }

    if (!item || !targetColumnId) return
    if (item.sourceColumnId === targetColumnId) {
      console.log(LOG, 'dropped on same column, skipping')
      return
    }

    console.log(LOG, 'drop — card:', item.cardId, 'source:', item.sourceColumnId, '→ target:', targetColumnId)

    // Fire async, don't block the pointer handler
    Promise.resolve()
      .then(() => onDrop(item, targetColumnId))
      .then(() => console.log(LOG, 'onDrop completed'))
      .catch((err) => console.error(LOG, 'onDrop threw:', err))
  }

  function createGhost(event: PointerEvent) {
    const ghost = document.createElement('div')
    ghost.className = 'drag-ghost'
    ghost.textContent = 'Moving card...'
    ghost.style.cssText = `
      position: fixed;
      left: ${event.clientX + 10}px;
      top: ${event.clientY + 10}px;
      padding: 6px 12px;
      background: var(--bg-tertiary, #2a2a2a);
      border: 1px solid var(--border-visible, #666);
      color: var(--text-primary, #fff);
      font-size: 12px;
      pointer-events: none;
      z-index: 9999;
      opacity: 0.9;
    `
    document.body.appendChild(ghost)
    state.ghostEl = ghost
  }

  function removeGhost() {
    if (state.ghostEl) {
      state.ghostEl.remove()
      state.ghostEl = null
    }
  }

  function getColumnAtPoint(x: number, y: number): string | null {
    for (const [columnId, el] of columnElements) {
      const rect = el.getBoundingClientRect()
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return columnId
      }
    }
    return null
  }

  /**
   * Returns true if a drag is actively in progress (past the threshold).
   * Views should check this to suppress @click when dragging.
   */
  function wasDragging(): boolean {
    return recentlyDragged
  }

  return {
    state,
    registerColumn,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    wasDragging,
  }
}
