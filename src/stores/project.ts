import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ProjectMeta, Board } from '@/types'
import { useProjectLoader } from './composables/useProjectLoader'
import { useBoardActions } from './composables/useBoardActions'
import { useCardActions } from './composables/useCardActions'

export const useProjectStore = defineStore('project', () => {
  // Shared state
  const currentProjectId = ref<string | null>(null)
  const currentProjectPath = ref<string | null>(null)
  const currentProjectMeta = ref<ProjectMeta | null>(null)
  const board = ref<Board | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const currentBoard = computed(() => board.value)

  // Compose actions from focused modules
  const { loadProject } = useProjectLoader(
    currentProjectId, currentProjectPath, currentProjectMeta,
    board, isLoading, error
  )

  const { saveBoard } = useBoardActions(
    currentProjectPath, board
  )

  const {
    createCard, updateCard, moveCard, deleteCard,
    archiveCard, getCardChildren, getCardById, setCardParent,
  } = useCardActions(board, saveBoard)

  return {
    // State
    currentProjectId,
    currentProjectMeta,
    board,
    isLoading,
    error,
    currentBoard,
    currentProjectPath,
    // Project actions
    loadProject,
    // Board actions
    saveBoard,
    // Card actions
    createCard,
    updateCard,
    moveCard,
    deleteCard,
    archiveCard,
    getCardChildren,
    getCardById,
    setCardParent,
  }
})
