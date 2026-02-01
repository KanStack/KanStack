<template>
  <div class="h-screen w-screen flex flex-col bg-bg-primary text-text-primary font-mono overflow-hidden">
    <AppHeader
      :version="appVersion"
      @open-release-notes="openReleaseNotes"
      @open-command-palette="modals.commandPalette = true"
    />

    <div class="flex-1 flex overflow-hidden">
      <AppSidebar
        :open="sidebarOpen"
        :projects="configStore.projects"
        :current-project-id="projectStore.currentProjectId"
        @new-project="modals.newProject = true"
        @select-project="loadProject"
        @delete-project="deleteProject"
      />

      <button
        class="w-6 border-r border-border-subtle flex items-center justify-center hover:bg-bg-secondary transition-colors"
        @click="sidebarOpen = !sidebarOpen"
      >
        <span class="text-text-muted text-xs">{{ sidebarOpen ? '‹' : '›' }}</span>
      </button>

      <main class="flex-1 overflow-hidden">
        <BoardView v-if="projectStore.board" />
        <div v-else class="h-full flex items-center justify-center text-text-muted">
          <div class="text-center">
            <p class="text-lg mb-2">Welcome to KanStack</p>
            <p class="text-sm">Select a project or create a new one to get started</p>
          </div>
        </div>
      </main>
    </div>

    <CommandPalette
      v-if="modals.commandPalette"
      @close="modals.commandPalette = false"
      @new-project="modals.newProject = true"
    />

    <NewProjectModal
      :visible="modals.newProject"
      @close="modals.newProject = false"
      @create="confirmCreateProject"
    />

    <DeleteProjectModal
      :visible="modals.deleteProject"
      :project="projectToDelete"
      @close="closeDeleteModal"
      @confirm="confirmDeleteProject"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useConfigStore } from './stores/config'
import { useProjectStore } from './stores/project'
import * as tauri from './services/tauri'
import type { ProjectEntry } from './types'
import { getVersion } from '@tauri-apps/api/app'
import { open } from '@tauri-apps/plugin-shell'

import AppHeader from './components/layout/AppHeader.vue'
import AppSidebar from './components/layout/AppSidebar.vue'
import BoardView from './components/board/BoardView.vue'
import CommandPalette from './components/modals/CommandPalette.vue'
import NewProjectModal from './components/modals/NewProjectModal.vue'
import DeleteProjectModal from './components/modals/DeleteProjectModal.vue'

const configStore = useConfigStore()
const projectStore = useProjectStore()

const sidebarOpen = ref(true)
const appVersion = ref('0.0.0')
const projectToDelete = ref<ProjectEntry | null>(null)

const modals = reactive({
  commandPalette: false,
  newProject: false,
  deleteProject: false
})

onMounted(async () => {
  await configStore.loadConfig()
  try { appVersion.value = await getVersion() } catch (err) { console.error('Failed to get app version:', err) }

  if (configStore.projects.length) {
    const recent = [...configStore.projects].sort((a, b) =>
      new Date(b.last_opened).getTime() - new Date(a.last_opened).getTime()
    )
    await loadProject(recent[0])
  }
})

async function openReleaseNotes() {
  try { await open('https://github.com/galengreen/KanStack/tags') } catch (err) { console.error('Failed to open release notes:', err) }
}

async function loadProject(project: ProjectEntry) {
  await projectStore.loadProject(project.id, project.path)
}

async function confirmCreateProject(name: string) {
  const project = await configStore.addProject(name)
  if (project) await projectStore.loadProject(project.id, project.path, project.name)
  modals.newProject = false
}

function deleteProject(project: ProjectEntry) {
  projectToDelete.value = project
  modals.deleteProject = true
}

function closeDeleteModal() {
  modals.deleteProject = false
  projectToDelete.value = null
}

async function confirmDeleteProject(deleteFiles: boolean) {
  if (!projectToDelete.value) return
  const project = projectToDelete.value

  if (deleteFiles) {
    try { await tauri.deleteDirectory(project.path) } catch (err) { console.error('Failed to delete project files:', err) }
  }

  await configStore.removeProject(project.id)

  // Clear state if we deleted the currently loaded project
  if (projectStore.currentProjectId === project.id) {
    projectStore.currentProjectId = null
    projectStore.currentProjectPath = null
    projectStore.currentProjectMeta = null
    projectStore.board = null
  }

  closeDeleteModal()
}
</script>
