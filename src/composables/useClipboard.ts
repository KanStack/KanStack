import { shallowRef } from 'vue'
import { parse as parseYaml } from 'yaml'

import type { KanbanCardDocument, KanbanCardMetadata } from '@docs/schemas/kanban-parser-schema'
import { serializeCardMarkdown } from '@/utils/serializeCard'

export interface ClipboardCardData {
  title: string
  metadata: KanbanCardMetadata
  body: string
}

const CARD_BOUNDARY = '\n\n---\n---\n'

export function useClipboard() {
  const hasCardData = shallowRef(false)

  async function readClipboardText(): Promise<string> {
    try {
      return await navigator.clipboard.readText()
    } catch (error) {
      console.error('Failed to read clipboard:', error)
      return ''
    }
  }

  async function writeClipboardText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (error) {
      console.error('Failed to write clipboard:', error)
      return false
    }
  }

  function serializeCards(cards: KanbanCardDocument[]): string {
    return cards
      .map((card) => serializeCardMarkdown({
        title: card.title,
        metadata: card.metadata,
        body: card.body,
      }))
      .join(CARD_BOUNDARY)
  }

  function parseClipboardCards(text: string): ClipboardCardData[] {
    const trimmed = text.trim()
    if (!trimmed) {
      return []
    }

    const cardBlocks = trimmed.split(/\n\n---\n---\n/)
    const cards: ClipboardCardData[] = []

    for (const block of cardBlocks) {
      const parsed = parseCardMarkdown(block.trim())
      if (parsed) {
        cards.push(parsed)
      }
    }

    return cards
  }

  function parseCardMarkdown(markdown: string): ClipboardCardData | null {
    const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    
    if (!frontmatterMatch) {
      return {
        title: 'Untitled Card',
        metadata: {},
        body: markdown,
      }
    }

    const [, frontmatterText, bodyWithHeader] = frontmatterMatch

    try {
      const parsed = parseYaml(frontmatterText) as Record<string, unknown> | null
      if (!parsed || typeof parsed !== 'object') {
        return null
      }

      const metadata: KanbanCardMetadata = {}
      const title = typeof parsed.title === 'string' ? parsed.title : 'Untitled Card'
      if (typeof parsed.type === 'string') metadata.type = parsed.type as KanbanCardMetadata['type']
      if (typeof parsed.priority === 'string') metadata.priority = parsed.priority as KanbanCardMetadata['priority']
      if (Array.isArray(parsed.tags)) metadata.tags = (parsed.tags as unknown[]).filter((t): t is string => typeof t === 'string')
      if (typeof parsed.assignee === 'string') metadata.assignee = parsed.assignee
      if (typeof parsed.due === 'string') metadata.due = parsed.due
      if (typeof parsed.estimate === 'number') metadata.estimate = parsed.estimate
      if (Array.isArray(parsed.blocked_by)) metadata.blocked_by = (parsed.blocked_by as unknown[]).filter((t): t is string => typeof t === 'string')
      if (Array.isArray(parsed.blocks)) metadata.blocks = (parsed.blocks as unknown[]).filter((t): t is string => typeof t === 'string')
      if (Array.isArray(parsed.related)) metadata.related = (parsed.related as unknown[]).filter((t): t is string => typeof t === 'string')

      const body = bodyWithHeader
        .replace(/^\s*#\s+[^\n]*\n+/, '')
        .trim()

      return {
        title,
        metadata,
        body,
      }
    } catch {
      return null
    }
  }

  async function copyCards(cards: KanbanCardDocument[]): Promise<boolean> {
    if (cards.length === 0) {
      return false
    }

    const markdown = serializeCards(cards)
    const success = await writeClipboardText(markdown)
    
    if (success) {
      hasCardData.value = true
    }
    
    return success
  }

  async function checkClipboardForCards(): Promise<boolean> {
    const text = await readClipboardText()
    const cards = parseClipboardCards(text)
    hasCardData.value = cards.length > 0
    return hasCardData.value
  }

  async function getClipboardCards(): Promise<ClipboardCardData[]> {
    const text = await readClipboardText()
    return parseClipboardCards(text)
  }

  return {
    hasCardData,
    copyCards,
    checkClipboardForCards,
    getClipboardCards,
    serializeCards,
    parseClipboardCards,
  }
}
