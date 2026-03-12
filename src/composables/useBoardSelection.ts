import { computed, shallowRef } from 'vue'

import type { VisibleBoardCardSelection, WorkspaceCardSelection } from '@/types/workspace'

export function useBoardSelection() {
  const visibleCards = shallowRef<VisibleBoardCardSelection[]>([])
  const selectedKeys = shallowRef<string[]>([])
  const lastSelectedKey = shallowRef<string | null>(null)

  const selectedCards = computed(() => {
    const visibleMap = new Map(visibleCards.value.map((card) => [cardKey(card), card]))
    return selectedKeys.value
      .map((key) => visibleMap.get(key))
      .filter((card): card is VisibleBoardCardSelection => Boolean(card))
  })

  function setVisibleCards(cards: VisibleBoardCardSelection[]) {
    visibleCards.value = cards
    const visibleKeys = new Set(cards.map((card) => cardKey(card)))
    selectedKeys.value = selectedKeys.value.filter((key) => visibleKeys.has(key))
    if (lastSelectedKey.value && !visibleKeys.has(lastSelectedKey.value)) {
      lastSelectedKey.value = null
    }
  }

  function clearSelection() {
    selectedKeys.value = []
    lastSelectedKey.value = null
  }

  function selectSingle(card: WorkspaceCardSelection) {
    const key = cardKey(card)
    selectedKeys.value = [key]
    lastSelectedKey.value = key
  }

  function toggleSelection(card: WorkspaceCardSelection) {
    const key = cardKey(card)
    if (selectedKeys.value.includes(key)) {
      selectedKeys.value = selectedKeys.value.filter((entry) => entry !== key)
    } else {
      selectedKeys.value = [...selectedKeys.value, key]
    }

    lastSelectedKey.value = key
  }

  function selectRange(card: WorkspaceCardSelection) {
    const currentKey = cardKey(card)
    const anchorKey = lastSelectedKey.value ?? currentKey
    const visibleKeys = visibleCards.value.map((entry) => cardKey(entry))
    const anchorIndex = visibleKeys.indexOf(anchorKey)
    const currentIndex = visibleKeys.indexOf(currentKey)

    if (anchorIndex === -1 || currentIndex === -1) {
      selectSingle(card)
      return
    }

    const [start, end] = anchorIndex < currentIndex
      ? [anchorIndex, currentIndex]
      : [currentIndex, anchorIndex]

    selectedKeys.value = visibleKeys.slice(start, end + 1)
    lastSelectedKey.value = currentKey
  }

  function handleSelection(card: WorkspaceCardSelection, options: { metaKey: boolean; shiftKey: boolean }) {
    if (options.shiftKey) {
      selectRange(card)
      return
    }

    if (options.metaKey) {
      toggleSelection(card)
      return
    }

    selectSingle(card)
  }

  function isSelected(card: WorkspaceCardSelection) {
    return selectedKeys.value.includes(cardKey(card))
  }

  function moveSelection(direction: 'next' | 'previous' | 'left' | 'right') {
    const visibleKeys = visibleCards.value.map((card) => cardKey(card))
    if (!visibleKeys.length) {
      return null
    }

    const anchorKey = lastSelectedKey.value ?? selectedKeys.value[selectedKeys.value.length - 1] ?? null
    if (!anchorKey) {
      const fallbackCard = direction === 'next'
        ? visibleCards.value[0]
        : visibleCards.value[visibleCards.value.length - 1]
      selectSingle(fallbackCard)
      return fallbackCard
    }

    const anchorIndex = visibleKeys.indexOf(anchorKey)
    if (anchorIndex === -1) {
      const fallbackCard = direction === 'next'
        ? visibleCards.value[0]
        : visibleCards.value[visibleCards.value.length - 1]
      selectSingle(fallbackCard)
      return fallbackCard
    }

    if (direction === 'left' || direction === 'right') {
      const currentCard = visibleCards.value[anchorIndex]
      const nextCard = moveHorizontal(currentCard, visibleCards.value, direction === 'right' ? 1 : -1)
      selectSingle(nextCard)
      return nextCard
    }

    const nextIndex = direction === 'next'
      ? Math.min(visibleCards.value.length - 1, anchorIndex + 1)
      : Math.max(0, anchorIndex - 1)
    const nextCard = visibleCards.value[nextIndex]

    selectSingle(nextCard)
    return nextCard
  }

  return {
    selectedKeys,
    selectedCards,
    selectedCount: computed(() => selectedKeys.value.length),
    clearSelection,
    handleSelection,
    isSelected,
    moveSelection,
    selectSingle,
    setVisibleCards,
  }
}

function moveHorizontal(
  currentCard: VisibleBoardCardSelection,
  visibleCards: VisibleBoardCardSelection[],
  delta: -1 | 1,
) {
  const cardsByColumn = new Map<number, VisibleBoardCardSelection[]>()

  for (const card of visibleCards) {
    const columnCards = cardsByColumn.get(card.columnIndex) ?? []
    columnCards.push(card)
    cardsByColumn.set(card.columnIndex, columnCards)
  }

  const sortedColumns = [...cardsByColumn.keys()].sort((left, right) => left - right)
  const currentColumnPosition = sortedColumns.indexOf(currentCard.columnIndex)
  if (currentColumnPosition === -1) {
    return currentCard
  }

  let targetColumnPosition = currentColumnPosition + delta
  while (targetColumnPosition >= 0 && targetColumnPosition < sortedColumns.length) {
    const targetColumnIndex = sortedColumns[targetColumnPosition]
    const targetColumnCards = cardsByColumn.get(targetColumnIndex) ?? []
    if (targetColumnCards.length > 0) {
      const clampedIndex = Math.min(currentCard.rowIndex, targetColumnCards.length - 1)
      return targetColumnCards[clampedIndex]
    }

    targetColumnPosition += delta
  }

  return currentCard
}

function cardKey(card: WorkspaceCardSelection) {
  return `${card.sourceBoardSlug}:${card.slug}`
}
