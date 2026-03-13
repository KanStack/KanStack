type ClosestCapable = {
  closest?: (selector: string) => unknown
  parentElement?: ClosestCapable | null
}

const TITLE_CONTROL_SELECTOR = '[data-column-title-control="true"]'

function getClosestCapableTarget(target: EventTarget | null): ClosestCapable | null {
  if (!target || typeof target !== 'object') {
    return null
  }

  const candidate = target as ClosestCapable
  if (typeof candidate.closest === 'function') {
    return candidate
  }

  const parent = candidate.parentElement
  if (parent && typeof parent.closest === 'function') {
    return parent
  }

  return null
}

export function shouldStartColumnHeaderDrag(target: EventTarget | null) {
  const candidate = getClosestCapableTarget(target)
  if (!candidate) {
    return true
  }

  return !candidate.closest?.(TITLE_CONTROL_SELECTOR)
}

export { TITLE_CONTROL_SELECTOR }
