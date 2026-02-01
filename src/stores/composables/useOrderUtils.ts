import type { Card } from '@/types'

export function generateOrder(cards: Card[], columnId: string, excludeCardId?: string): string {
  const columnCards = cards
    .filter(c => c.column_id === columnId && c.id !== excludeCardId && !c.archived)
    .sort((a, b) => a.order.localeCompare(b.order))

  if (columnCards.length === 0) return 'a'
  return incrementOrder(columnCards[columnCards.length - 1].order)
}

export function incrementOrder(order: string): string {
  const chars = order.split('')
  let carry = true

  for (let i = chars.length - 1; i >= 0 && carry; i--) {
    if (chars[i] === 'z') {
      chars[i] = 'a'
    } else {
      chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1)
      carry = false
    }
  }

  if (carry) chars.unshift('a')
  return chars.join('')
}

/**
 * Generates an order string that falls between two existing order strings.
 * This is used when inserting a card between two other cards during drag-and-drop reordering.
 * Uses a base-26 (a-z) numbering system with automatic digit extension.
 */
export function getOrderBetween(before: string | null, after: string | null): string {
  // If no bounds, start with 'a'
  if (!before && !after) return 'a'

  // If only before, increment it
  if (before && !after) return incrementOrder(before)

  // If only after, decrement it (or use 'a' if at minimum)
  if (!before && after) {
    const chars = after.split('')
    let borrow = true

    for (let i = chars.length - 1; i >= 0 && borrow; i--) {
      if (chars[i] === 'a') {
        chars[i] = 'z'
      } else {
        chars[i] = String.fromCharCode(chars[i].charCodeAt(0) - 1)
        borrow = false
      }
    }

    // If we borrowed all the way through, the result has one fewer leading 'z'
    if (borrow) {
      chars.shift()
    }

    const result = chars.join('')
    return result || 'a'
  }

  // Both bounds exist - find middle value
  const beforeChars = before!.split('')
  const afterChars = after!.split('')

  // Pad shorter string to match length
  const maxLen = Math.max(beforeChars.length, afterChars.length)
  while (beforeChars.length < maxLen) beforeChars.push('a')
  while (afterChars.length < maxLen) afterChars.push('a')

  // Compare and find middle
  for (let i = 0; i < maxLen; i++) {
    const beforeCode = beforeChars[i].charCodeAt(0)
    const afterCode = afterChars[i].charCodeAt(0)

    if (beforeCode < afterCode) {
      // There's room between these characters
      const midCode = Math.floor((beforeCode + afterCode) / 2)
      return beforeChars.slice(0, i).join('') + String.fromCharCode(midCode) + beforeChars.slice(i + 1).join('')
    } else if (beforeCode > afterCode) {
      // We need to extend - this shouldn't happen with properly sorted data
      break
    }
    // If equal, continue to next character
  }

  // Strings are equal or too close - extend with middle character
  return before! + 'm'
}
