import { slugifySegment } from '@/utils/kanbanPath'

export function boardSlugFromTitle(title: string) {
  const slug = slugifySegment(title)

  return slug || 'untitled-board'
}

export function cardSlugFromTitle(title: string) {
  const slug = slugifySegment(title)

  return slug || 'untitled-card'
}

export function getNextAvailableSlug(baseSlug: string, existingSlugs: string[]) {
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug
  }

  let index = 2
  while (existingSlugs.includes(`${baseSlug}-${index}`)) {
    index += 1
  }

  return `${baseSlug}-${index}`
}
