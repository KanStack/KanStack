<template>
  <div class="h-full flex flex-col">
    <!-- Loading -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center text-text-muted text-sm">
      Loading cards...
    </div>

    <!-- Error -->
    <div v-else-if="errorMessage" class="flex-1 flex items-center justify-center text-red-400 text-sm">
      <div class="text-center">
        <p class="mb-2">{{ errorMessage }}</p>
        <button class="terminal-btn text-xs" @click="refreshData">Retry</button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!summaryBoard || summaryBoard.cards.length === 0" class="flex-1 flex items-center justify-center text-text-muted">
      <div class="text-center">
        <p class="mb-2">No cards found</p>
        <p class="text-xs">Create a project and add cards to see them here</p>
      </div>
    </div>

    <!-- Board View — same component used everywhere -->
    <BoardView
      v-else
      :board="summaryBoard"
      :readonly="true"
      @move-card="handleMoveCard"
      @save-card="handleSaveCard"
      @archive-card="handleArchiveCard"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useConfigStore } from '@/stores/config'
import * as tauri from '@/services/tauri'
import BoardView from './BoardView.vue'
import type { Board, Card, Column } from '@/types'

const props = defineProps<{
  isActive?: boolean
}>()

const configStore = useConfigStore()

const isLoading = ref(false)
const errorMessage = ref('')

// Raw data loaded from all projects
const loadedBoards = ref<Array<{ board: Board; projectPath: string }>>([])

/**
 * Build a unified Board object from all loaded boards.
 * Columns are deduped by name (case-insensitive) — the first occurrence wins.
 * Every card keeps its real column_id so drag-and-drop just works.
 */
const summaryBoard = computed<Board | null>(() => {
  if (loadedBoards.value.length === 0) return null

  // Dedupe columns by lowercase name, preserving the first occurrence
  const seenNames = new Map<string, Column>()
  for (const { board } of loadedBoards.value) {
    for (const col of board.columns) {
      const key = col.name.toLowerCase()
      if (!seenNames.has(key)) {
        seenNames.set(key, { ...col })
      }
    }
  }

  const columns = Array.from(seenNames.values())

  // Collect all cards from all boards
  const cards: Card[] = []
  for (const { board } of loadedBoards.value) {
    for (const card of board.cards) {
      cards.push({ ...card })
    }
  }

  return {
    id: '__summary__',
    version: '1.0',
    schema_version: 1,
    name: 'Summary',
    project_id: '__summary__',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    columns,
    cards,
  }
})

/**
 * Find which loaded board a card belongs to, so we can write back to the correct file.
 */
function findSourceBoard(cardId: string): { board: Board; projectPath: string } | null {
  for (const entry of loadedBoards.value) {
    if (entry.board.cards.some(c => c.id === cardId)) {
      return entry
    }
  }
  return null
}

async function saveBoardToDisk(board: Board, projectPath: string) {
  const boardPath = `${projectPath}/boards/${board.id}.json`
  console.log('[SummaryView] saving board to:', boardPath)
  await tauri.writeFile(boardPath, JSON.stringify(board, null, 2))
}

// --- Event handlers from BoardView ---

async function handleMoveCard(_boardId: string, cardId: string, targetColumnId: string) {
  const source = findSourceBoard(cardId)
  if (!source) {
    console.error('[SummaryView] handleMoveCard — source board not found for card:', cardId)
    return
  }

  const card = source.board.cards.find(c => c.id === cardId)
  if (!card) return

  console.log('[SummaryView] moving card', cardId, 'from', card.column_id, 'to', targetColumnId)
  card.column_id = targetColumnId
  card.updated_at = new Date().toISOString()
  source.board.updated_at = new Date().toISOString()

  await saveBoardToDisk(source.board, source.projectPath)
  await refreshData()
}

async function handleSaveCard(_boardId: string, updatedCard: Card) {
  const source = findSourceBoard(updatedCard.id)
  if (!source) return

  const idx = source.board.cards.findIndex(c => c.id === updatedCard.id)
  if (idx === -1) return

  source.board.cards[idx] = { ...updatedCard, updated_at: new Date().toISOString() }
  source.board.updated_at = new Date().toISOString()

  await saveBoardToDisk(source.board, source.projectPath)
  await refreshData()
}

async function handleArchiveCard(_boardId: string, cardId: string) {
  const source = findSourceBoard(cardId)
  if (!source) return

  const card = source.board.cards.find(c => c.id === cardId)
  if (!card) return

  card.archived = true
  card.archived_at = new Date().toISOString()
  card.status = 'archived'
  card.updated_at = new Date().toISOString()
  source.board.updated_at = new Date().toISOString()

  await saveBoardToDisk(source.board, source.projectPath)
  await refreshData()
}

// --- Data loading ---

async function refreshData() {
  isLoading.value = true
  errorMessage.value = ''
  const results: Array<{ board: Board; projectPath: string }> = []

  try {
    for (const project of configStore.projects) {
      const isAvailable = await tauri.pathExists(project.path).catch(() => false)
      if (!isAvailable) continue

      const boardsPath = `${project.path}/boards`
      const entries = await tauri.listDirectory(boardsPath).catch(() => [])

      for (const entry of entries) {
        if (!entry.isDirectory && entry.name.endsWith('.json')) {
          try {
            const content = await tauri.readFile(`${boardsPath}/${entry.name}`)
            const board: Board = JSON.parse(content)
            results.push({ board, projectPath: project.path })
          } catch (err) {
            console.error('[SummaryView] failed to load board:', entry.name, err)
          }
        }
      }
    }

    loadedBoards.value = results
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to load cards'
    console.error('[SummaryView] refreshData failed:', err)
  } finally {
    isLoading.value = false
  }
}

// Refresh when view becomes active
watch(() => props.isActive, async (newVal) => {
  if (newVal !== false) {
    await refreshData()
  }
}, { immediate: true })

// Refresh when projects change
watch(() => configStore.projects, async () => {
  await refreshData()
}, { deep: true })
</script>
