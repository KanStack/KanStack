import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as tauri from '@/services/tauri'
import type { AppConfig, ProjectEntry } from '@/types'

export const useConfigStore = defineStore('config', () => {
  const config = ref<AppConfig | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const projects = computed(() => config.value?.projects ?? [])
  const settings = computed(() => config.value?.settings)

  async function loadConfig() {
    isLoading.value = true
    error.value = null
    
    try {
      const configPath = await tauri.getConfigPath()
      const exists = await tauri.pathExists(configPath).catch(() => false)
      
      if (!exists) {
        config.value = await createDefaultConfig()
        await saveConfig()
      } else {
        config.value = JSON.parse(await tauri.readFile(configPath))
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load config'
      console.error('Failed to load config:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function saveConfig(newConfig?: AppConfig) {
    const toSave = newConfig ?? config.value
    if (!toSave) return

    try {
      const configPath = await tauri.getConfigPath()
      await tauri.ensureDirectory(configPath.replace('/config.json', ''))
      await tauri.writeFile(configPath, JSON.stringify(toSave, null, 2))
      if (!newConfig) config.value = toSave
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save config'
      console.error('Failed to save config:', err)
      throw err
    }
  }

  async function createDefaultConfig(): Promise<AppConfig> {
    const defaultDataPath = await tauri.getDefaultDataPath()
    return {
      app_version: '0.0.1',
      settings: {
        theme: 'dark',
        font: 'JetBrains Mono',
        auto_save: true,
        default_project_location: defaultDataPath
      },
      projects: [],
      summary_settings: {
        visible_projects: ['all'],
        filters: { exclude_archived: true, tags: [] }
      }
    }
  }

  async function addProject(name: string, customPath?: string) {
    if (!config.value) return

    const id = crypto.randomUUID()
    const path = customPath 
      ? `${customPath}/.kanstack`
      : `${config.value.settings.default_project_location}/${id}`

    const project: ProjectEntry = {
      id,
      name,
      path,
      type: customPath ? 'custom' : 'local',
      last_opened: new Date().toISOString()
    }

    config.value.projects.push(project)
    await saveConfig()
    return project
  }

  async function removeProject(id: string) {
    if (!config.value) return
    config.value.projects = config.value.projects.filter(p => p.id !== id)
    await saveConfig()
  }

  return {
    config,
    isLoading,
    error,
    projects,
    settings,
    loadConfig,
    saveConfig,
    addProject,
    removeProject
  }
})
