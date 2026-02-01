import type { Ref } from 'vue'
import * as tauri from '@/services/tauri'
import type { ProjectMeta, Board } from '@/types'

export function useProjectLoader(
  currentProjectId: Ref<string | null>,
  currentProjectPath: Ref<string | null>,
  currentProjectMeta: Ref<ProjectMeta | null>,
  board: Ref<Board | null>,
  isLoading: Ref<boolean>,
  error: Ref<string | null>
) {
  async function loadProject(projectId: string, projectPath: string, projectName?: string) {
    isLoading.value = true
    error.value = null
    currentProjectId.value = projectId
    currentProjectPath.value = projectPath

    try {
      const metaPath = `${projectPath}/meta.json`
      if (!await tauri.pathExists(metaPath)) {
        await createProjectStructure(projectPath, projectId, projectName)
      }

      currentProjectMeta.value = JSON.parse(await tauri.readFile(metaPath))
      await loadBoard(projectPath)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load project'
      console.error('Failed to load project:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createProjectStructure(projectPath: string, projectId: string, projectName?: string) {
    await tauri.ensureDirectory(projectPath)

    const meta: ProjectMeta = {
      id: projectId,
      name: projectName || 'New Project',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      settings: { tags: [], custom_fields: [] }
    }

    await tauri.writeFile(`${projectPath}/meta.json`, JSON.stringify(meta, null, 2))
    currentProjectMeta.value = meta

    const boardData: Board = {
      id: 'board',
      version: '1.0',
      schema_version: 1,
      name: 'Board',
      project_id: projectId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      columns: [
        { id: crypto.randomUUID(), name: 'Backlog', order: 'a' },
        { id: crypto.randomUUID(), name: 'In Progress', order: 'b' },
        { id: crypto.randomUUID(), name: 'Done', order: 'c' }
      ],
      cards: []
    }

    await tauri.writeFile(`${projectPath}/board.json`, JSON.stringify(boardData, null, 2))
  }

  async function loadBoard(projectPath: string) {
    try {
      const boardPath = `${projectPath}/board.json`
      if (await tauri.pathExists(boardPath)) {
        board.value = JSON.parse(await tauri.readFile(boardPath))
      } else {
        board.value = null
      }
    } catch (err) {
      console.error('Failed to load board:', err)
      board.value = null
    }
  }

  return { loadProject }
}
