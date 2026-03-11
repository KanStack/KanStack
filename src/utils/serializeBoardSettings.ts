import type { KanbanBoardSettings } from '@docs/schemas/kanban-parser-schema'

const SETTINGS_START = '%% kanban:settings'
const SETTINGS_END = '%%'

export function updateBoardSettingsMarkdown(rawContent: string, settings: KanbanBoardSettings) {
  const cleanedSettings = cleanSettings(settings)
  const serializedSettingsBlock = Object.keys(cleanedSettings).length
    ? [
        SETTINGS_START,
        '```json',
        JSON.stringify(cleanedSettings, null, 2),
        '```',
        SETTINGS_END,
      ].join('\n')
    : ''

  const lines = rawContent.split(/\r?\n/)
  let startIndex = -1
  let endIndex = -1

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== SETTINGS_START) {
      continue
    }

    startIndex = index
    for (let innerIndex = index + 1; innerIndex < lines.length; innerIndex += 1) {
      if (lines[innerIndex].trim() === SETTINGS_END) {
        endIndex = innerIndex
        break
      }
    }
    break
  }

  if (startIndex >= 0 && endIndex >= startIndex) {
    const before = trimTrailingBlankLines(lines.slice(0, startIndex).join('\n'))
    const after = trimLeadingBlankLines(lines.slice(endIndex + 1).join('\n'))
    return joinSections(before, serializedSettingsBlock, after)
  }

  return joinSections(trimTrailingBlankLines(rawContent), serializedSettingsBlock)
}

function joinSections(...sections: string[]) {
  return `${sections.filter(Boolean).join('\n\n').trimEnd()}\n`
}

function trimLeadingBlankLines(value: string) {
  return value.replace(/^(\s*\n)+/, '')
}

function trimTrailingBlankLines(value: string) {
  return value.replace(/(\n\s*)+$/, '')
}

function cleanSettings(settings: KanbanBoardSettings) {
  return Object.fromEntries(Object.entries(settings).filter(([, value]) => value !== undefined)) as KanbanBoardSettings
}
