import { onUnmounted, reactive } from 'vue'

interface ColumnDragState {
  draggedColumnSlug: string | null
  insertIndex: number | null
  isDragging: boolean
}

const DRAG_THRESHOLD = 5

export function useBoardColumnDrag(
  onDrop: (columnSlug: string, targetIndex: number) => void | Promise<void>,
) {
  let recentlyDragged = false
  let startX = 0
  let startY = 0
  let dragStarted = false
  let dragSourceEl: HTMLElement | null = null
  let dragPreviewEl: HTMLElement | null = null
  let offsetX = 0
  let offsetY = 0

  const state = reactive<ColumnDragState>({
    draggedColumnSlug: null,
    insertIndex: null,
    isDragging: false,
  })

  function handlePointerDown(columnSlug: string, event: PointerEvent) {
    if (event.button !== 0) {
      return
    }

    const currentTarget = event.currentTarget as HTMLElement
    const dragRoot = currentTarget.closest('[data-column-reorder-item="true"]') as HTMLElement | null
    if (!dragRoot) {
      return
    }

    state.draggedColumnSlug = columnSlug
    state.isDragging = true
    dragStarted = false
    startX = event.clientX
    startY = event.clientY
    dragSourceEl = dragRoot

    const rect = dragRoot.getBoundingClientRect()
    offsetX = event.clientX - rect.left
    offsetY = event.clientY - rect.top
    currentTarget.setPointerCapture(event.pointerId)
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'
  }

  function handlePointerMove(event: PointerEvent) {
    if (!state.isDragging || !state.draggedColumnSlug) {
      return
    }

    if (!dragStarted) {
      const dx = event.clientX - startX
      const dy = event.clientY - startY
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
        return
      }

      dragStarted = true
      createPreview(event.clientX, event.clientY)
    }

    updatePreviewPosition(event.clientX, event.clientY)
    state.insertIndex = getColumnDropIndex(event.clientX, event.clientY)
  }

  function handlePointerUp(event: PointerEvent) {
    if (!state.isDragging) {
      return
    }

    const draggedColumnSlug = state.draggedColumnSlug
    const targetIndex = dragStarted ? getColumnDropIndex(event.clientX, event.clientY) : null
    const didDrag = dragStarted

    const currentTarget = event.currentTarget as HTMLElement
    if (currentTarget.hasPointerCapture?.(event.pointerId)) {
      currentTarget.releasePointerCapture(event.pointerId)
    }

    reset()

    if (didDrag) {
      recentlyDragged = true
      window.setTimeout(() => {
        recentlyDragged = false
      }, 50)
    }

    if (!draggedColumnSlug || !didDrag || targetIndex === null) {
      return
    }

    Promise.resolve(onDrop(draggedColumnSlug, targetIndex)).catch((error) => {
      console.error('Failed to reorder column', error)
    })
  }

  function wasDragging() {
    return recentlyDragged
  }

  function createPreview(clientX: number, clientY: number) {
    if (!dragSourceEl || dragPreviewEl) {
      return
    }

    const rect = dragSourceEl.getBoundingClientRect()
    const clone = dragSourceEl.cloneNode(true) as HTMLElement
    clone.style.position = 'fixed'
    clone.style.left = '0'
    clone.style.top = '0'
    clone.style.width = `${rect.width}px`
    clone.style.margin = '0'
    clone.style.pointerEvents = 'none'
    clone.style.zIndex = '9999'
    clone.style.opacity = '0.92'
    clone.style.boxShadow = '0 14px 32px rgba(0, 0, 0, 0.35)'
    clone.style.transform = 'translate3d(-9999px, -9999px, 0)'

    document.body.appendChild(clone)
    dragPreviewEl = clone
    updatePreviewPosition(clientX, clientY)
  }

  function updatePreviewPosition(clientX: number, clientY: number) {
    if (!dragPreviewEl) {
      return
    }

    dragPreviewEl.style.transform = `translate3d(${clientX - offsetX}px, ${clientY - offsetY}px, 0)`
  }

  function reset() {
    dragPreviewEl?.remove()
    dragPreviewEl = null
    state.draggedColumnSlug = null
    state.insertIndex = null
    state.isDragging = false
    dragStarted = false
    dragSourceEl = null
    document.body.style.userSelect = ''
    document.body.style.webkitUserSelect = ''
  }

  onUnmounted(() => {
    reset()
  })

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    state,
    wasDragging,
  }
}

function getColumnDropIndex(x: number, y: number) {
  const hit = document.elementFromPoint(x, y) as HTMLElement | null
  const item = hit?.closest('[data-column-reorder-item="true"]') as HTMLElement | null
  const explicitSlot = hit?.closest('[data-column-drop-index]') as HTMLElement | null

  if (explicitSlot) {
    const rawIndex = explicitSlot.dataset.columnDropIndex
    return rawIndex ? Number(rawIndex) : null
  }

  if (!item) {
    return null
  }

  const rawIndex = item.dataset.columnIndex
  if (rawIndex === undefined) {
    return null
  }

  const columnIndex = Number(rawIndex)
  const rect = item.getBoundingClientRect()
  const midpoint = rect.left + rect.width / 2
  return x < midpoint ? columnIndex : columnIndex + 1
}
