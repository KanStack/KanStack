<template>
  <aside v-if="open" class="w-64 border-r border-border-subtle flex flex-col">
    <!-- Projects List -->
    <div class="flex-1 overflow-y-auto p-4">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xs uppercase tracking-wider text-text-secondary">Projects</h2>
        <button class="text-text-muted hover:text-text-primary text-xs" @click="$emit('new-project')">+ New</button>
      </div>

      <ul class="space-y-1">
        <li v-for="project in projects" :key="project.id" class="group">
          <button
            class="w-full text-left px-3 py-2 text-sm border border-transparent hover:border-border-subtle transition-colors"
            :class="{ 'bg-bg-secondary border-border-subtle': currentProjectId === project.id }"
            @click="$emit('select-project', project)"
          >
            <div class="flex items-center justify-between">
              <span class="truncate">{{ project.name }}</span>
              <span class="flex items-center gap-1">
                <span v-if="project.type === 'custom'" class="text-text-muted text-xs">[custom]</span>
                <button class="text-text-muted hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity" @click.stop="$emit('delete-project', project)" title="Delete project">&#10005;</button>
              </span>
            </div>
          </button>
        </li>
      </ul>

      <!-- No projects state -->
      <div v-if="!projects.length" class="text-text-muted text-xs mt-4 text-center">No projects yet</div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import type { ProjectEntry } from '@/types'

defineProps<{
  open: boolean
  projects: ProjectEntry[]
  currentProjectId: string | null
}>()

defineEmits<{
  'new-project': []
  'select-project': [project: ProjectEntry]
  'delete-project': [project: ProjectEntry]
}>()
</script>
