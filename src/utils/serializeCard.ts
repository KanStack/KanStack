import { stringify } from 'yaml'

import type { KanbanCardMetadata, MarkdownValue } from '@docs/schemas/kanban-parser-schema'

export interface CardSerializeInput {
  body: string
  metadata: KanbanCardMetadata
  title: string
}

export function serializeCardMarkdown(input: CardSerializeInput) {
  const title = input.title.trim()
  const metadata = cleanRecord({
    ...input.metadata,
    title
  })
  const frontmatter = stringify(metadata, {
    lineWidth: 0,
    simpleKeys: true
  }).trimEnd()
  const trimmedBody = input.body.trimEnd()
  const sections = [`---\n${frontmatter}\n---`, `# ${title}`]

  if (trimmedBody) {
    sections.push(trimmedBody)
  }

  return `${sections.join('\n\n')}\n`
}

function cleanRecord(record: Record<string, MarkdownValue | undefined>) {
  return Object.fromEntries(
    Object.entries(record)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, cleanValue(value)])
      .filter(([, value]) => value !== undefined)
  )
}

function cleanValue(value: MarkdownValue | undefined): MarkdownValue | undefined {
  if (value === undefined || value === null) {
    return value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? trimmed : undefined
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    const entries = value
      .map((entry) => cleanValue(entry))
      .filter((entry): entry is MarkdownValue => entry !== undefined)

    return entries.length ? entries : undefined
  }

  const nested = cleanRecord(value)
  return Object.keys(nested).length ? nested : undefined
}
