<script setup lang="ts">
import { watch } from 'vue'

import { useCardEditor } from '@/composables/useCardEditor'

import type { KanbanCardDocument } from '@docs/schemas/kanban-parser-schema'

const props = defineProps<{
  card: KanbanCardDocument | null
  open: boolean
  workspaceRoot: string | null
}>()

const emit = defineEmits<{
  close: []
}>()

const editor = useCardEditor()

function syncEditorState() {
  if (props.open && props.card && props.workspaceRoot) {
    const sameSession = editor.session.value?.card.slug === props.card.slug
      && editor.session.value?.workspaceRoot === props.workspaceRoot

    if (sameSession) {
      return
    }

    editor.open(props.card, props.workspaceRoot)
    return
  }

  editor.close()
}

async function handleClose() {
  const didSave = await editor.flushSave()
  if (!didSave) {
    return
  }

  editor.close()
  emit('close')
}

async function handleBlur() {
  await editor.flushSave()
}

async function handleDelete() {
  if (!props.card || !window.confirm(`Delete "${props.card.title}"?`)) {
    return
  }

  const didDelete = await editor.deleteCard()
  if (!didDelete) {
    return
  }

  editor.close()
  emit('close')
}

watch(() => [props.open, props.card, props.workspaceRoot], syncEditorState, { immediate: true })
</script>

<template>
  <div v-if="open && card" class="card-editor" @click.self="handleClose">
    <article class="card-editor__panel">
      <header class="card-editor__header">
        <div>
          <div class="card-editor__slug">{{ card.slug }}</div>
          <h2 class="card-editor__title">Edit card</h2>
        </div>

        <div class="card-editor__actions">
          <div
            class="card-editor__status-dot"
            :class="{ 'card-editor__status-dot--saved': editor.saveStatus.value === 'saved' }"
            :title="editor.saveStatus.value"
            :aria-label="editor.saveStatus.value"
          ></div>
          <button class="card-editor__button card-editor__button--danger" type="button" :disabled="editor.isDeleting.value" @click="handleDelete">
            {{ editor.isDeleting.value ? 'deleting...' : 'delete' }}
          </button>
          <button class="card-editor__button" type="button" @click="handleClose">close</button>
        </div>
      </header>

      <p v-if="editor.errorMessage.value" class="card-editor__error">{{ editor.errorMessage.value }}</p>

      <div class="card-editor__grid">
        <label class="card-editor__field card-editor__field--wide">
          <span>Title</span>
          <input v-model="editor.draft.title" class="card-editor__input" type="text" @blur="handleBlur" />
        </label>

        <label class="card-editor__field">
          <span>Type</span>
          <select v-model="editor.draft.type" class="card-editor__input" @blur="handleBlur" @change="handleBlur">
            <option value="">None</option>
            <option value="task">Task</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="research">Research</option>
            <option value="chore">Chore</option>
          </select>
        </label>

        <label class="card-editor__field">
          <span>Priority</span>
          <select v-model="editor.draft.priority" class="card-editor__input" @blur="handleBlur" @change="handleBlur">
            <option value="">None</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label class="card-editor__field">
          <span>Assignee</span>
          <input v-model="editor.draft.assignee" class="card-editor__input" type="text" @blur="handleBlur" />
        </label>

        <label class="card-editor__field">
          <span>Estimate</span>
          <input v-model="editor.draft.estimate" class="card-editor__input" type="number" min="0" step="1" @blur="handleBlur" />
        </label>

        <label class="card-editor__field card-editor__field--wide">
          <span>Tags</span>
          <input v-model="editor.draft.tags" class="card-editor__input" type="text" placeholder="auth, backend" @blur="handleBlur" />
        </label>
      </div>

      <label class="card-editor__field card-editor__field--body">
        <span>Body</span>
        <textarea v-model="editor.draft.body" class="card-editor__textarea" spellcheck="false" @blur="handleBlur"></textarea>
      </label>
    </article>
  </div>
</template>

<style scoped>
.card-editor {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  padding: 2rem;
  background: rgba(5, 5, 5, 0.82);
  backdrop-filter: blur(10px);
}

.card-editor__panel {
  width: min(62rem, 100%);
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid var(--shade-3);
  background: linear-gradient(180deg, var(--shade-2), var(--shade-1));
}

.card-editor__header,
.card-editor__actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.card-editor__slug {
  color: var(--shade-4);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.card-editor__title {
  margin: 0.3rem 0 0;
  font-size: 1.3rem;
}

.card-editor__button,
.card-editor__input,
.card-editor__textarea {
  border: 1px solid var(--shade-3);
  background: var(--shade-2);
  color: var(--shade-5);
  font: inherit;
}

.card-editor__button {
  padding: 0.7rem 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.card-editor__button--danger {
  border-color: rgba(209, 75, 75, 0.35);
  color: var(--danger-color);
}

.card-editor__status-dot {
  width: 0.75rem;
  height: 0.75rem;
  margin-top: 0.85rem;
  border-radius: 999px;
  background: var(--danger-color);
  box-shadow: 0 0 0 1px rgba(209, 75, 75, 0.35);
}

.card-editor__status-dot--saved {
  background: var(--success-color);
  box-shadow: 0 0 0 1px rgba(65, 182, 110, 0.35);
}

.card-editor__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

.card-editor__field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.card-editor__field span {
  color: var(--shade-4);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.card-editor__field--wide {
  grid-column: 1 / -1;
}

.card-editor__input,
.card-editor__textarea {
  width: 100%;
  padding: 0.75rem 0.85rem;
}

.card-editor__field--body {
  flex: 1;
  min-height: 0;
}

.card-editor__textarea {
  flex: 1;
  min-height: 16rem;
  resize: none;
  line-height: 1.6;
}

.card-editor__error {
  margin: 0;
  padding: 0.75rem 0.9rem;
  border: 1px solid rgba(209, 75, 75, 0.35);
  color: var(--shade-5);
  background: rgba(72, 19, 19, 0.22);
}

@media (max-width: 720px) {
  .card-editor {
    padding: 0;
  }

  .card-editor__panel {
    width: 100%;
  }

  .card-editor__header {
    flex-direction: column;
  }

  .card-editor__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
