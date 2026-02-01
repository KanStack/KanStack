<template>
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-bg-secondary border border-border-subtle p-6 w-96">
      <h3 class="text-lg mb-4">New Card</h3>
      <input ref="titleInput" v-model="title" type="text" placeholder="Card title..." class="terminal-input w-full mb-4" @keyup.enter="submit" />
      <div class="flex justify-end gap-2">
        <button class="terminal-btn" @click="$emit('close')">Cancel</button>
        <button class="terminal-btn" @click="submit" :disabled="!title">Create</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: []; create: [title: string] }>()

const title = ref('')
const titleInput = ref<HTMLInputElement | null>(null)

watch(() => props.visible, (val) => {
  if (val) {
    title.value = ''
    nextTick(() => titleInput.value?.focus())
  }
})

function submit() {
  if (!title.value) return
  emit('create', title.value)
}
</script>
