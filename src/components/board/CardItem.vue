<template>
  <div
    :class="['border border-border-subtle p-3 cursor-grab hover:border-border-visible transition-colors select-none relative', getDepthClasses(), { 'opacity-50': isDragging && draggedCardId === card.id }]"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @click="onClick"
  >
    <div class="flex items-start justify-between mb-2">
      <h4 class="text-sm font-medium flex-1">{{ card.title }}</h4>
      <div class="flex items-center gap-2">
        <!-- Column badge (show for all sub-tasks with depth > 0) -->
        <span v-if="showColumnBadge && depth > 0" class="text-xs text-text-muted px-1 border border-border-subtle">{{ getColumnName(card.column_id) }}</span>
        <!-- Sub-task count for parents -->
        <span v-if="childCount > 0" class="text-xs text-text-muted">{{ childCount }} sub</span>
        <div v-if="card.priority > 0" class="text-xs text-text-muted">{{ '!'.repeat(card.priority) }}</div>
      </div>
    </div>

    <!-- Card Meta -->
    <div class="flex items-center gap-2 text-xs text-text-muted">
      <span v-if="card.due_date" :class="{ 'text-text-primary': isOverdue(card.due_date) }">{{ formatDate(card.due_date) }}</span>
      <span v-if="card.checklist.length">[{{ card.checklist.filter((i) => i.checked).length }}/{{ card.checklist.length }}]</span>
      <span v-if="card.tags.length" class="flex gap-1">
        <span v-for="tag in card.tags.slice(0, 2)" :key="tag" class="px-1 border border-border-subtle">{{ tag }}</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Card } from '@/types'

const props = defineProps<{
  card: Card
  depth: number
  isDragging: boolean
  draggedCardId: string | null
  childCount: number
  parentColumnId?: string
  columns: { id: string; name: string }[]
  showColumnBadge?: boolean
}>()

const emit = defineEmits<{
  pointerDown: [card: Card, event: PointerEvent]
  pointerMove: [event: PointerEvent]
  pointerUp: [event: PointerEvent]
  click: [card: Card]
  doubleClick: [card: Card]
}>()

let lastClickTime = 0
const DOUBLE_CLICK_DELAY = 300

const getDepthClasses = (): string => {
  if (props.depth === 0) return 'bg-bg-tertiary'
  if (props.depth === 1) return 'bg-[#222222]'
  return 'bg-[#252525]'
}

const getColumnName = (columnId: string): string =>
  props.columns.find(c => c.id === columnId)?.name ?? 'Unknown'

const isOverdue = (dueDate: string): boolean => new Date(dueDate) < new Date()

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })

const onPointerDown = (event: PointerEvent) => emit('pointerDown', props.card, event)
const onPointerMove = (event: PointerEvent) => emit('pointerMove', event)
const onPointerUp = (event: PointerEvent) => emit('pointerUp', event)

let clickTimer: ReturnType<typeof setTimeout> | null = null

function onClick() {
  const now = Date.now()
  if (now - lastClickTime < DOUBLE_CLICK_DELAY) {
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null }
    lastClickTime = now
    emit('doubleClick', props.card)
  } else {
    lastClickTime = now
    clickTimer = setTimeout(() => {
      clickTimer = null
      if (Date.now() - lastClickTime >= DOUBLE_CLICK_DELAY) {
        emit('click', props.card)
      }
    }, DOUBLE_CLICK_DELAY)
  }
}
</script>
