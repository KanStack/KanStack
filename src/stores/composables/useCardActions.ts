import type { Ref } from 'vue'
import type { Board, Card } from '@/types'
import { generateOrder } from './useOrderUtils'

export function useCardActions(
  board: Ref<Board | null>,
  saveBoard: () => Promise<void>
) {
  async function createCard(columnId: string, title: string, parentId?: string) {
    if (!board.value) return

    const now = new Date().toISOString()
    const card: Card = {
      id: crypto.randomUUID(),
      column_id: columnId,
      title,
      content: '',
      content_type: 'markdown',
      order: generateOrder(board.value.cards, columnId),
      tags: [],
      priority: 0,
      parent_id: parentId,
      linked_refs: [],
      checklist: [],
      status: 'active',
      archived: false,
      created_at: now,
      updated_at: now,
      metadata: {}
    }

    board.value.cards.push(card)
    await saveBoard()
    return card
  }

  async function updateCard(cardId: string, updates: Partial<Card>) {
    if (!board.value) return

    const card = board.value.cards.find(c => c.id === cardId)
    if (!card) return

    Object.assign(card, updates, { updated_at: new Date().toISOString() })
    await saveBoard()
    return card
  }

  async function moveCard(cardId: string, targetColumnId: string, targetOrder?: string) {
    if (!board.value) { console.error('[CardActions] moveCard: no board'); return }

    const card = board.value.cards.find(c => c.id === cardId)
    if (!card) { console.error('[CardActions] moveCard: card not found', cardId); return }

    const oldColumnId = card.column_id
    card.column_id = targetColumnId
    card.order = targetOrder || generateOrder(board.value.cards, targetColumnId, cardId)
    card.updated_at = new Date().toISOString()

    // Move all child cards to the same column as their parent
    const children = board.value.cards.filter(c => c.parent_id === cardId && !c.archived)
    for (const child of children) {
      child.column_id = targetColumnId
      child.updated_at = new Date().toISOString()
    }

    try {
      await saveBoard()
    } catch (err) {
      card.column_id = oldColumnId
      throw err
    }
  }

  async function deleteCard(cardId: string) {
    if (!board.value) return
    board.value.cards = board.value.cards.filter(c => c.id !== cardId)
    await saveBoard()
  }

  async function archiveCard(cardId: string) {
    return updateCard(cardId, {
      archived: true,
      archived_at: new Date().toISOString(),
      status: 'archived'
    })
  }

  function getCardChildren(parentId: string): Card[] {
    return board.value?.cards.filter(c => c.parent_id === parentId && !c.archived) ?? []
  }

  function getCardById(cardId: string): Card | undefined {
    return board.value?.cards.find(c => c.id === cardId)
  }

  async function setCardParent(cardId: string, parentId: string | null) {
    if (!board.value) { console.error('[CardActions] setCardParent: no board'); return }

    const card = board.value.cards.find(c => c.id === cardId)
    if (!card) { console.error('[CardActions] setCardParent: card not found', cardId); return }
    if (parentId === cardId) { console.error('[CardActions] setCardParent: cannot parent to self'); return }

    if (parentId) {
      if (!board.value.cards.find(c => c.id === parentId)) {
        console.error('[CardActions] setCardParent: parent not found', parentId)
        return
      }
      // Check for circular reference
      const visited = new Set<string>()
      for (let cur: string | undefined = parentId; cur; cur = board.value.cards.find(c => c.id === cur)?.parent_id) {
        if (cur === cardId) { console.error('[CardActions] setCardParent: circular ref'); return }
        if (visited.has(cur)) break
        visited.add(cur)
      }
    }

    card.parent_id = parentId || undefined
    card.updated_at = new Date().toISOString()
    await saveBoard()
  }

  return {
    createCard,
    updateCard,
    moveCard,
    deleteCard,
    archiveCard,
    getCardChildren,
    getCardById,
    setCardParent
  }
}
