<template>
  <div v-if="activeBoard" class="h-full flex flex-col">
    <!-- Board Header -->
    <div class="h-10 border-b border-border-subtle flex items-center px-4 justify-between">
      <div class="flex items-center gap-3">
        <button v-if="parentCardId" class="text-text-muted hover:text-text-primary text-sm" @click="goBack">← Back</button>
        <h2 class="text-base">{{ boardTitle }}</h2>
      </div>
    </div>

    <!-- Columns Container -->
    <div class="flex-1 overflow-x-auto overflow-y-hidden">
      <div class="flex h-full p-4 gap-4 min-w-max">
        <div
          v-for="column in sortedColumns"
          :key="column.id"
          :ref="el => drag.registerColumn(column.id, el as HTMLElement)"
          class="w-80 flex flex-col bg-bg-secondary border border-border-subtle transition-colors"
          :class="{ 'border-text-primary': drag.state.dragOverColumnId === column.id }"
        >
          <!-- Column Header -->
          <div
            class="p-3 border-b border-border-subtle flex items-center justify-between"
            :class="{ 'bg-bg-tertiary': drag.state.dragOverColumnId === column.id }"
          >
            <h3 class="text-sm font-medium">{{ column.name }}</h3>
            <span class="text-text-muted text-xs">{{ getColumnCardCount(column.id) }}</span>
          </div>

          <!-- Cards Container -->
          <div class="flex-1 overflow-y-auto p-2 space-y-2">
            <template v-for="(card, index) in getRootCards(column.id)" :key="card.id">
              <!-- Drop indicator before first card (only when dropping at the very start) -->
              <div
                v-if="index === 0 && drag.state.isDragging && drag.state.dragOverColumnId === column.id && drag.state.insertBeforeCardId === card.id && !drag.state.insertAfterCardId"
                class="h-1 bg-accent-primary rounded mb-1"
              />
              <CardTree
                :card="card"
                :depth="0"
                :parent-column-id="column.id"
                :all-cards="activeBoard.cards"
                :columns="activeBoard.columns"
                :is-dragging="drag.state.isDragging"
                :dragged-card-id="drag.state.draggedItem?.cardId || null"
                :drag-over-card-id="drag.state.dragOverCardId"
                :show-column-badge="!parentCardId"
                :register-card="(id: string, el: HTMLElement) => drag.registerCard(id, el)"
                :register-tree="(id: string, el: HTMLElement | null) => drag.registerTree(id, el)"
                @pointer-down="onCardPointerDown"
                @pointer-move="drag.handlePointerMove"
                @pointer-up="drag.handlePointerUp"
                @card-click="onCardClick"
                @card-double-click="onCardDoubleClick"
              />
              <!-- Drop indicator after card -->
              <div
                v-if="drag.state.isDragging && drag.state.dragOverColumnId === column.id && drag.state.insertAfterCardId === card.id"
                class="h-1 bg-accent-primary rounded mt-1"
              />
            </template>

            <!-- Drop indicator at end of column -->
            <div
              v-if="drag.state.isDragging && drag.state.dragOverColumnId === column.id && drag.state.insertAfterCardId && !drag.state.insertBeforeCardId && getRootCards(column.id).length > 0 && drag.state.insertAfterCardId === getRootCards(column.id)[getRootCards(column.id).length - 1].id"
              class="h-1 bg-accent-primary rounded mt-1"
            />

            <!-- Drop indicator for empty column -->
            <div
              v-if="drag.state.isDragging && drag.state.dragOverColumnId === column.id && getRootCards(column.id).length === 0"
              class="h-1 bg-accent-primary rounded mb-2"
            />

            <button
              v-if="!readonly && !parentCardId"
              class="w-full py-2 text-text-muted hover:text-text-primary text-xs border border-dashed border-border-subtle hover:border-border-visible transition-colors"
              @click="openNewCardModal(column.id)"
            >
              + Add Card
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Card Detail Modal -->
    <CardModal
      v-if="selectedCard"
      :card="selectedCard"
      :board="activeBoard"
      @close="selectedCard = null"
      @save="saveCard"
      @archive="archiveCard"
    />

    <!-- New Card Modal -->
    <NewCardModal
      :visible="showNewCardModal"
      @close="showNewCardModal = false"
      @create="confirmCreateCard"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useDragDrop, type DragItem, type DropTarget } from '@/composables/useDragDrop'
import { getOrderBetween } from '@/stores/composables/useOrderUtils'
import CardModal from './CardModal.vue'
import CardTree from './CardTree'
import NewCardModal from './NewCardModal.vue'
import type { Card } from '@/types'

