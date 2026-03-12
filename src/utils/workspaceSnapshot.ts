import type { LoadedWorkspace, WorkspaceSnapshot } from '@/types/workspace'
import { parseWorkspace } from '@/utils/parseWorkspace'
import { slugFromMarkdownPath } from '@/utils/kanbanPath'

export function buildLoadedWorkspace(snapshot: WorkspaceSnapshot): LoadedWorkspace {
  const parseResult = parseWorkspace(snapshot)
  const boardsBySlug = Object.fromEntries(parseResult.boards.map((board) => [board.slug, board]))
  const boardFilesBySlug = Object.fromEntries(
    snapshot.boards.map((boardFile) => [slugFromMarkdownPath(boardFile.path), boardFile]),
  )
  const cardsBySlug = Object.fromEntries(parseResult.cards.map((card) => [card.slug, card]))
  const boardOrder = parseResult.boards.map((board) => board.slug)

  return {
    rootPath: snapshot.rootPath,
    snapshot,
    parseResult,
    boardsBySlug,
    boardFilesBySlug,
    cardsBySlug,
    boardOrder,
  }
}

export function createWorkspaceSnapshotSignature(snapshot: WorkspaceSnapshot) {
  return JSON.stringify({
    boards: snapshot.boards,
    cards: snapshot.cards,
  })
}
