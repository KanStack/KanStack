<template>
  <div
    v-if="card && board"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="$emit('close')"
    @keydown="onKeydown"
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
          <!-- Main Content: Markdown Description -->
          <div class="col-span-2">
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs uppercase tracking-wider text-text-secondary">Description</label>
              <button
                class="text-xs text-text-muted hover:text-text-primary"
                @click="editing = !editing"
              >
                {{ editing ? 'Preview' : 'Edit' }}
              </button>
            </div>

            <div class="h-[300px]">
              <!-- Edit mode -->
              <textarea
                v-if="editing"
                ref="editorRef"
                v-model="editedCard.content"
                class="terminal-input w-full h-full resize-none"
                placeholder="Write in Markdown...&#10;&#10;Use - [ ] for task lists"
                @keydown.escape.stop="editing = false"
              />

              <!-- Preview mode -->
              <div
                v-else
                class="card-markdown h-full overflow-y-auto p-3 border border-border-subtle cursor-text"
                :class="{ 'text-text-muted italic': !editedCard.content }"
                @click="onPreviewClick"
                v-html="renderedContent"
              />
            </div>
          </div>

          <!-- Sidebar -->
          <div class="space-y-4">
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
              <input v-model="editedCard.due_date" type="date" class="terminal-input w-full" />
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
        <button class="terminal-btn text-text-muted" @click="archive">Archive</button>
        <div class="flex gap-2">
          <button class="terminal-btn" @click="$emit('close')">Cancel</button>
          <button class="terminal-btn" @click="save">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { marked } from 'marked'
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

// --- State ---

const editedCard = ref<Card>(JSON.parse(JSON.stringify(props.card)))
const newTag = ref('')
const editing = ref(false)
const editorRef = ref<HTMLTextAreaElement | null>(null)

// --- Initialise: merge checklist into markdown content ---

function checklistToMarkdown(checklist: { text: string; checked: boolean }[]): string {
  if (!checklist.length) return ''
  return checklist.map(item => `- [${item.checked ? 'x' : ' '}] ${item.text}`).join('\n')
}

;(function init() {
  const card = editedCard.value
  if (card.checklist?.length) {
    const md = checklistToMarkdown(card.checklist)
    card.content = card.content
      ? card.content + '\n\n' + md
      : md
    card.checklist = []
  }
})()

// --- Markdown rendering ---

marked.setOptions({
  breaks: true,
  gfm: true,
})

const renderedContent = computed(() => {
  if (!editedCard.value.content) return '<span>Click to add a description...</span>'
  return marked.parse(editedCard.value.content) as string
})

// --- Interactive task list checkboxes in preview ---

function onPreviewClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox') {
    e.preventDefault()
    const checkboxes = document.querySelectorAll('.card-markdown input[type="checkbox"]')
    const index = Array.from(checkboxes).indexOf(target)
    if (index === -1) return
    toggleCheckboxAtIndex(index)
    return
  }
  // Clicking anywhere else in preview enters edit mode
  editing.value = true
  nextTick(() => editorRef.value?.focus())
}

function toggleCheckboxAtIndex(index: number) {
  const content = editedCard.value.content
  const regex = /- \[([ xX])\]/g
  let match: RegExpExecArray | null
  let count = 0
  while ((match = regex.exec(content)) !== null) {
    if (count === index) {
      const isChecked = match[1] !== ' '
      const replacement = isChecked ? '- [ ]' : '- [x]'
      editedCard.value.content =
        content.slice(0, match.index) + replacement + content.slice(match.index + match[0].length)
      return
    }
    count++
  }
}

// --- Computed ---

// --- Tags ---

function addTag() {
  const tag = newTag.value.trim()
  if (!tag || editedCard.value.tags.includes(tag)) return
  editedCard.value.tags.push(tag)
  newTag.value = ''
}

function removeTag(tag: string) {
  editedCard.value.tags = editedCard.value.tags.filter(t => t !== tag)
}

// --- Save: parse task lists back to checklist for data compatibility ---

function parseChecklistFromContent(content: string): { content: string; checklist: Card['checklist'] } {
  const checklist: Card['checklist'] = []
  const cleaned = content.replace(/- \[([ xX])\] (.+)/g, (_match, check: string, text: string) => {
    checklist.push({
      id: crypto.randomUUID(),
      text: text.trim(),
      checked: check !== ' ',
    })
    return '' // remove from content
  })
  // Clean up leftover blank lines from removal
  const trimmedContent = cleaned.replace(/\n{3,}/g, '\n\n').trim()
  return { content: trimmedContent, checklist }
}

function save() {
  const { content, checklist } = parseChecklistFromContent(editedCard.value.content)
  const cardToSave = {
    ...editedCard.value,
    content,
    checklist,
    content_type: 'markdown',
  }
  emit('save', cardToSave)
}

function archive() {
  emit('archive', props.card.id)
}

// --- Keyboard shortcuts ---

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && !editing.value) {
    emit('close')
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault()
    save()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
/* Markdown rendered content styling */
.card-markdown {
  font-size: 14px;
  line-height: 1.6;
}

.card-markdown :deep(h1) {
  font-size: 1.4em;
  font-weight: 700;
  margin: 0.8em 0 0.4em;
  border-bottom: 1px solid #333;
  padding-bottom: 0.3em;
}

.card-markdown :deep(h2) {
  font-size: 1.2em;
  font-weight: 700;
  margin: 0.8em 0 0.4em;
}

.card-markdown :deep(h3) {
  font-size: 1.05em;
  font-weight: 600;
  margin: 0.6em 0 0.3em;
}

.card-markdown :deep(p) {
  margin: 0.4em 0;
}

.card-markdown :deep(ul),
.card-markdown :deep(ol) {
  padding-left: 1.5em;
  margin: 0.4em 0;
}

.card-markdown :deep(li) {
  margin: 0.2em 0;
}

.card-markdown :deep(li.task-list-item) {
  list-style: none;
  margin-left: -1.5em;
}

.card-markdown :deep(li.task-list-item input[type="checkbox"]) {
  margin-right: 0.5em;
  cursor: pointer;
  accent-color: #fff;
}

.card-markdown :deep(code) {
  background: #1a1a1a;
  border: 1px solid #333;
  padding: 0.1em 0.4em;
  font-size: 0.9em;
}

.card-markdown :deep(pre) {
  background: #1a1a1a;
  border: 1px solid #333;
  padding: 0.8em;
  margin: 0.6em 0;
  overflow-x: auto;
}

.card-markdown :deep(pre code) {
  background: none;
  border: none;
  padding: 0;
}

.card-markdown :deep(blockquote) {
  border-left: 3px solid #555;
  padding-left: 0.8em;
  color: #aaa;
  margin: 0.4em 0;
}

.card-markdown :deep(a) {
  color: #fff;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.card-markdown :deep(hr) {
  border: none;
  border-top: 1px solid #333;
  margin: 0.8em 0;
}

.card-markdown :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.6em 0;
}

.card-markdown :deep(th),
.card-markdown :deep(td) {
  border: 1px solid #333;
  padding: 0.4em 0.6em;
  text-align: left;
}

.card-markdown :deep(th) {
  background: #1a1a1a;
}
</style>
