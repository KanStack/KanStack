import { boardSlugFromTitle, cardSlugFromTitle, getNextAvailableSlug } from '@/utils/slug'

export interface RenameTarget {
  path: string
  slug: string
  title: string
}

export function getBoardRenameTarget(title: string, currentSlug: string, existingSlugs: string[]) {
  return getRenameTarget(title, currentSlug, existingSlugs, boardSlugFromTitle, 'boards')
}

export function getCardRenameTarget(title: string, currentSlug: string, existingSlugs: string[]) {
  return getRenameTarget(title, currentSlug, existingSlugs, cardSlugFromTitle, 'cards')
}

function getRenameTarget(
  title: string,
  currentSlug: string,
  existingSlugs: string[],
  slugFromTitle: (title: string) => string,
  directory: 'boards' | 'cards',
): RenameTarget {
  const normalizedTitle = title.trim()
  const baseSlug = slugFromTitle(normalizedTitle)
  const siblingSlugs = existingSlugs.filter((slug) => slug !== currentSlug)
  const slug = getNextAvailableSlug(baseSlug, siblingSlugs)

  return {
    title: normalizedTitle,
    slug,
    path: `${directory}/${slug}.md`,
  }
}
