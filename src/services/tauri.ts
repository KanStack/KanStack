import { invoke } from '@tauri-apps/api/core'

// Tauri command wrappers for file system operations
export const readFile = (path: string): Promise<string> => invoke('read_file', { path })
export const writeFile = (path: string, content: string): Promise<void> => invoke('write_file', { path, content })
export const listDirectory = (path: string): Promise<Array<{ name: string; isDirectory: boolean }>> => invoke('list_directory', { path })
export const ensureDirectory = (path: string): Promise<void> => invoke('ensure_directory', { path })
export const resolvePath = (path: string): Promise<string> => invoke('resolve_path', { path })
export const getConfigPath = (): Promise<string> => invoke('get_config_path')
export const getDefaultDataPath = (): Promise<string> => invoke('get_default_data_path')
export const pathExists = (path: string): Promise<boolean> => invoke('path_exists', { path })
export const deleteFile = (path: string): Promise<void> => invoke('delete_file', { path })
export const deleteDirectory = (path: string): Promise<void> => invoke('delete_directory', { path })
