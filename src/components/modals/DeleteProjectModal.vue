<template>
  <div v-if="visible && project" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="$emit('close')">
    <div class="bg-bg-secondary border border-border-subtle p-6 w-96">
      <h3 class="text-lg mb-4">Delete Project</h3>
      <p class="text-sm text-text-secondary mb-4">Remove <strong>{{ project.name }}</strong>?</p>
      <div class="flex justify-end gap-2">
        <button class="terminal-btn" @click="$emit('close')">Cancel</button>
        <button class="terminal-btn" @click="$emit('confirm', false)">Remove from list</button>
        <button class="terminal-btn text-red-400" @click="$emit('confirm', true)">Delete files too</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProjectEntry } from '@/types'

defineProps<{
  visible: boolean
  project: ProjectEntry | null
}>()

defineEmits<{
  close: []
  confirm: [deleteFiles: boolean]
}>()
</script>
