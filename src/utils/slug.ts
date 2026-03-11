export function cardSlugFromTitle(title: string) {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

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
