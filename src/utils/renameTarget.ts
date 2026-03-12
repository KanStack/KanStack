import { cardSlugFromTitle, getNextAvailableSlug } from '@/utils/slug'
import { cardIdFromCardPath, dirnameRelativePath, localCardSlugFromCardPath } from '@/utils/kanbanPath'

export interface RenameTarget {
  path: string
  slug: string
  title: string
}

export function getCardRenameTarget(title: string, currentPath: string, existingPaths: string[]): RenameTarget {
  const normalizedTitle = title.trim()
  const baseSlug = cardSlugFromTitle(normalizedTitle)
  const siblingSlugs = existingPaths
    .filter((path) => path !== currentPath)
    .map((path) => localCardSlugFromCardPath(path))
  const slug = getNextAvailableSlug(baseSlug, siblingSlugs)
  const path = `${dirnameRelativePath(currentPath)}/${slug}.md`

  return {
    title: normalizedTitle,
    slug: cardIdFromCardPath(path),
    path,
  }
}
