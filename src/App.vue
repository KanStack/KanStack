<template>
  <div class="h-screen w-screen flex flex-col bg-bg-primary text-text-primary font-mono overflow-hidden">
    <!-- Header -->
    <header class="h-12 border-b border-border-subtle flex items-center px-4 justify-between">
      <div class="flex items-center gap-4">
        <h1 class="text-lg font-bold tracking-wider">KANSTACK</h1>
        <span class="text-text-muted text-xs">v0.0.1</span>
      </div>
      <div class="flex items-center gap-2">
        <button 
          class="terminal-btn text-xs"
          @click="showCommandPalette = true"
        >
          ⌘K
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Sidebar -->
      <aside 
        class="w-64 border-r border-border-subtle flex flex-col"
        :class="{ 'hidden': !sidebarOpen }"
      >
        <!-- Summary Button (at top) -->
        <div class="p-4 border-b border-border-subtle">
          <button
            class="w-full text-left px-3 py-2 text-sm border border-border-subtle hover:border-border-visible transition-colors"
            :class="{ 'bg-bg-tertiary': currentView === 'summary' }"
            @click="currentView = 'summary'"
          >
            <span>Summary</span>
          </button>
        </div>

        <!-- Projects List -->
        <div class="flex-1 overflow-y-auto p-4">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-xs uppercase tracking-wider text-text-secondary">Projects</h2>
            <button 
              class="text-text-muted hover:text-text-primary text-xs"
              @click="createNewProject"
            >
              + New
            </button>
          </div>
          
          <ul class="space-y-1">
            <li 
              v-for="project in configStore.projects" 
              :key="project.id"
              class="group"
            >
              <button
                class="w-full text-left px-3 py-2 text-sm border border-transparent hover:border-border-subtle transition-colors"
                :class="{ 'bg-bg-secondary border-border-subtle': projectStore.currentProjectId === project.id }"
                @click="loadProject(project)"
              >
                <div class="flex items-center justify-between">
                  <span class="truncate">{{ project.name }}</span>
                  <span class="flex items-center gap-1">
                    <span 
                      v-if="project.type === 'custom'"
                      class="text-text-muted text-xs"
                    >[custom]</span>
                    <button
                      class="text-text-muted hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      @click.stop="deleteProject(project)"
                      title="Delete project"
                    >✕</button>
                  </span>
                </div>
              </button>
            </li>
          </ul>

          <!-- No projects state -->
          <div v-if="configStore.projects.length === 0" class="text-text-muted text-xs mt-4 text-center">
            No projects yet
          </div>
        </div>

        <!-- Boards List (if project selected) -->
        <div v-if="projectStore.currentProjectId" class="border-t border-border-subtle p-4 flex-1">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-xs uppercase tracking-wider text-text-secondary">Boards</h2>
            <button 
              class="text-text-muted hover:text-text-primary text-xs"
              @click="createNewBoard"
            >
              + New
            </button>
          </div>
          
          <ul class="space-y-1">
            <li 
              v-for="board in projectStore.boards" 
              :key="board.id"
            >
              <button
                class="w-full text-left px-3 py-2 text-sm border border-transparent hover:border-border-subtle transition-colors"
                :class="{ 'bg-bg-secondary border-border-subtle': projectStore.currentBoardId === board.id && currentView === 'board' }"
                @click="selectBoard(board.id)"
              >
                <span class="truncate">{{ board.name }}</span>
              </button>
            </li>
          </ul>
          
          <!-- No boards state -->
          <div v-if="projectStore.boards.length === 0" class="text-text-muted text-xs mt-2 text-center">
            No boards yet
          </div>
        </div>
      </aside>

      <!-- Toggle Sidebar Button -->
      <button
        class="w-6 border-r border-border-subtle flex items-center justify-center hover:bg-bg-secondary transition-colors"
        @click="sidebarOpen = !sidebarOpen"
      >
        <span class="text-text-muted text-xs">{{ sidebarOpen ? '‹' : '›' }}</span>
      </button>

      <!-- Board Area -->
      <main class="flex-1 overflow-hidden">
        <BoardView v-if="currentView === 'board' && projectStore.currentBoard" />
        <SummaryView v-else-if="currentView === 'summary'" :is-active="currentView === 'summary'" />
        <div v-else class="h-full flex items-center justify-center text-text-muted">
          <div class="text-center">
            <p class="text-lg mb-2">Welcome to KanStack</p>
            <p class="text-sm">Select a project or create a new one to get started</p>
          </div>
        </div>
      </main>
    </div>

    <!-- Command Palette -->
    <CommandPalette 
      v-if="showCommandPalette" 
      @close="showCommandPalette = false"
      @switch-view="(view) => currentView = view"
      @new-project="createNewProject"
      @new-board="createNewBoard"
    />

    <!-- New Project Modal -->
    <div 
      v-if="showNewProjectModal" 
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="showNewProjectModal = false"
    >
      <div class="bg-bg-secondary border border-border-subtle p-6 w-96">
        <h3 class="text-lg mb-4">Create New Project</h3>
        <input
          v-model="newProjectName"
          type="text"
          placeholder="Project name..."
          class="terminal-input w-full mb-4"
          @keyup.enter="confirmCreateProject"
        />
        <div class="flex justify-end gap-2">
          <button class="terminal-btn" @click="showNewProjectModal = false">Cancel</button>
          <button class="terminal-btn" @click="confirmCreateProject" :disabled="!newProjectName">Create</button>
        </div>
      </div>
    </div>

    <!-- New Board Modal -->
    <div 
      v-if="showNewBoardModal" 
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="showNewBoardModal = false"
    >
      <div class="bg-bg-secondary border border-border-subtle p-6 w-96">
        <h3 class="text-lg mb-4">Create New Board</h3>
        <input
          v-model="newBoardName"
          type="text"
          placeholder="Board name..."
          class="terminal-input w-full mb-4"
          @keyup.enter="confirmCreateBoard"
        />
        <div v-if="boardError" class="text-red-400 text-sm mb-4">{{ boardError }}</div>
        <div class="flex justify-end gap-2">
          <button class="terminal-btn" @click="showNewBoardModal = false">Cancel</button>
          <button class="terminal-btn" @click="confirmCreateBoard" :disabled="!newBoardName">Create</button>
        </div>
      </div>
    </div>
    <!-- Delete Project Modal -->
    <div 
      v-if="showDeleteProjectModal && projectToDelete" 
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="showDeleteProjectModal = false"
    >
      <div class="bg-bg-secondary border border-border-subtle p-6 w-96">
        <h3 class="text-lg mb-4">Delete Project</h3>
        <p class="text-sm text-text-secondary mb-4">
          Remove <strong>{{ projectToDelete.name }}</strong>?
        </p>
        <div class="flex justify-end gap-2">
          <button class="terminal-btn" @click="showDeleteProjectModal = false">Cancel</button>
          <button class="terminal-btn" @click="confirmDeleteProject(false)">Remove from list</button>
          <button class="terminal-btn text-red-400" @click="confirmDeleteProject(true)">Delete files too</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useConfigStore } from './stores/config'
