<script setup lang="ts">
import { computed } from 'vue'
import appLogoUrl from '../../../src-tauri/icons/128x128.png'

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
</script>

<template>
  <header class="app-header">
    <div class="app-header__brand">
      <img class="app-header__logo" :src="appLogoUrl" alt="KanStack logo" />
      <div class="app-header__brand-copy">
        <div class="app-header__title">KanStack</div>
      </div>
    </div>

    <div class="app-header__nav" v-if="boardLineage.length">
      <nav class="app-header__breadcrumb" aria-label="Board navigation">
        <template v-for="(item, index) in breadcrumbItems" :key="item.kind === 'board' ? item.board.slug : `ellipsis-${index}`">
          <button
            v-if="item.kind === 'board' && !item.current"
            class="app-header__crumb"
            type="button"
            @click="emit('selectBoard', item.board.slug)"
          >
            {{ item.board.title }}
          </button>
          <span v-else-if="item.kind === 'board'" class="app-header__crumb app-header__crumb--current">
            {{ item.board.title }}
          </span>
          <span v-else class="app-header__ellipsis">...</span>

          <span v-if="index < breadcrumbItems.length - 1" class="app-header__separator">/</span>
        </template>
      </nav>

      <span v-if="childBoards.length" class="app-header__separator">:</span>

      <div v-if="childBoards.length" class="app-header__subboards">
        <div class="app-header__subboards-list">
          <button
            v-for="board in childBoards"
            :key="board.slug"
            class="app-header__subboard-chip"
            type="button"
            @click="emit('selectBoard', board.slug)"
          >
            {{ board.title }}
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.8rem 1.1rem;
  border-bottom: 1px solid var(--shade-3);
  background: rgba(20, 20, 20, 0.9);
  backdrop-filter: blur(14px);
}

.app-header__brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
  min-width: 0;
}

.app-header__brand-copy {
  min-width: 0;
}

.app-header__logo {
  width: 2.35rem;
  height: 2.35rem;
  object-fit: contain;
  flex-shrink: 0;
}

.app-header__title {
  font-size: 0.98rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  line-height: 1;
  text-transform: uppercase;
}

.app-header__nav {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  overflow: hidden;
}

.app-header__breadcrumb {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.28rem;
  min-width: 0;
  overflow: hidden;
}

.app-header__crumb,
.app-header__subboard-chip {
  border: 1px solid var(--shade-3);
  background: var(--shade-1);
  color: var(--shade-5);
  font: inherit;
}

.app-header__crumb {
  display: block;
  max-width: 10rem;
  padding: 0.3rem 0.55rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.82rem;
  line-height: 1.15;
}

.app-header__crumb--current {
  border-color: var(--shade-5);
  background: var(--shade-2);
}

.app-header__separator,
.app-header__ellipsis {
  color: var(--shade-4);
  font-size: 0.72rem;
  line-height: 1;
}

.app-header__subboards {
  display: flex;
  align-items: center;
  min-width: 0;
}

.app-header__subboards-list {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.35rem;
  min-width: 0;
  overflow: hidden;
}

.app-header__subboard-chip {
  max-width: 10rem;
  padding: 0.34rem 0.58rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.78rem;
}

.app-header__crumb:hover,
.app-header__subboard-chip:hover {
  border-color: var(--shade-5);
  background: var(--shade-2);
}

.app-header__subboard-chip:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .app-header {
    flex-direction: column;
    align-items: stretch;
  }

  .app-header__nav {
    justify-content: flex-start;
  }

  .app-header__breadcrumb,
  .app-header__subboards-list {
    justify-content: flex-start;
  }
}
</style>
