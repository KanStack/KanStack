<template>
  <header class="h-12 border-b border-border-subtle flex items-center px-4 justify-between">
    <div class="flex items-center gap-4">
      <h1 class="text-lg font-bold tracking-wider">KANSTACK</h1>
      <a
        href="#"
        class="text-text-muted text-xs hover:text-text-primary transition-colors"
        @click.prevent="$emit('open-release-notes')"
        title="View release notes"
      >v{{ version }}</a>
    </div>
    <div class="flex items-center gap-2">
      <button
        class="terminal-btn text-xs"
        @click="$emit('open-command-palette')"
      >
        &#8984;K
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  version: string
}>()

defineEmits<{
  'open-release-notes': []
  'open-command-palette': []
}>()
</script>
