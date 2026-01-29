<template>
  <div 
    v-if="cardWithSource"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="$emit('close')"
  >
    <div class="bg-bg-secondary border border-border-subtle w-[800px] max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="p-4 border-b border-border-subtle flex items-center justify-between">
        <div class="flex items-center gap-3">
          <input
            v-model="editedCard.title"
            type="text"
            class="terminal-input flex-1 text-lg font-medium"
            placeholder="Card title..."
          />
          <span 
            class="text-xs px-2 py-1 border"
            :class="cardWithSource.source.is_available ? 'border-border-subtle text-text-muted' : 'border-border-subtle text-text-muted opacity-50'"
          >
            {{ getProjectName(cardWithSource.source.project_id) }}
          </span>
        </div>
        <button class="ml-4 text-text-muted hover:text-text-primary" @click="$emit('close')">✕</button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4">
        <div class="grid grid-cols-3 gap-4">
          <!-- Main Content -->
          <div class="col-span-2 space-y-4">
            <!-- Description -->
            <div>
              <label class="text-xs uppercase tracking-wider text-text-secondary mb-2 block">Description</label>
              <textarea
                v-model="editedCard.content"
                rows="10"
                class="terminal-input w-full resize-none"
                placeholder="Add a description (supports Markdown)..."
              />
            </div>

            <!-- Checklist -->
            <div>
              <label class="text-xs uppercase tracking-wider text-text-secondary mb-2 block">Checklist</label>
              <div class="space-y-1">
                <div
                  v-for="item in editedCard.checklist"
                  :key="item.id"
                  class="flex items-center gap-2"
                >
                  <input
                    type="checkbox"
                    :checked="item.checked"
                    @change="toggleChecklistItem(item.id)"
                    class="w-4 h-4 accent-white"
                  />
                  <input
                    v-model="item.text"
                    type="text"
                    class="terminal-input flex-1 text-sm"
                    placeholder="Item..."
                  />
                  <button class="text-text-muted hover:text-text-primary" @click="removeChecklistItem(item.id)">✕</button>
                </div>
                <button
                  class="text-text-muted hover:text-text-primary text-sm py-1"
                  @click="addChecklistItem"
                >
                  + Add item
                </button>
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="space-y-4">
            <!-- Project Info -->
            <div class="p-3 bg-bg-tertiary border border-border-subtle">
              <label class="text-xs uppercase tracking-wider text-text-secondary mb-2 block">Source</label>
              <div class="text-sm">{{ getProjectName(cardWithSource.source.project_id) }}</div>
              <div class="text-xs text-text-muted">{{ cardWithSource.source.is_available ? 'Available' : 'Offline' }}</div>
            </div>

            <!-- Tags -->
            <div>
              <label class="text-xs uppercase tracking-wider text-text-secondary mb-2 block">Tags</label>
              <div class="flex flex-wrap gap-1 mb-2">
                <span
                  v-for="tag in editedCard.tags"
                  :key="tag"
                  class="px-2 py-1 border border-border-subtle text-xs flex items-center gap-1"
                >
                  {{ tag }}
                  <button class="hover:text-text-primary" @click="removeTag(tag)">✕</button>
                </span>
              </div>
              <input
                v-model="newTag"
                type="text"
                class="terminal-input w-full text-sm"
                placeholder="Add tag..."
                @keyup.enter="addTag"
              />
            </div>

            <!-- Due Date -->
            <div>
              <label class="text-xs uppercase tracking-wider text-text-secondary mb-2 block">Due Date</label>
              <input
                v-model="editedCard.due_date"
                type="date"
                class="terminal-input w-full"
              />
            </div>

            <!-- Priority -->
            <div>
              <label class="text-xs uppercase tracking-wider text-text-secondary mb-2 block">Priority</label>
              <div class="flex items-center gap-2">
                <button
                  v-for="n in 3"
                  :key="n"
                  class="px-2 py-1 border border-border-subtle text-sm"
                  :class="{ 'bg-bg-tertiary': editedCard.priority >= n }"
                  @click="editedCard.priority = n"
                >
                  {{ '!'.repeat(n) }}
                </button>
                <button
                  class="px-2 py-1 border border-border-subtle text-sm text-text-muted"
                  @click="editedCard.priority = 0"
                >
                  None
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-border-subtle flex justify-between">
        <button class="terminal-btn text-text-muted" @click="archive">
          Archive
        </button>
        <div class="flex items-center gap-2">
          <span v-if="saveError" class="text-red-400 text-xs">{{ saveError }}</span>
          <button class="terminal-btn" @click="$emit('close')">Cancel</button>
          <button class="terminal-btn" @click="save" :disabled="!cardWithSource.source.is_available">
            {{ cardWithSource.source.is_available ? 'Save' : 'Unavailable' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConfigStore } from '@/stores/config'
import * as tauri from '@/services/tauri'
import type { CardWithContext, Card } from '@/types'

const props = defineProps<{
  cardWithSource: CardWithContext
}>()

const emit = defineEmits<{
  close: []
  refresh: []
}>()

const configStore = useConfigStore()

const editedCard = ref<Card>(JSON.parse(JSON.stringify(props.cardWithSource.card)))
const newTag = ref('')
const saveError = ref('')

const isAvailable = computed(() => props.cardWithSource.source.is_available)

function getProjectName(projectId: string): string {
  const project = configStore.projects.find(p => p.id === projectId)
  return project?.name || 'Unknown'
}

function toggleChecklistItem(itemId: string) {
  const item = editedCard.value.checklist.find(i => i.id === itemId)
  if (item) {
    item.checked = !item.checked
  }
}

function addChecklistItem() {
  editedCard.value.checklist.push({
    id: crypto.randomUUID(),
    text: '',
    checked: false
  })
}

function removeChecklistItem(itemId: string) {
  editedCard.value.checklist = editedCard.value.checklist.filter(i => i.id !== itemId)
}

function addTag() {
  if (!newTag.value || editedCard.value.tags.includes(newTag.value)) return
  editedCard.value.tags.push(newTag.value)
  newTag.value = ''
}

function removeTag(tag: string) {
  editedCard.value.tags = editedCard.value.tags.filter(t => t !== tag)
}

async function save() {
  if (!isAvailable.value) return
  
  saveError.value = ''
  try {
    // Load the board
    const boardPath = `${props.cardWithSource.source.project_path}/boards/${props.cardWithSource.source.board_id}.json`
    const content = await tauri.readFile(boardPath)
    const board = JSON.parse(content)
    
    // Find and update the card
    const cardIndex = board.cards.findIndex((c: Card) => c.id === editedCard.value.id)
    if (cardIndex !== -1) {
      editedCard.value.updated_at = new Date().toISOString()
      board.cards[cardIndex] = editedCard.value
      board.updated_at = new Date().toISOString()
      
      // Save the board
      await tauri.writeFile(boardPath, JSON.stringify(board, null, 2))
      
      emit('refresh')
      emit('close')
    }
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : 'Failed to save'
    console.error('Failed to save card:', err)
  }
}

async function archive() {
  if (!isAvailable.value) return
  
  editedCard.value.archived = true
  editedCard.value.archived_at = new Date().toISOString()
  editedCard.value.status = 'archived'
  
  await save()
}
</script>