const props = defineProps<{
  readonly?: boolean
  parentCardId?: string
}>()

const router = useRouter()
const projectStore = useProjectStore()

const activeBoard = computed(() => projectStore.currentBoard)

const boardTitle = computed(() => {
  if (!activeBoard.value) return ''
  if (!props.parentCardId) return activeBoard.value.name
  const parent = activeBoard.value.cards.find(c => c.id === props.parentCardId)
  return parent ? `Sub-tasks: ${parent.title}` : 'Sub-tasks'
})

const drag = useDragDrop(async (item: DragItem, target: DropTarget) => {
  if (!activeBoard.value) return

  if (target.cardId) {
    await projectStore.setCardParent(item.cardId, target.cardId)
    const parent = activeBoard.value.cards.find(c => c.id === target.cardId)
    if (parent && parent.column_id !== item.sourceColumnId) {
      await projectStore.moveCard(item.cardId, parent.column_id)
    }
    return
  }

  if (!props.parentCardId) {
    const card = activeBoard.value.cards.find(c => c.id === item.cardId)
    if (card?.parent_id) await projectStore.setCardParent(item.cardId, null)
  }

  // Handle reordering at specific position (same or different column)
  if (target.beforeCardId || target.afterCardId) {
    const beforeCard = target.beforeCardId ? activeBoard.value.cards.find(c => c.id === target.beforeCardId) : null
    const afterCard = target.afterCardId ? activeBoard.value.cards.find(c => c.id === target.afterCardId) : null

    const beforeOrder = beforeCard?.order || null
    const afterOrder = afterCard?.order || null

    const newOrder = getOrderBetween(beforeOrder, afterOrder)
    await projectStore.moveCard(item.cardId, target.columnId, newOrder)
    return
  }

  // Move to column without specific position (goes to end)
  if (item.sourceColumnId !== target.columnId) {
    await projectStore.moveCard(item.cardId, target.columnId)
  }
})

const sortedColumns = computed(() =>
  [...(activeBoard.value?.columns ?? [])].sort((a, b) => a.order.localeCompare(b.order))
)

const selectedCard = ref<Card | null>(null)
const showNewCardModal = ref(false)
const newCardColumnId = ref('')

function getFilteredCards(): Card[] {
  if (!activeBoard.value) return []
  const cards = activeBoard.value.cards

  if (props.parentCardId) {
    return cards.filter(c => c.parent_id === props.parentCardId && !c.archived)
  }
  return cards.filter(c => {
    if (c.archived) return false
    if (!c.parent_id) return true
    return !cards.find(p => p.id === c.parent_id)
  })
}

const getRootCards = (columnId: string) =>
  getFilteredCards()
    .filter(c => c.column_id === columnId)
    .sort((a, b) => a.order.localeCompare(b.order))

function getColumnCardCount(columnId: string): number {
  if (!activeBoard.value) return 0
  if (props.parentCardId) {
    return activeBoard.value.cards.filter(
      c => c.column_id === columnId && c.parent_id === props.parentCardId && !c.archived
    ).length
  }
  return getRootCards(columnId).length
}

function onCardPointerDown(card: Card, event: PointerEvent) {
  drag.handlePointerDown({
    cardId: card.id,
    sourceColumnId: card.column_id,
    sourceParentId: card.parent_id
  }, event)
}

function onCardClick(card: Card) {
  if (drag.wasDragging()) return
  selectedCard.value = card
}

function onCardDoubleClick(card: Card) {
  if (!activeBoard.value) return
  const children = activeBoard.value.cards.filter(c => c.parent_id === card.id && !c.archived)
  if (children.length > 0) {
    router.push({ name: 'parent-board', params: { parentCardId: card.id } })
  } else {
    selectedCard.value = card
  }
}

function goBack() {
  router.push({ name: 'home' })
}

function openNewCardModal(columnId: string) {
  newCardColumnId.value = columnId
  showNewCardModal.value = true
}

async function confirmCreateCard(title: string) {
  if (!newCardColumnId.value) return
  await projectStore.createCard(newCardColumnId.value, title, props.parentCardId)
  showNewCardModal.value = false
  newCardColumnId.value = ''
}

async function saveCard(card: Card) {
  await projectStore.updateCard(card.id, card)
  selectedCard.value = null
}

async function archiveCard(cardId: string) {
  await projectStore.archiveCard(cardId)
  selectedCard.value = null
}

defineExpose({ createCardInFirstColumn: () => {
  if (!activeBoard.value || sortedColumns.value.length === 0) return
  openNewCardModal(sortedColumns.value[0].id)
}})
</script>