import { useProjectStore } from './stores/project'
import * as tauri from './services/tauri'
import BoardView from './components/BoardView.vue'
import SummaryView from './components/SummaryView.vue'
import CommandPalette from './components/CommandPalette.vue'
import type { ProjectEntry } from './types'

const configStore = useConfigStore()
const projectStore = useProjectStore()

const sidebarOpen = ref(true)
const currentView = ref<'board' | 'summary'>('summary')
const showCommandPalette = ref(false)
const showNewProjectModal = ref(false)
const showNewBoardModal = ref(false)
const newProjectName = ref('')
const newBoardName = ref('')
const boardError = ref('')
const showDeleteProjectModal = ref(false)
const projectToDelete = ref<ProjectEntry | null>(null)

onMounted(async () => {
  await configStore.loadConfig()
})

async function loadProject(project: ProjectEntry) {
  currentView.value = 'board'
  await projectStore.loadProject(project.id, project.path)
}

function selectBoard(boardId: string) {
  currentView.value = 'board'
  projectStore.setCurrentBoard(boardId)
}

function createNewProject() {
  newProjectName.value = ''
  showNewProjectModal.value = true
}

async function confirmCreateProject() {
  if (!newProjectName.value) return
  
  const project = await configStore.addProject(newProjectName.value)
  if (project) {
    await projectStore.loadProject(project.id, project.path, project.name)
  }
  
  showNewProjectModal.value = false
  newProjectName.value = ''
}

function deleteProject(project: ProjectEntry) {
  projectToDelete.value = project
  showDeleteProjectModal.value = true
}

async function confirmDeleteProject(deleteFiles: boolean = false) {
  if (!projectToDelete.value) return
  
  const project = projectToDelete.value
  
  if (deleteFiles) {
    try {
      await tauri.deleteDirectory(project.path)
    } catch (err) {
      console.error('Failed to delete project files:', err)
    }
  }
  
  await configStore.removeProject(project.id)
  
  // If we deleted the currently loaded project, clear the state
  if (projectStore.currentProjectId === project.id) {
    projectStore.currentProjectId = null
    projectStore.currentProjectPath = null
    projectStore.currentProjectMeta = null
    projectStore.boards = []
    projectStore.currentBoardId = null
  }
  
  showDeleteProjectModal.value = false
  projectToDelete.value = null
}

function createNewBoard() {
  console.log('Opening board modal, project:', projectStore.currentProjectId, 'path:', projectStore.currentProjectPath)
  if (!projectStore.currentProjectId) {
    console.error('No project selected!')
    return
  }
  newBoardName.value = ''
  boardError.value = ''
  showNewBoardModal.value = true
}

async function confirmCreateBoard() {
  if (!newBoardName.value) return
  
  boardError.value = ''
  try {
    await projectStore.createBoard(newBoardName.value)
    showNewBoardModal.value = false
    newBoardName.value = ''
  } catch (err) {
    boardError.value = err instanceof Error ? err.message : 'Failed to create board'
    console.error('Board creation failed:', err)
  }
}
</script>
