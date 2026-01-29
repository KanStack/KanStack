<template>
  <div class="h-full flex flex-col">
    <!-- Summary Header -->
    <div class="h-10 border-b border-border-subtle flex items-center px-4 justify-between">
      <div class="flex items-center gap-4">
        <h2 class="text-base">Summary</h2>
        <span class="text-text-muted text-xs">{{ totalCards }} cards across {{ projectsCount }} projects</span>
      </div>
      <div class="flex items-center gap-2">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search cards..."
          class="terminal-input text-xs w-48"
        />
        <button 
          v-if="searchQuery"
          class="terminal-btn text-xs"
          @click="clearSearch"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="h-8 border-b border-border-subtle flex items-center px-4 gap-4">
      <span class="text-xs text-text-secondary">Filters:</span>
      <label class="flex items-center gap-1 text-xs cursor-pointer">
        <input 
          v-model="excludeArchived" 
          type="checkbox"
          class="accent-white"
        />
        <span>Hide archived</span>
      </label>
      <div class="flex items-center gap-1">
        <span class="text-xs text-text-secondary">Tags:</span>
        <button
          v-for="tag in availableTags"
          :key="tag"
          class="px-2 py-0.5 text-xs border"
          :class="getTagClass(tag)"
          @click="toggleTag(tag)"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center text-text-muted text-sm">
      Loading cards...
    </div>

    <!-- Columns Container -->
    <div v-else class="flex-1 overflow-x-auto overflow-y-hidden">
      <div class="flex h-full p-4 gap-4 min-w-max">
        <div
          v-for="column in columns"
          :key="column.id"
          class="w-80 flex flex-col bg-bg-secondary border border-border-subtle"
        >
          <!-- Column Header -->
          <div class="p-3 border-b border-border-subtle flex items-center justify-between">
            <h3 class="text-sm font-medium">{{ column.name }}</h3>
            <span class="text-text-muted text-xs">{{ getColumnCards(column.id).length }}</span>
          </div>

          <!-- Cards Container -->
          <div class="flex-1 overflow-y-auto p-2 space-y-2">
            <div
              v-for="cardWithSource in getColumnCards(column.id)"
              :key="cardWithSource.card.id"
              class="bg-bg-tertiary border border-border-subtle p-3 cursor-pointer hover:border-border-visible transition-colors"
              @click="openCard(cardWithSource)"
            >
              <!-- Project Badge -->
              <div class="flex items-center justify-between mb-2">
                <span 
                  class="text-xs px-1 border border-border-subtle text-text-muted"
                  :class="{ 'opacity-50': !cardWithSource.source.is_available }"
                >
                  {{ getProjectName(cardWithSource.source.project_id) }}
                </span>
                <div v-if="cardWithSource.card.priority > 0" class="text-xs text-text-muted">
                  {{ '!'.repeat(cardWithSource.card.priority) }}
                </div>
              </div>
              
              <h4 class="text-sm font-medium mb-2">{{ cardWithSource.card.title }}</h4>
              
              <!-- Card Meta -->
              <div class="flex items-center gap-2 text-xs text-text-muted">
                <span v-if="cardWithSource.card.due_date" :class="{ 'text-text-primary': isOverdue(cardWithSource.card.due_date) }">
                  {{ formatDate(cardWithSource.card.due_date) }}
                </span>
                <span v-if="cardWithSource.card.checklist.length > 0">
                  [{{ cardWithSource.card.checklist.filter(i => i.checked).length }}/{{ cardWithSource.card.checklist.length }}]
                </span>
                <span v-if="cardWithSource.card.tags.length > 0" class="flex gap-1">
                  <span v-for="tag in cardWithSource.card.tags.slice(0, 2)" :key="tag" class="px-1 border border-border-subtle">
                    {{ tag }}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Card Detail Modal -->
    <SummaryCardModal
      v-if="selectedCard"
      :card-with-source="selectedCard"
      @close="selectedCard = null"
      @refresh="refreshData"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useConfigStore } from '@/stores/config'
import * as tauri from '@/services/tauri'
import SummaryCardModal from './SummaryCardModal.vue'
import type { CardWithContext, Card, Board } from '@/types'

const configStore = useConfigStore()

const allCards = ref<CardWithContext[]>([])
const columnIdToName = ref<Record<string, string>>({})
const searchQuery = ref('')
const excludeArchived = ref(true)
const selectedTags = ref<string[]>([])
const selectedCard = ref<CardWithContext | null>(null)
const isLoading = ref(false)

const columns = [
  { id: 'backlog', name: 'Backlog' },
  { id: 'todo', name: 'To Do' },
  { id: 'in-progress', name: 'In Progress' },
  { id: 'done', name: 'Done' },
  { id: 'other', name: 'Other' }
]

