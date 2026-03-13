<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { KanbanCardDocument } from '@docs/schemas/kanban-parser-schema'
import AppSelect from '@/components/app/AppSelect.vue'
import type { BoardViewPreferences } from '@/types/appConfig'
import { collectBoardViewFilterOptions } from '@/utils/boardViewPreferences'

type FilterKind = 'none' | 'assignee' | 'tag' | 'priority' | 'type' | 'due'

const props = defineProps<{
  cardsBySlug: Record<string, KanbanCardDocument>
  preferences: BoardViewPreferences
}>()

const emit = defineEmits<{
  updatePreferences: [preferences: BoardViewPreferences]
}>()

const filterOptions = computed(() => collectBoardViewFilterOptions(props.cardsBySlug))
const selectedFilterKind = ref<FilterKind>(detectFilterKind(props.preferences))

const sortOptions = [
  { label: 'Sort: Manual', value: 'manual' },
  { label: 'Sort: Title', value: 'title' },
  { label: 'Sort: Due', value: 'due' },
  { label: 'Sort: Priority', value: 'priority' },
]

const filterKindOptions = [
  { label: 'Filter: None', value: 'none' },
  { label: 'Filter: Assignee', value: 'assignee' },
  { label: 'Filter: Tag', value: 'tag' },
  { label: 'Filter: Priority', value: 'priority' },
  { label: 'Filter: Type', value: 'type' },
  { label: 'Filter: Due', value: 'due' },
]

const activeValueOptions = computed(() => {
  if (selectedFilterKind.value === 'assignee') {
    return [
      { label: 'Any assignee', value: '' },
      ...filterOptions.value.assignees.map((assignee) => ({ label: assignee, value: assignee })),
    ]
  }

  if (selectedFilterKind.value === 'tag') {
    return [
      { label: 'Any tag', value: '' },
      ...filterOptions.value.tags.map((tag) => ({ label: tag, value: tag })),
    ]
  }

  if (selectedFilterKind.value === 'priority') {
    return [
      { label: 'Any priority', value: '' },
      ...filterOptions.value.priorities.map((priority) => ({ label: priority, value: priority })),
    ]
  }

  if (selectedFilterKind.value === 'type') {
    return [
      { label: 'Any type', value: '' },
      ...filterOptions.value.types.map((typeOption) => ({ label: typeOption, value: typeOption })),
    ]
  }

  if (selectedFilterKind.value === 'due') {
    return [
      { label: 'Any due', value: 'any' },
      { label: 'Overdue', value: 'overdue' },
      { label: 'Due soon', value: 'dueSoon' },
      { label: 'Has due', value: 'hasDue' },
      { label: 'No due', value: 'noDue' },
    ]
  }

  return []
})

const activeValue = computed(() => {
  if (selectedFilterKind.value === 'assignee') {
    return props.preferences.filters.assignee ?? ''
  }
  if (selectedFilterKind.value === 'tag') {
    return props.preferences.filters.tags[0] ?? ''
  }
  if (selectedFilterKind.value === 'priority') {
    return props.preferences.filters.priority ?? ''
  }
  if (selectedFilterKind.value === 'type') {
    return props.preferences.filters.type ?? ''
  }
  if (selectedFilterKind.value === 'due') {
    return props.preferences.filters.dueStatus
  }

  return ''
})

watch(
  () => props.preferences.filters,
  (filters) => {
    const detected = detectFilterKind({ ...props.preferences, filters })
    if (detected !== 'none') {
      selectedFilterKind.value = detected
    }
  },
  { deep: true },
)

function emitPreferences(preferences: BoardViewPreferences) {
  emit('updatePreferences', preferences)
}

function updateSort(value: string) {
  emitPreferences({
    ...props.preferences,
    sort: value as BoardViewPreferences['sort'],
  })
}

function updateText(event: Event) {
  emitPreferences({
    ...props.preferences,
    filters: {
      ...props.preferences.filters,
      text: (event.target as HTMLInputElement).value,
    },
  })
}

function updateFilterKind(value: string) {
  const filterKind = value as FilterKind
  selectedFilterKind.value = filterKind

  emitPreferences({
    ...props.preferences,
    filters: clearedFilters(props.preferences),
  })
}

function updateFilterValue(value: string) {
  const filters = clearedFilters(props.preferences)

  if (selectedFilterKind.value === 'assignee') {
    filters.assignee = value || null
  } else if (selectedFilterKind.value === 'tag') {
    filters.tags = value ? [value] : []
  } else if (selectedFilterKind.value === 'priority') {
    filters.priority = value || null
  } else if (selectedFilterKind.value === 'type') {
    filters.type = value || null
  } else if (selectedFilterKind.value === 'due') {
    filters.dueStatus = value as BoardViewPreferences['filters']['dueStatus']
  }

  emitPreferences({
    ...props.preferences,
    filters,
  })
}

function clearedFilters(preferences: BoardViewPreferences): BoardViewPreferences['filters'] {
  return {
    ...preferences.filters,
    assignee: null,
    tags: [],
    priority: null,
    type: null,
    dueStatus: 'any',
  }
}

function detectFilterKind(preferences: BoardViewPreferences): FilterKind {
  if (preferences.filters.assignee) {
    return 'assignee'
  }
  if (preferences.filters.tags.length > 0) {
    return 'tag'
  }
  if (preferences.filters.priority) {
    return 'priority'
  }
  if (preferences.filters.type) {
    return 'type'
  }
  if (preferences.filters.dueStatus !== 'any') {
    return 'due'
  }

  return 'none'
}
</script>

<template>
  <div class="board-view-controls">
    <input
      class="board-view-controls__search"
      aria-label="Search cards"
      type="search"
      placeholder="search"
      :value="preferences.filters.text"
      @input="updateText"
    />

    <AppSelect
      ariaLabel="Sort cards"
      :model-value="preferences.sort"
      :options="sortOptions"
      @update:model-value="updateSort"
    />

    <AppSelect
      ariaLabel="Choose filter type"
      :model-value="selectedFilterKind"
      :options="filterKindOptions"
      @update:model-value="updateFilterKind"
    />

    <AppSelect
      v-if="selectedFilterKind !== 'none'"
      :ariaLabel="`Filter value for ${selectedFilterKind}`"
      :model-value="activeValue"
      :options="activeValueOptions"
      @update:model-value="updateFilterValue"
    />
  </div>
</template>

<style scoped>
.board-view-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.45rem;
}

.board-view-controls__search {
  min-width: 10rem;
  min-height: 2.1rem;
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--shade-3);
  background: var(--shade-2);
  color: var(--shade-5);
  font: inherit;
  font-size: 0.72rem;
}

.board-view-controls__search:hover,
.board-view-controls__search:focus {
  border-color: var(--shade-5);
  background: var(--shade-3);
  outline: none;
}

</style>
