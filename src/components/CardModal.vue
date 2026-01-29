<template>
  <div 
    v-if="card && board"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="$emit('close')"
  >
    <div class="bg-bg-secondary border border-border-subtle w-[800px] max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="p-4 border-b border-border-subtle flex items-center justify-between">
        <input
          v-model="editedCard.title"
          type="text"
          class="terminal-input flex-1 text-lg font-medium"
          placeholder="Card title..."
        />
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
            <!-- Column -->
            <div>
              <label class="text-xs uppercase tracking-wider text-text-secondary mb-2 block">Column</label>
              <select v-model="editedCard.column_id" class="terminal-input w-full">
                <option v-for="col in board.columns" :key="col.id" :value="col.id">
                  {{ col.name }}
                </option>
              </select>
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

            <!-- Parent Card -->
            <div v-if="potentialParentCards.length > 0">
              <label class="text-xs uppercase tracking-wider text-text-secondary mb-2 block">Parent</label>
              <select v-model="editedCard.parent_id" class="terminal-input w-full">
                <option :value="null">None</option>
                <option v-for="c in potentialParentCards" :key="c.id" :value="c.id">
                  {{ c.title }}
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-border-subtle flex justify-between">
        <button class="terminal-btn text-text-muted" @click="archive">
          Archive
        </button>
        <div class="flex gap-2">
          <button class="terminal-btn" @click="$emit('close')">Cancel</button>
          <button class="terminal-btn" @click="save">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Card, Board } from '@/types'

const props = defineProps<{
  card: Card
  board: Board
}>()

const emit = defineEmits<{
  close: []
  save: [card: Card]
  archive: [cardId: string]
}>()

const editedCard = ref<Card>(JSON.parse(JSON.stringify(props.card)))
const newTag = ref('')

const potentialParentCards = computed(() => {
  return props.board.cards.filter(c => 
    c.id !== props.card.id && 
    !c.archived &&
    c.id !== props.card.parent_id
  )
})

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

function save() {
  emit('save', editedCard.value)
}

function archive() {
  emit('archive', props.card.id)
}
</script>
