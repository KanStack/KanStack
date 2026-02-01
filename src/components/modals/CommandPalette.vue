<template>
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 pt-20"
    @click.self="$emit('close')"
  >
    <div class="bg-bg-secondary border border-border-subtle w-[600px] max-h-[70vh] flex flex-col">
      <!-- Search -->
      <div class="p-4 border-b border-border-subtle">
        <input
          ref="searchInput"
          v-model="searchQuery"
          type="text"
          class="terminal-input w-full text-lg"
          placeholder="Type a command or search..."
          @keydown.down.prevent="selectNext"
          @keydown.up.prevent="selectPrev"
          @keydown.enter.prevent="executeSelected"
          @keydown.esc="$emit('close')"
        />
      </div>

      <!-- Results -->
      <div class="flex-1 overflow-y-auto">
        <div v-if="filteredCommands.length === 0" class="p-4 text-text-muted text-center">No commands found</div>
        
        <div v-else>
          <div
            v-for="(cmd, index) in filteredCommands"
            :key="cmd.id"
            class="px-4 py-3 cursor-pointer border-l-2 border-transparent flex items-center justify-between"
            :class="{ 
              'bg-bg-tertiary border-l-text-primary': selectedIndex === index,
              'hover:bg-bg-tertiary': selectedIndex !== index
            }"
            @click="executeCommand(cmd)"
            @mouseenter="selectedIndex = index"
          >
            <div class="flex items-center gap-3">
              <span class="text-text-muted text-sm w-6">{{ cmd.icon }}</span>
              <div>
                <div class="text-sm">{{ cmd.name }}</div>
                <div class="text-xs text-text-muted">{{ cmd.description }}</div>
              </div>
            </div>
            <span v-if="cmd.shortcut" class="text-xs text-text-muted">{{ cmd.shortcut }}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-3 border-t border-border-subtle text-xs text-text-muted flex justify-between">
        <div class="flex gap-4"><span>↑↓ Navigate</span><span>↵ Select</span><span>esc Close</span></div>
        <span>{{ filteredCommands.length }} commands</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useConfigStore } from '@/stores/config'
import { useProjectStore } from '@/stores/project'

const emit = defineEmits<{
  close: []
  'new-project': []
}>()

const configStore = useConfigStore()
const projectStore = useProjectStore()

const searchQuery = ref('')
const selectedIndex = ref(0)
const searchInput = ref<HTMLInputElement | null>(null)

interface Command {
  id: string
  name: string
  description: string
  icon: string
  shortcut?: string
  action: () => void
}

function createNewProject() {
  emit('new-project')
  emit('close')
}

async function loadProject(project: { id: string; path: string }) {
  await projectStore.loadProject(project.id, project.path)
  emit('close')
}

const commands = computed<Command[]>(() => {
  const cmds: Command[] = [
    { id: 'new-project', name: 'Create New Project', description: 'Create a new kanban project', icon: '📁', shortcut: '', action: createNewProject }
  ]

  // Add project navigation commands
  configStore.projects.forEach(project => {
    cmds.push({
      id: `project-${project.id}`,
      name: `Open: ${project.name}`,
      description: `Switch to project "${project.name}"`,
      icon: '📂',
      action: () => loadProject(project)
    })
  })

  return cmds
})

watch(searchQuery, () => {
  selectedIndex.value = 0
})

const filteredCommands = computed(() => {
  if (!searchQuery.value) return commands.value
  const query = searchQuery.value.toLowerCase()
  return commands.value.filter(cmd => 
    cmd.name.toLowerCase().includes(query) ||
    cmd.description.toLowerCase().includes(query)
  )
})

function selectNext() {
  if (selectedIndex.value < filteredCommands.value.length - 1) selectedIndex.value++
}

function selectPrev() {
  if (selectedIndex.value > 0) selectedIndex.value--
}

function executeSelected() {
  const cmd = filteredCommands.value[selectedIndex.value]
  if (cmd) executeCommand(cmd)
}

function executeCommand(cmd: Command) {
  cmd.action()
}

onMounted(() => searchInput.value?.focus())
</script>
