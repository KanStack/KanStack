import { parse as parseYaml } from 'yaml'

import type {
  KanbanBoardDocument,
  KanbanBoardLink,
  KanbanBoardSettings,
  KanbanCardDocument,
  KanbanCardLink,
  KanbanCardMetadata,
  KanbanCardSection,
  KanbanChecklistItem,
  KanbanColumn,
  KanbanDiagnostic,
  KanbanParseResult,
  MarkdownRecord,
  MarkdownValue
} from '@docs/schemas/kanban-parser-schema'
import type { WorkspaceSnapshot } from '@/types/workspace'
import { normalizeWikiTarget, slugFromMarkdownPath, slugifySegment } from '@/utils/kanbanPath'

export function parseWorkspace(snapshot: WorkspaceSnapshot): KanbanParseResult {
  const boards = snapshot.boards.map((file) => parseBoardFile(file.path, file.content))
  const cards = snapshot.cards.map((file) => parseCardFile(file.path, file.content))

  return {
    version: 'kanban-parser/v1',
    boards,
    cards,
    diagnostics: [...boards.flatMap((board) => board.diagnostics), ...cards.flatMap((card) => card.diagnostics)]
  }
}

function parseBoardFile(path: string, rawContent: string): KanbanBoardDocument {
  const diagnostics: KanbanDiagnostic[] = []
  const parsed = parseFrontmatter(rawContent, path, diagnostics)
  const slug = slugFromMarkdownPath(path)
  const frontmatter = toMarkdownRecord(parsed.data)
  const title = readString(frontmatter.title) ?? readHeading(parsed.content, '# ') ?? titleFromSlug(slug)
  const lines = parsed.content.split(/\r?\n/)
  const columns: KanbanColumn[] = []
  const subBoards: KanbanBoardLink[] = []
  const settingsLines: string[] = []

  let currentColumn: KanbanColumn | null = null
  let currentSectionIndex: number | null = null
  let inSubBoards = false
  let inSettings = false

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim()

    if (trimmed === '%% kanban:settings') {
      inSettings = true
      continue
    }

    if (inSettings) {
      if (trimmed === '%%') {
        inSettings = false
        continue
      }

      settingsLines.push(line)
      continue
    }

    if (line.startsWith('## ')) {
      const headingName = line.slice(3).trim()
      if (headingName === 'Sub Boards') {
        inSubBoards = true
        currentColumn = null
        currentSectionIndex = null
        continue
      }

      inSubBoards = false
      currentColumn = {
        name: headingName,
        slug: slugifySegment(headingName),
        index: columns.length,
        sections: []
      }
      currentSectionIndex = null
      columns.push(currentColumn)
      continue
    }

    if (line.startsWith('### ') && currentColumn) {
      const headingName = line.slice(4).trim()
      const section = {
        name: headingName,
        slug: slugifySegment(headingName) || null,
        index: currentColumn.sections.length,
        cards: [] as KanbanCardLink[]
      }
      currentColumn.sections.push(section)
      currentSectionIndex = currentColumn.sections.length - 1
      continue
    }

    const wikiTarget = parseBulletWikiLink(trimmed)
    if (!wikiTarget) {
      continue
    }

    if (inSubBoards) {
      subBoards.push(wikiTarget)
      continue
    }

    if (!currentColumn) {
      diagnostics.push({
        level: 'warning',
        code: 'board.card-outside-column',
        message: 'Card links should appear inside a board column.',
        path,
        line: index + 1,
        column: 1
      })
      continue
    }

    getActiveSection(currentColumn, currentSectionIndex).cards.push(wikiTarget)
  }

  if (columns.length === 0) {
    diagnostics.push({
      level: 'warning',
      code: 'board.no-columns',
      message: 'Board does not contain any `##` columns.',
      path
    })
  }

  const settings = parseBoardSettings(settingsLines, path, diagnostics)

  return {
    kind: 'board',
    slug,
    path,
    title,
    frontmatter,
    columns,
    subBoards,
    settings,
    diagnostics
  }
}

function parseCardFile(path: string, rawContent: string): KanbanCardDocument {
  const diagnostics: KanbanDiagnostic[] = []
  const parsed = parseFrontmatter(rawContent, path, diagnostics)
  const slug = slugFromMarkdownPath(path)
  const metadata = toMarkdownRecord(parsed.data) as KanbanCardMetadata
  const title = readString(metadata.title) ?? readHeading(parsed.content, '# ') ?? titleFromSlug(slug)
  const body = stripLeadingTitle(parsed.content, title).trim()
  const sections = parseCardSections(body)

  return {
    kind: 'card',
    slug,
    path,
    title,
    metadata,
    body,
    sections,
    checklist: extractChecklist(body),
    wikilinks: extractWikilinks(body),
    diagnostics
  }
}

