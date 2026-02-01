import type { Ref } from 'vue'
import * as tauri from '@/services/tauri'
import type { Board } from '@/types'

export function useBoardActions(
  currentProjectPath: Ref<string | null>,
  board: Ref<Board | null>
) {
  async function saveBoard() {
    if (!board.value || !currentProjectPath.value) {
      console.error('[BoardActions] saveBoard: no board or path')
      return
    }

    board.value.updated_at = new Date().toISOString()

    try {
      await tauri.writeFile(`${currentProjectPath.value}/board.json`, JSON.stringify(board.value, null, 2))
    } catch (err) {
      console.error('[BoardActions] saveBoard failed:', err)
      throw err
    }
  }

  return { saveBoard }
}
