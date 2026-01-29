import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as tauri from '@/services/tauri'
import type { AppConfig, ProjectEntry } from '@/types'

export const useConfigStore = defineStore('config', () => {
  // State
  const config = ref<AppConfig | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const projects = computed(() => config.value?.projects || [])
  const settings = computed(() => config.value?.settings)

  // Actions
  async function loadConfig() {
    isLoading.value = true
    error.value = null
    
    try {
      const configPath = await tauri.getConfigPath()
      
      // Check if config exists
      const exists = await tauri.pathExists(configPath).catch(() => false)
      
      if (!exists) {
        // Create default config
        const defaultConfig = await createDefaultConfig()
        await saveConfig(defaultConfig)
        config.value = defaultConfig
      } else {
        // Load existing config
        const content = await tauri.readFile(configPath)
        config.value = JSON.parse(content)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load config'
      console.error('Failed to load config:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function saveConfig(newConfig?: AppConfig) {
    const configToSave = newConfig || config.value
    if (!configToSave) return

    try {
      const configPath = await tauri.getConfigPath()
      await tauri.ensureDirectory(configPath.replace('/config.json', ''))
      await tauri.writeFile(configPath, JSON.stringify(configToSave, null, 2))
      
      if (!newConfig) {
        config.value = configToSave
      }
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
      combined_board_settings: {
        visible_projects: ['all'],
        filters: {
          exclude_archived: true,
          tags: []
        }
      }
    }
  }

  async function addProject(name: string, customPath?: string) {
    if (!config.value) return

    const id = crypto.randomUUID()
    let path: string

    if (customPath) {
      path = `${customPath}/.kanstack`
    } else {
      const defaultPath = config.value.settings.default_project_location
      path = `${defaultPath}/${id}`
    }

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
