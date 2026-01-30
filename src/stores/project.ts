import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as tauri from '@/services/tauri'
import type { ProjectMeta, Board, Card } from '@/types'

export const useProjectStore = defineStore('project', () => {
  // State
  const currentProjectId = ref<string | null>(null)
  const currentProjectPath = ref<string | null>(null)
  const currentProjectMeta = ref<ProjectMeta | null>(null)
  const boards = ref<Board[]>([])
  const currentBoardId = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const currentBoard = computed(() => {
    if (!currentBoardId.value) return null
    return boards.value.find(b => b.id === currentBoardId.value) || null
  })

  // Actions
  async function loadProject(projectId: string, projectPath: string, projectName?: string) {
    isLoading.value = true
    error.value = null
    currentProjectId.value = projectId
    currentProjectPath.value = projectPath

    try {
      // Load project meta
      const metaPath = `${projectPath}/meta.json`
      const metaExists = await tauri.pathExists(metaPath)
      
      if (!metaExists) {
        // Create new project structure
        await createProjectStructure(projectPath, projectId, projectName)
      }

      const metaContent = await tauri.readFile(metaPath)
      currentProjectMeta.value = JSON.parse(metaContent)

      // Load all boards
      await loadBoards(projectPath)
      
      // Set first board as current if none selected
      if (!currentBoardId.value && boards.value.length > 0) {
        currentBoardId.value = boards.value[0].id
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load project'
      console.error('Failed to load project:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createProjectStructure(projectPath: string, projectId: string, projectName?: string) {
    console.log('Creating project structure at:', projectPath)
    
    // Ensure project directory exists first
    await tauri.ensureDirectory(projectPath)
    console.log('Project directory created')
    
    // Ensure boards subdirectory exists
    await tauri.ensureDirectory(`${projectPath}/boards`)
    console.log('Boards directory created')

    // Create meta.json
    const meta: ProjectMeta = {
      id: projectId,
      name: projectName || 'New Project',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      boards: [],
      settings: {
        tags: [],
        custom_fields: []
      }
    }

    await tauri.writeFile(
      `${projectPath}/meta.json`,
      JSON.stringify(meta, null, 2)
    )
    console.log('Meta file created')

    currentProjectMeta.value = meta

    // Create a default board
    const defaultBoardId = crypto.randomUUID()
    const defaultBoard: Board = {
      id: defaultBoardId,
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

    await tauri.writeFile(
      `${projectPath}/boards/${defaultBoardId}.json`,
      JSON.stringify(defaultBoard, null, 2)
    )

    meta.boards.push(defaultBoardId)
    await tauri.writeFile(
      `${projectPath}/meta.json`,
      JSON.stringify(meta, null, 2)
    )
    console.log('Default board created')
  }

  async function loadBoards(projectPath: string) {
    try {
      console.log('Loading boards from:', projectPath)
      const boardsPath = `${projectPath}/boards`
      console.log('Boards path:', boardsPath)
      
      const entries = await tauri.listDirectory(boardsPath)
      console.log('Found entries:', entries)
      
      const loadedBoards: Board[] = []
      
      for (const entry of entries) {
        console.log('Processing entry:', entry)
        if (!entry.isDirectory && entry.name.endsWith('.json')) {
          const boardPath = `${boardsPath}/${entry.name}`
          console.log('Loading board from:', boardPath)
          const content = await tauri.readFile(boardPath)
          loadedBoards.push(JSON.parse(content))
        }
      }
      
      console.log('Loaded boards:', loadedBoards.length)
      boards.value = loadedBoards.sort((a, b) => a.name.localeCompare(b.name))
    } catch (err) {
      console.error('Failed to load boards:', err)
      boards.value = []
    }
  }

  async function createBoard(name: string) {
    if (!currentProjectPath.value || !currentProjectId.value) return

    const id = crypto.randomUUID()
    const board: Board = {
      id,
      version: '1.0',
      schema_version: 1,
      name,
      project_id: currentProjectId.value,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      columns: [
        { id: crypto.randomUUID(), name: 'Backlog', order: 'a' },
        { id: crypto.randomUUID(), name: 'In Progress', order: 'b' },
        { id: crypto.randomUUID(), name: 'Done', order: 'c' }
      ],
      cards: []
    }

    try {
      console.log('Creating board:', name, 'in project:', currentProjectPath.value)
      
      // Ensure boards directory exists
      const boardsDir = `${currentProjectPath.value}/boards`
      await tauri.ensureDirectory(boardsDir)
      console.log('Boards directory ensured:', boardsDir)
      
      const boardPath = `${boardsDir}/${id}.json`
      console.log('Writing board to:', boardPath)
      await tauri.writeFile(boardPath, JSON.stringify(board, null, 2))
      console.log('Board file written successfully')

      // Update project meta
      if (currentProjectMeta.value) {
        currentProjectMeta.value.boards.push(id)
        currentProjectMeta.value.updated_at = new Date().toISOString()
        await tauri.writeFile(
          `${currentProjectPath.value}/meta.json`,
          JSON.stringify(currentProjectMeta.value, null, 2)
        )
      }

      // Force reactivity update
      boards.value = [...boards.value, board]
      currentBoardId.value = id

      return board
    } catch (err) {
      console.error('Failed to create board:', err)
      error.value = err instanceof Error ? err.message : 'Failed to create board'
      throw err
    }
  }

  async function saveBoard(board: Board) {
    console.log('[ProjectStore] saveBoard called for board:', board.id, 'currentProjectPath:', currentProjectPath.value)
    if (!currentProjectPath.value) {
      console.error('[ProjectStore] saveBoard — no currentProjectPath, aborting')
      return
    }

    board.updated_at = new Date().toISOString()
    
    const boardPath = `${currentProjectPath.value}/boards/${board.id}.json`
    console.log('[ProjectStore] saveBoard — writing to:', boardPath)
    
    try {
      await tauri.writeFile(boardPath, JSON.stringify(board, null, 2))
      console.log('[ProjectStore] saveBoard — file written successfully')
    } catch (err) {
      console.error('[ProjectStore] saveBoard — writeFile failed:', err)
      throw err
    }

    // Force reactivity update — deep clone the updated board so Vue detects changes
    const oldLength = boards.value.length
    boards.value = boards.value.map(b => b.id === board.id ? JSON.parse(JSON.stringify(board)) : b)
    console.log('[ProjectStore] saveBoard — reactivity updated, boards count:', oldLength, '→', boards.value.length)
  }

  async function deleteBoard(boardId: string) {
    if (!currentProjectPath.value) return

    // Delete board file from disk
    const boardPath = `${currentProjectPath.value}/boards/${boardId}.json`
    await tauri.deleteFile(boardPath).catch(err => console.error('Failed to delete board file:', err))

    // Update project meta
    if (currentProjectMeta.value) {
      currentProjectMeta.value.boards = currentProjectMeta.value.boards.filter(id => id !== boardId)
      currentProjectMeta.value.updated_at = new Date().toISOString()
      await tauri.writeFile(
        `${currentProjectPath.value}/meta.json`,
        JSON.stringify(currentProjectMeta.value, null, 2)
      )
    }

    // Update local state
    boards.value = boards.value.filter(b => b.id !== boardId)
    
    if (currentBoardId.value === boardId) {
      currentBoardId.value = boards.value.length > 0 ? boards.value[0].id : null
    }
  }

  function setCurrentBoard(boardId: string) {
    currentBoardId.value = boardId
  }

  async function createCard(boardId: string, columnId: string, title: string) {
    const board = boards.value.find(b => b.id === boardId)
    if (!board) return

    const card: Card = {
      id: crypto.randomUUID(),
      column_id: columnId,
      title,
      content: '',
      content_type: 'markdown',
      order: generateOrder(board.cards, columnId),
      tags: [],
      priority: 0,
      linked_refs: [],
      checklist: [],
      status: 'active',
      archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {}
    }

    board.cards.push(card)
    await saveBoard(board)

    return card
  }

  async function updateCard(boardId: string, cardId: string, updates: Partial<Card>) {
    const board = boards.value.find(b => b.id === boardId)
    if (!board) return

    const card = board.cards.find(c => c.id === cardId)
    if (!card) return

    Object.assign(card, updates, { updated_at: new Date().toISOString() })
    await saveBoard(board)

    return card
  }

  async function moveCard(boardId: string, cardId: string, targetColumnId: string, targetOrder?: string) {
    console.log('[ProjectStore] moveCard called:', { boardId, cardId, targetColumnId, targetOrder })
    const board = boards.value.find(b => b.id === boardId)
    if (!board) {
      console.error('[ProjectStore] moveCard — board not found:', boardId, 'available boards:', boards.value.map(b => b.id))
      return
    }

    const card = board.cards.find(c => c.id === cardId)
    if (!card) {
      console.error('[ProjectStore] moveCard — card not found:', cardId, 'in board:', boardId, 'available cards:', board.cards.map(c => c.id))
      return
    }

    const oldColumnId = card.column_id
    card.column_id = targetColumnId
    card.order = targetOrder || generateOrder(board.cards, targetColumnId, cardId)
    card.updated_at = new Date().toISOString()

    console.log('[ProjectStore] moveCard — moving card from column', oldColumnId, 'to', targetColumnId, 'with order', card.order)

    try {
      await saveBoard(board)
      console.log('[ProjectStore] moveCard — saveBoard completed')
    } catch (err) {
      console.error('[ProjectStore] moveCard — saveBoard failed:', err)
      // Revert
      card.column_id = oldColumnId
      throw err
    }
  }

  async function deleteCard(boardId: string, cardId: string) {
    const board = boards.value.find(b => b.id === boardId)
    if (!board) return

    board.cards = board.cards.filter(c => c.id !== cardId)
    await saveBoard(board)
  }

  async function archiveCard(boardId: string, cardId: string) {
    return updateCard(boardId, cardId, {
      archived: true,
      archived_at: new Date().toISOString(),
      status: 'archived'
    })
  }

  function generateOrder(cards: Card[], columnId: string, excludeCardId?: string): string {
    const columnCards = cards
      .filter(c => c.column_id === columnId && c.id !== excludeCardId && !c.archived)
      .sort((a, b) => a.order.localeCompare(b.order))
    
    if (columnCards.length === 0) {
      return 'a'
    }
    
    // Add a new card at the end
    const lastOrder = columnCards[columnCards.length - 1].order
    return incrementOrder(lastOrder)
  }

  function incrementOrder(order: string): string {
    // Simple fractional indexing: a -> b -> c ... z -> aa -> ab
    const chars = order.split('')
    let carry = true
    
    for (let i = chars.length - 1; i >= 0 && carry; i--) {
      const char = chars[i]
      if (char === 'z') {
        chars[i] = 'a'
      } else {
        chars[i] = String.fromCharCode(char.charCodeAt(0) + 1)
        carry = false
      }
    }
    
    if (carry) {
      chars.unshift('a')
    }
    
    return chars.join('')
  }

  return {
    currentProjectId,
    currentProjectMeta,
    boards,
    currentBoardId,
    isLoading,
    error,
    currentBoard,
    currentProjectPath,
    loadProject,
    createBoard,
    saveBoard,
    deleteBoard,
    setCurrentBoard,
    createCard,
    updateCard,
    moveCard,
    deleteCard,
    archiveCard
  }
})
