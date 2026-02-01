<template>
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click.self="$emit('close')"
  >
    <div class="bg-bg-secondary border border-border-subtle w-[500px] max-h-[80vh] flex flex-col">
      <!-- Header -->
      <div class="p-4 border-b border-border-subtle flex items-center justify-between">
        <h2 class="text-lg">Keyboard Shortcuts</h2>
        <button class="text-text-muted hover:text-text-primary" @click="$emit('close')">✕</button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4">
        <div class="space-y-4">
          <div v-for="group in shortcutGroups" :key="group.name">
            <h3 class="text-xs uppercase tracking-wider text-text-secondary mb-2">{{ group.name }}</h3>
            <div class="space-y-1">
              <div v-for="shortcut in group.shortcuts" :key="shortcut.key" class="flex items-center justify-between py-1">
                <span class="text-sm">{{ shortcut.description }}</span>
                <span class="px-2 py-1 bg-bg-tertiary border border-border-subtle text-xs font-mono">{{ shortcut.key }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-border-subtle text-center">
        <button class="terminal-btn" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Shortcut { key: string; description: string }
interface ShortcutGroup { name: string; shortcuts: Shortcut[] }

const shortcutGroups: ShortcutGroup[] = [
  {
    name: 'Navigation',
    shortcuts: [
      { key: '?', description: 'Show keyboard shortcuts' },
      { key: 'j', description: 'Navigate down' },
      { key: 'k', description: 'Navigate up' },
      { key: 'h', description: 'Navigate left' },
      { key: 'l', description: 'Navigate right' }
    ]
  },
  {
    name: 'Actions',
    shortcuts: [
      { key: 'n', description: 'New card' },
      { key: 'e', description: 'Edit card' },
      { key: 'a', description: 'Archive card' },
      { key: 'Enter', description: 'Open selected card' },
      { key: 'Esc', description: 'Close modal / Cancel' }
    ]
  },
  {
    name: 'Views',
    shortcuts: [
      { key: 'G', description: 'Summary view (all projects)' },
      { key: 'B', description: 'Create new board' },
      { key: '⌘K', description: 'Command palette' }
    ]
  }
]

defineEmits<{ close: [] }>()
</script>
