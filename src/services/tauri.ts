import { invoke } from '@tauri-apps/api/core'

// File system operations
export async function readFile(path: string): Promise<string> {
  return invoke('read_file', { path })
}

export async function writeFile(path: string, content: string): Promise<void> {
  return invoke('write_file', { path, content })
}

export async function listDirectory(path: string): Promise<Array<{ name: string; isDirectory: boolean }>> {
  return invoke('list_directory', { path })
}

export async function ensureDirectory(path: string): Promise<void> {
  return invoke('ensure_directory', { path })
}

export async function resolvePath(path: string): Promise<string> {
  return invoke('resolve_path', { path })
}

export async function getConfigPath(): Promise<string> {
  return invoke('get_config_path')
}

export async function getDefaultDataPath(): Promise<string> {
  return invoke('get_default_data_path')
}

export async function pathExists(path: string): Promise<boolean> {
  return invoke('path_exists', { path })
}

export async function deleteFile(path: string): Promise<void> {
  return invoke('delete_file', { path })
}

export async function deleteDirectory(path: string): Promise<void> {
  return invoke('delete_directory', { path })
}
