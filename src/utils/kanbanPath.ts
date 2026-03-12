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

export function normalizeWikiTarget(value: string): NormalizedWikiTarget {
  const [targetPart, ...titleParts] = value.split('|')
  const normalizedTarget = targetPart
    .trim()
    .replace(/\\/g, '/')
    .replace(/\.md$/, '')
    .replace(/^\.\//, '')
  const slug = normalizedTarget.replace(/^boards\//, '').replace(/^cards\//, '')
  const title = titleParts.join('|').trim() || undefined

  return {
    slug,
    target: normalizedTarget,
    title,
  }
}

export function sectionKeyFromSlug(slug: string | null) {
  return slug ?? DEFAULT_SECTION_KEY
}
