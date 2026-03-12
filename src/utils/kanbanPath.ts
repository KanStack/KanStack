export interface NormalizedWikiTarget {
  slug: string
  target: string
  title?: string
}

export const DEFAULT_SECTION_KEY = '__default__'

export function slugifySegment(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function slugFromMarkdownPath(path: string) {
  const filename = path.replace(/\\/g, '/').split('/').pop() ?? path
  return filename.replace(/\.md$/, '')
}

export function normalizeRelativePath(path: string) {
  const normalized = path.replace(/\\/g, '/').trim()
  const segments: string[] = []

  for (const segment of normalized.split('/')) {
    if (!segment || segment === '.') {
      continue
    }

    if (segment === '..') {
      if (!segments.length) {
        throw new Error('Relative path escapes the workspace tree.')
      }

      segments.pop()
      continue
    }

    segments.push(segment)
  }

  return segments.join('/')
}

export function tryNormalizeRelativePath(path: string) {
  try {
    return normalizeRelativePath(path)
  } catch {
    return null
  }
}

export function dirnameRelativePath(path: string) {
  const normalized = normalizeRelativePath(path)
  const segments = normalized.split('/')
  segments.pop()
  return segments.join('/')
}

export function joinRelativePath(...parts: string[]) {
  return normalizeRelativePath(parts.filter(Boolean).join('/'))
}

export function relativePathBetween(from: string, to: string) {
  const fromSegments = normalizeRelativePath(from).split('/').filter(Boolean)
  const toSegments = normalizeRelativePath(to).split('/').filter(Boolean)
  let sharedIndex = 0

  while (
    sharedIndex < fromSegments.length
    && sharedIndex < toSegments.length
    && fromSegments[sharedIndex] === toSegments[sharedIndex]
  ) {
    sharedIndex += 1
  }

  return [
    ...Array.from({ length: fromSegments.length - sharedIndex }, () => '..'),
    ...toSegments.slice(sharedIndex),
  ].join('/') || '.'
}

export function boardTodoPathFromBoardPath(path: string) {
  return normalizeRelativePath(path).replace(/\/todo\.md$/i, '')
}

export function boardIdFromBoardPath(path: string) {
  return boardTodoPathFromBoardPath(path)
}

export function cardIdFromCardPath(path: string) {
  return normalizeRelativePath(path).replace(/\.md$/i, '')
}

export function cardPathFromId(cardId: string) {
  return `${normalizeRelativePath(cardId)}.md`
}

export function localCardSlugFromCardPath(path: string) {
  return slugFromMarkdownPath(path)
}

export function localBoardNameFromBoardPath(path: string) {
  const todoPath = boardTodoPathFromBoardPath(path)
  const segments = todoPath.split('/').filter(Boolean)
  const parent = segments.length >= 2 ? segments[segments.length - 2] : null
  return parent ?? segments[segments.length - 1] ?? 'Board'
}

export function resolveBoardTargetPath(boardPath: string, target: string) {
  const normalizedTarget = normalizeWikiTarget(target).target
  const boardProjectPath = dirnameRelativePath(boardTodoPathFromBoardPath(boardPath))
  const candidate = normalizedTarget.endsWith('/todo')
    ? dirnameRelativePath(normalizedTarget)
    : normalizedTarget

  return joinRelativePath(boardProjectPath, candidate)
}

export function resolveCardTargetId(boardPath: string, target: string) {
  const normalizedTarget = normalizeWikiTarget(target).target
  const cardTarget = normalizedTarget.startsWith('cards/') ? normalizedTarget : `cards/${normalizedTarget}`
  return joinRelativePath(boardTodoPathFromBoardPath(boardPath), cardTarget)
}

export function buildSubBoardTarget(boardPath: string, childBoardId: string) {
  const boardProjectPath = dirnameRelativePath(boardTodoPathFromBoardPath(boardPath))
  return relativePathBetween(boardProjectPath, childBoardId)
}

export function buildBoardCardPath(board: { slug: string }, localCardSlug: string) {
  return `${board.slug}/cards/${localCardSlug}.md`
}

export function buildBoardCardTarget(localCardSlug: string) {
  return `cards/${localCardSlug}`
}

export function buildChildBoardPath(parentBoard: { path: string }, directoryName: string) {
  const boardProjectPath = dirnameRelativePath(boardTodoPathFromBoardPath(parentBoard.path))
  return joinRelativePath(boardProjectPath, directoryName, 'TODO', 'todo.md')
}

export function normalizeWikiTarget(value: string): NormalizedWikiTarget {
  const [targetPart, ...titleParts] = value.split('|')
  const normalizedTarget = targetPart
    .trim()
    .replace(/\\/g, '/')
    .replace(/\.md$/, '')
    .replace(/^\.\//, '')
  const title = titleParts.join('|').trim() || undefined

  return {
    slug: normalizedTarget,
    target: normalizedTarget,
    title,
  }
}

export function sectionKeyFromSlug(slug: string | null) {
  return slug ?? DEFAULT_SECTION_KEY
}
