<script setup lang="ts">
import { computed } from 'vue'
import appLogoUrl from '../../../app-icon.png'

interface BoardNavOption {
  slug: string
  title: string
}

type BreadcrumbItem =
  | { kind: 'board'; board: BoardNavOption; current: boolean }
  | { kind: 'ellipsis' }

const props = defineProps<{
  boardLineage: BoardNavOption[]
  childBoards: BoardNavOption[]
}>()

const emit = defineEmits<{
  selectBoard: [slug: string]
  boardContextMenu: [event: MouseEvent, slug: string]
}>()

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  if (props.boardLineage.length <= 4) {
    return props.boardLineage.map((board, index) => ({
      kind: 'board' as const,
      board,
      current: index === props.boardLineage.length - 1,
    }))
  }

  const tail = props.boardLineage.slice(-3).map((board, index, boards) => ({
    kind: 'board' as const,
    board,
    current: index === boards.length - 1,
  }))

  return [
    { kind: 'board', board: props.boardLineage[0], current: false },
    { kind: 'ellipsis' },
    ...tail,
  ]
})

function handleContextMenu(event: MouseEvent, slug: string) {
  event.preventDefault()
  emit('boardContextMenu', event, slug)
}
</script>

<template>
  <header class="flex items-center justify-between gap-4 px-5 py-3 border-b border-border/60 bg-surface/90 backdrop-blur-xl max-[900px]:flex-col max-[900px]:items-stretch">
    <div class="flex items-center gap-3 shrink-0 min-w-0">
      <img class="w-10 h-10 object-contain shrink-0" :src="appLogoUrl" alt="KanStack logo" />
      <div class="min-w-0">
        <div class="text-lg font-bold tracking-widest leading-none">KanStack</div>
      </div>
    </div>

    <div class="min-w-0 flex items-center justify-end gap-3 overflow-hidden max-[900px]:justify-start" v-if="boardLineage.length">
      <nav class="flex flex-nowrap items-center gap-1 min-w-0 overflow-hidden max-[900px]:justify-start" aria-label="Board navigation">
        <template v-for="(item, index) in breadcrumbItems" :key="item.kind === 'board' ? item.board.slug : `ellipsis-${index}`">
          <button
            v-if="item.kind === 'board' && !item.current"
            class="max-w-40 px-2 py-1 border border-border bg-surface-1 text-text truncate text-sm leading-tight hover:border-text hover:bg-surface"
            type="button"
            @click="emit('selectBoard', item.board.slug)"
            @contextmenu="handleContextMenu($event, item.board.slug)"
          >
            {{ item.board.title }}
          </button>
          <span
            v-else-if="item.kind === 'board'"
            class="max-w-40 px-2 py-1 border border-border bg-surface text-text truncate text-sm leading-tight"
            @contextmenu="handleContextMenu($event, item.board.slug)"
          >
            {{ item.board.title }}
          </span>
          <span v-else class="text-text-muted text-xs leading-none">...</span>

          <span v-if="index < breadcrumbItems.length - 1" class="text-text-muted text-xs leading-none">/</span>
        </template>
      </nav>

      <span v-if="childBoards.length" class="text-text-muted text-xs leading-none">:</span>

      <div v-if="childBoards.length" class="flex items-center min-w-0">
        <div class="flex flex-nowrap gap-1.5 min-w-0 overflow-hidden max-[900px]:justify-start">
          <button
            v-for="board in childBoards"
            :key="board.slug"
            class="max-w-40 px-2 py-1 border border-border bg-surface-1 text-text truncate text-sm hover:border-text hover:bg-surface"
            type="button"
            @click="emit('selectBoard', board.slug)"
            @contextmenu="handleContextMenu($event, board.slug)"
          >
            {{ board.title }}
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