function parseCardSections(body: string): KanbanCardSection[] {
  const sections: KanbanCardSection[] = []
  const lines = body.split(/\r?\n/)
  let currentName: string | null = null
  let currentLines: string[] = []

  const flush = () => {
    if (!currentName) {
      return
    }

    const markdown = currentLines.join('\n').trim()
    sections.push({
      name: currentName,
      slug: slugifySegment(currentName),
      index: sections.length,
      markdown,
      checklist: extractChecklist(markdown),
      wikilinks: extractWikilinks(markdown)
    })
  }

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flush()
      currentName = line.slice(3).trim()
      currentLines = []
      continue
    }

    if (currentName) {
      currentLines.push(line)
    }
  }

  flush()
  return sections
}

function parseBoardSettings(
  settingsLines: string[],
  path: string,
  diagnostics: KanbanDiagnostic[]
): KanbanBoardSettings | null {
  if (settingsLines.length === 0) {
    return null
  }

  const settingsBlock = settingsLines.join('\n')
  const match = settingsBlock.match(/```json\s*([\s\S]*?)```/)
  const jsonSource = match?.[1]?.trim() ?? settingsBlock.trim()

  if (!jsonSource) {
    return null
  }

  try {
    return JSON.parse(jsonSource) as KanbanBoardSettings
  } catch {
    diagnostics.push({
      level: 'warning',
      code: 'board.invalid-settings',
      message: 'Board settings JSON could not be parsed.',
      path
    })
    return null
  }
}

function getActiveSection(column: KanbanColumn, currentSectionIndex: number | null) {
  if (currentSectionIndex !== null) {
    const activeSection = column.sections[currentSectionIndex]
    if (activeSection) {
      return activeSection
    }
  }

  return ensureUnnamedSection(column)
}

function ensureUnnamedSection(column: KanbanColumn) {
  const unnamedSection = column.sections.find((section) => section.name === null && section.slug === null)

  if (unnamedSection) {
    return unnamedSection
  }

  const section = {
    name: null,
    slug: null,
    index: column.sections.length,
    cards: [] as KanbanCardLink[]
  }
  column.sections.push(section)
  return section
}

function parseBulletWikiLink(line: string): KanbanCardLink | null {
  const match = line.match(/^[-*]\s+\[\[([^\]]+)\]\]/)
  if (!match) {
    return null
  }

  return normalizeWikiTarget(match[1])
}

function extractChecklist(markdown: string): KanbanChecklistItem[] {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.match(/^[-*]\s+\[( |x|X)\]\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({
      checked: match[1].toLowerCase() === 'x',
      text: match[2].trim()
    }))
}

function extractWikilinks(markdown: string): string[] {
  return Array.from(markdown.matchAll(/\[\[([^\]]+)\]\]/g), (match) => normalizeWikiTarget(match[1]).slug)
}

function parseFrontmatter(content: string, path: string, diagnostics: KanbanDiagnostic[]) {
  if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) {
    return { data: {}, content }
  }

  const lines = content.split(/\r?\n/)
  let closingIndex = -1

  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index].trim() === '---') {
      closingIndex = index
      break
    }
  }

  if (closingIndex === -1) {
    diagnostics.push({
      level: 'warning',
      code: 'frontmatter.unclosed',
      message: 'Frontmatter starts with `---` but never closes.',
      path,
      line: 1,
      column: 1
    })

    return { data: {}, content }
  }

  const frontmatterSource = lines.slice(1, closingIndex).join('\n')
  const body = lines.slice(closingIndex + 1).join('\n')

  if (!frontmatterSource.trim()) {
    return { data: {}, content: body }
  }

  try {
    const parsed = parseYaml(frontmatterSource)
    return { data: toMarkdownRecord(parsed), content: body }
  } catch {
    diagnostics.push({
      level: 'warning',
      code: 'frontmatter.invalid',
      message: 'Frontmatter YAML could not be parsed.',
      path,
      line: 1,
      column: 1
    })

    return { data: {}, content: body }
  }
}

function toMarkdownRecord(source: unknown): MarkdownRecord {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [key, normalizeMarkdownValue(value)])
  ) as MarkdownRecord
}

function normalizeMarkdownValue(value: unknown): MarkdownValue | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeMarkdownValue(entry) ?? null)
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeMarkdownValue(entry)])
    )
  }

  return String(value)
}

function readHeading(content: string, prefix: string): string | null {
  const line = content.split(/\r?\n/).find((entry) => entry.startsWith(prefix))
  return line ? line.slice(prefix.length).trim() : null
}

function readString(value: MarkdownValue | undefined): string | null {
  return typeof value === 'string' ? value : null
}

function stripLeadingTitle(content: string, title: string): string {
  const lines = content.split(/\r?\n/)
  let firstContentLineIndex = 0

  while (firstContentLineIndex < lines.length && lines[firstContentLineIndex].trim() === '') {
    firstContentLineIndex += 1
  }

  if (lines[firstContentLineIndex]?.trim() === `# ${title}`) {
    const remainingLines = lines.slice(firstContentLineIndex + 1)

    while (remainingLines[0]?.trim() === '') {
      remainingLines.shift()
    }

    return remainingLines.join('\n')
  }

  return content
}

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ')
}
