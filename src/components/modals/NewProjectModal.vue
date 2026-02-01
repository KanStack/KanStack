<template>
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-bg-secondary border border-border-subtle p-6 w-96">
      <h3 class="text-lg mb-4">Create New Project</h3>
      <input v-model="name" type="text" placeholder="Project name..." class="terminal-input w-full mb-4" @keyup.enter="submit" />
      <div class="flex justify-end gap-2">
        <button class="terminal-btn" @click="$emit('close')">Cancel</button>
        <button class="terminal-btn" @click="submit" :disabled="!name">Create</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ close: []; create: [name: string] }>()

const name = ref('')

watch(() => props.visible, (val) => { if (val) name.value = '' })

function submit() {
  if (!name.value) return
  emit('create', name.value)
}
</script>
