<script setup lang="ts">
defineProps<{
  kind?: 'info' | 'error'
  message: string
}>()

defineEmits<{
  close: []
}>()
</script>

<template>
  <div
    class="flex items-center justify-between gap-3 mx-5 mt-3.5 px-3.5 py-2.5 border border-border bg-surface text-text"
    :class="kind === 'error' ? 'error-banner' : ''"
    role="status"
    aria-live="polite"
  >
    <span class="text-body">{{ message }}</span>
    <button class="btn-plain shrink-0 uppercase" type="button" aria-label="Dismiss message" @click="$emit('close')">
      x
    </button>
  </div>
</template>


