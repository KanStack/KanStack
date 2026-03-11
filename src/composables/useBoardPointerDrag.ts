import { reactive } from 'vue'

import type { BoardViewCardLink } from '@/utils/buildBoardView'

export interface BoardPointerDropTarget {
  columnName: string
  columnSlug: string
  displayIndex: number
  sectionName: string | null
  sectionSlug: string | null
  surfaceId: string
}

interface DragState {
  draggedItem: BoardViewCardLink | null
  insertColumnSlug: string | null
  insertDisplayIndex: number | null
  insertSectionKey: string | null
  insertSurfaceId: string | null
  isDragging: boolean
}

const DRAG_THRESHOLD = 5

export function useBoardPointerDrag(
  onDrop: (item: BoardViewCardLink, target: BoardPointerDropTarget) => void | Promise<void>,
) {
  let recentlyDragged = false
  let startX = 0
  let startY = 0
  let dragStarted = false
  let dragSourceEl: HTMLElement | null = null
  let ghostEl: HTMLElement | null = null
  let ghostOffsetX = 0
  let ghostOffsetY = 0
  let pendingPointerX = 0
  let pendingPointerY = 0
  let frameId: number | null = null

  const state = reactive<DragState>({
    draggedItem: null,
    insertColumnSlug: null,
    insertDisplayIndex: null,
    insertSectionKey: null,
    insertSurfaceId: null,
    isDragging: false,
  })

  function handlePointerDown(item: BoardViewCardLink, event: PointerEvent) {
    if (event.button !== 0) {
      return
    }

    state.draggedItem = item
    state.isDragging = true
    startX = event.clientX
    startY = event.clientY
    pendingPointerX = event.clientX
    pendingPointerY = event.clientY
    dragStarted = false

    const target = event.currentTarget as HTMLElement
    dragSourceEl = target
    const rect = target.getBoundingClientRect()
    ghostOffsetX = event.clientX - rect.left
    ghostOffsetY = event.clientY - rect.top
    target.setPointerCapture(event.pointerId)
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'

    console.debug('[kanstack:pointer-drag:start]', {
      cardSlug: item.slug,
      sourceBoardSlug: item.sourceBoardSlug,
      sourceBoardTitle: item.sourceBoardTitle,
      isRolledUp: item.isRolledUp,
    })
  }

  function handlePointerMove(event: PointerEvent) {
    if (!state.isDragging || !state.draggedItem) {
      return
    }

    if (!dragStarted) {
      const dx = event.clientX - startX
      const dy = event.clientY - startY
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
        return
      }

      dragStarted = true
      createGhost()
    }

    pendingPointerX = event.clientX
    pendingPointerY = event.clientY
    updateGhostPosition(pendingPointerX, pendingPointerY)

    if (frameId !== null) {
      return
    }

    frameId = window.requestAnimationFrame(() => {
      frameId = null

      if (!state.isDragging || !state.draggedItem) {
        return
      }

      updateGhostPosition(pendingPointerX, pendingPointerY)
      const target = getDropTargetAtPoint(pendingPointerX, pendingPointerY)
      syncActiveTarget(target)
    })
  }

  function handlePointerUp(event: PointerEvent) {
    if (!state.isDragging) {
      return
    }

    document.body.style.userSelect = ''
    document.body.style.webkitUserSelect = ''

    const item = state.draggedItem
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId)
      frameId = null
    }

    const target = dragStarted ? getDropTargetAtPoint(event.clientX, event.clientY) : null
    const didDrag = dragStarted

    state.draggedItem = null
    syncActiveTarget(null)
    state.isDragging = false
    dragStarted = false
    removeGhost()
    dragSourceEl = null

    const currentTarget = event.currentTarget as HTMLElement
    if (currentTarget.hasPointerCapture?.(event.pointerId)) {
      currentTarget.releasePointerCapture(event.pointerId)
    }

    if (didDrag) {
      recentlyDragged = true
      window.setTimeout(() => {
        recentlyDragged = false
      }, 50)
    }

    console.debug('[kanstack:pointer-drag:end]', {
      cardSlug: item?.slug ?? null,
      target,
      didDrag,
    })

    if (!item || !didDrag || !target) {
      return
    }

    Promise.resolve(onDrop(item, target)).catch((error) => {
      console.error('[kanstack:pointer-drag:onDrop:error]', error)
    })
  }

  function wasDragging() {
    return recentlyDragged
  }

  function syncActiveTarget(target: ReturnType<typeof getDropTargetAtPoint>) {
    const nextColumnSlug = target?.columnSlug ?? null
    const nextSectionKey = target?.sectionKey ?? null
    const nextDisplayIndex = target?.displayIndex ?? null
    const nextSurfaceId = target?.surfaceId ?? null

    if (
      state.insertColumnSlug === nextColumnSlug &&
      state.insertSectionKey === nextSectionKey &&
      state.insertDisplayIndex === nextDisplayIndex &&
      state.insertSurfaceId === nextSurfaceId
    ) {
      return
    }

    state.insertColumnSlug = nextColumnSlug
    state.insertSectionKey = nextSectionKey
    state.insertDisplayIndex = nextDisplayIndex
    state.insertSurfaceId = nextSurfaceId
  }

  function createGhost() {
    if (!dragSourceEl || ghostEl) {
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
    clone.style.transition = 'none'
    clone.style.willChange = 'transform'
    clone.style.transform = 'translate3d(-9999px, -9999px, 0)'

    document.body.appendChild(clone)
    ghostEl = clone
    updateGhostPosition(pendingPointerX, pendingPointerY)
  }

  function updateGhostPosition(clientX: number, clientY: number) {
    if (!ghostEl) {
      return
    }

    ghostEl.style.transform = `translate3d(${clientX - ghostOffsetX}px, ${clientY - ghostOffsetY}px, 0)`
  }

  function removeGhost() {
    ghostEl?.remove()
    ghostEl = null
  }

  return {
    state,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    wasDragging,
  }
}

function getDropTargetAtPoint(x: number, y: number) {
  const hit = document.elementFromPoint(x, y) as HTMLElement | null
  const section = hit?.closest('[data-drop-section-key]') as HTMLElement | null

  if (!section) {
    return null
  }

  const cardSlots = Array.from(section.querySelectorAll<HTMLElement>('[data-card-slot="true"]'))
  let displayIndex = cardSlots.length

  for (const [index, slot] of cardSlots.entries()) {
    const rect = slot.getBoundingClientRect()
    const midpoint = rect.top + rect.height / 2
    if (y < midpoint) {
      displayIndex = index
      break
    }
  }

  return {
    columnName: section.dataset.columnName ?? '',
    columnSlug: section.dataset.columnSlug ?? '',
    displayIndex,
    sectionKey: section.dataset.dropSectionKey ?? '__default__',
    sectionName: normalizeNullableDataset(section.dataset.sectionName),
    sectionSlug: normalizeNullableDataset(section.dataset.sectionSlug),
    surfaceId: section.dataset.dropSurfaceId ?? 'default',
  }
}

function normalizeNullableDataset(value: string | undefined) {
  if (value === undefined || value === '' || value === '__default__') {
    return null
  }

  return value
}