const filteredCards = computed(() => {
  let cards = allCards.value

  // Filter archived
  if (excludeArchived.value) {
    cards = cards.filter(c => !c.card.archived)
  }

  // Filter by tags
  if (selectedTags.value.length > 0) {
    cards = cards.filter(c => 
      c.card.tags.some(tag => selectedTags.value.includes(tag))
    )
  }

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    cards = cards.filter(c => 
      c.card.title.toLowerCase().includes(query) ||
      c.card.content.toLowerCase().includes(query) ||
      c.card.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }

  return cards
})

const totalCards = computed(() => filteredCards.value.length)
const projectsCount = computed(() => configStore.projects.length)

const availableTags = computed(() => {
  const tags = new Set<string>()
  for (const cardWithSource of allCards.value) {
    for (const tag of cardWithSource.card.tags) {
      tags.add(tag)
    }
  }
  return Array.from(tags).sort()
})

const knownColumnMapping: Record<string, string[]> = {
  'backlog': ['backlog'],
  'todo': ['todo', 'to do'],
  'in-progress': ['in-progress', 'inprogress', 'in progress'],
  'done': ['done']
}

function matchesKnownColumn(resolvedName: string): boolean {
  const lower = resolvedName.toLowerCase()
  return Object.values(knownColumnMapping).some(names =>
    names.some(name => lower.includes(name) || name.includes(lower))
  )
}

function getColumnCards(columnId: string): CardWithContext[] {
  if (columnId === 'other') {
    return filteredCards.value.filter(c => {
      const resolvedName = columnIdToName.value[c.card.column_id] || c.card.column_id
      return !matchesKnownColumn(resolvedName)
    })
  }

  const validNames = knownColumnMapping[columnId] || [columnId]
  
  return filteredCards.value.filter(c => {
    const resolvedName = columnIdToName.value[c.card.column_id] || c.card.column_id
    return validNames.some(name => 
      resolvedName.toLowerCase().includes(name) ||
      name.includes(resolvedName.toLowerCase())
    )
  })
}

function getProjectName(projectId: string): string {
  const project = configStore.projects.find(p => p.id === projectId)
  return project?.name || 'Unknown'
}

function openCard(cardWithSource: CardWithContext) {
  selectedCard.value = cardWithSource
}

function toggleTag(tag: string) {
  const index = selectedTags.value.indexOf(tag)
  if (index === -1) {
    selectedTags.value.push(tag)
  } else {
    selectedTags.value.splice(index, 1)
  }
}

function getTagClass(tag: string): string {
  return selectedTags.value.includes(tag) 
    ? 'border-text-primary bg-bg-tertiary' 
    : 'border-border-subtle text-text-muted'
}

function clearSearch() {
  searchQuery.value = ''
}

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date()
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
}

async function refreshData() {
  console.log('Starting refreshData...')
  isLoading.value = true
  allCards.value = []
  columnIdToName.value = {}

  try {
    console.log('Number of projects:', configStore.projects.length)
    
    for (const project of configStore.projects) {
      console.log('Processing project:', project.name, 'at', project.path)
      
      // Check if project is available
      const isAvailable = await tauri.pathExists(project.path).catch(() => false)
      console.log('Project available:', isAvailable)
      
      // Load all boards in this project
      const boardsPath = `${project.path}/boards`
      console.log('Listing boards at:', boardsPath)
      const entries = await tauri.listDirectory(boardsPath).catch((err) => {
        console.error('Failed to list boards:', err)
        return []
      })
      console.log('Found board files:', entries.length)
      
      for (const entry of entries) {
        if (!entry.isDirectory && entry.name.endsWith('.json')) {
          try {
            const boardPath = `${boardsPath}/${entry.name}`
            const content = await tauri.readFile(boardPath)
            const board: Board = JSON.parse(content)
            
            // Map column IDs to names
            for (const col of board.columns) {
              columnIdToName.value[col.id] = col.name
            }
            
            // Add cards with source info
            console.log('Board has', board.cards.length, 'cards')
            for (const card of board.cards) {
              allCards.value.push({
                card,
                source: {
                  project_id: project.id,
                  board_id: board.id,
                  project_path: project.path,
                  is_available: isAvailable
                }
              })
            }
          } catch (err) {
            console.error('Failed to load board:', err)
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to refresh summary:', err)
  } finally {
    isLoading.value = false
    console.log('Finished loading. Total cards:', allCards.value.length)
  }
}

// Reload data when component becomes visible
import { watch } from 'vue'
const props = defineProps<{
  isActive?: boolean
}>()

// Always refresh when mounted or when visibility changes
watch(() => props.isActive, async (newVal) => {
  if (newVal !== false) {
    console.log('Summary view activated, refreshing data...')
    await refreshData()
    console.log('Summary view loaded', allCards.value.length, 'cards')
  }
}, { immediate: true })
</script>
