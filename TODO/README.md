# TODO KanStack

This folder is the KanStack workspace for agent-driven work.

## What lives here

- `todo.md`: the board that tracks active work
- `cards/*.md`: one markdown file per task/card
- `lessons.md`: reusable lessons captured after correction loops
- 
## Workflow rules

- Create or update a card here for any non-trivial task.
- Keep the card in `Backlog` while planning.
- Move it to `In Progress` when implementation starts.
- Move it to `Review` when coding is done and verification is next.
- Do not move cards to `Done`; that is for the human reviewer.
- Update cards after corrections so the same mistake does not repeat.

## Quick start

1. Open or edit `TODO/todo.md`.
2. Add a wikilink for your card under `Backlog`.
3. Create `TODO/cards/<slug>.md` for the work.
4. Put the spec and checkable steps in the card before coding.
5. Keep the board column and the card checklist updated as work progresses.

## Board structure

- Board placement is canonical: the board file controls column order, section order, and card status.
- The canonical board file for a board root is `todo.md`.
- Set the board title in frontmatter `title`; a first `#` heading can also supply the title if needed.
- Use `##` headings for columns like `Backlog`, `In Progress`, `Review`, `Done`, and `Archive`.
- Use optional `###` headings for sections inside a column.
- Cards can appear directly under a column or inside a `###` section; direct cards become the unnamed default section.
- Use `## Sub Boards` only for board links, not card links.
- The current serializers usually place the `%% kanban:settings` JSON block immediately after frontmatter.

## Full board example

Use this when you want a board example that matches the current app and parser behavior:

````md
---
title: Product Board
---

%% kanban:settings
```json
{
  "show-sub-boards": true,
  "show-archive-column": false
}
```
%%

## Backlog

- [[plan-next-release]]

### UX Polish

- [[polish-keyboard-shortcuts]]
- [[improve-new-card-flow]]

## In Progress

- [[stabilize-watch-mode]]

## Review

- [[qa-smoke-pass]]

## Done

- [[ship-markdown-parser]]

## Archive

- [[retire-old-demo-data]]

## Sub Boards

- [[release-readiness/TODO|Release Readiness]]
````

Board notes:

- Keep one bullet per linked card or sub-board.
- Match each card wikilink slug to the card filename.
- `## Sub Boards` is special; it is not a normal card column.
- `show-sub-boards` controls rolled-up descendant cards in the board view; `## Sub Boards` still stores the canonical relative `TODO/` paths.
- The current app usually writes the settings block near the top, after frontmatter, and can append one when adding settings to a board that did not already have a block.
- Unknown settings keys are preserved when the board is parsed and serialized.

## Board settings today

- Active in the app today: `show-sub-boards`, `show-archive-column`
- Global render sorting/filtering now lives in the machine-local app `config.md`, not inside board markdown
- Parsed and preserved today: `group-by`, `show-empty-columns`, `card-preview`, `list-collapse`, `column-settings`, plus unknown custom keys
- `group-by`: `none`, `section`, `assignee`, `priority`, `type`, `due`
- `card-preview`: `none`, `metadata`, `body`
- `column-settings` are keyed by column slug and support `wip-limit`, `collapsed`, `default-section`, `hidden`
- Older proposal docs may mention broader settings, but the current shipped contract is the list above plus preserved custom keys

## Card structure

- Card frontmatter is the structured metadata source.
- The card title should stay aligned between frontmatter `title` and the `#` heading.
- Use `##` sections for planning content like spec, context, checklist, review notes, and verification.
- Checklist items are first-class data wherever they appear in the card.
- Wikilinks in markdown body and `##` sections are extracted; relationship fields in frontmatter are preserved as metadata.

## Full card example

Use this when you want a card example that matches the current editor and file format:

```md
---
title: README Schema Coverage
type: feature
priority: high
tags:
  - docs
  - workflow
assignee: Galen
estimate: 3
---

# README Schema Coverage

Refresh the local KanStack README so new tasks have accurate examples for boards, cards, optional metadata, and settings.

## Spec

- Cover the supported board structure and actual current settings behavior.
- Match the fields the current editor can edit directly.
- Keep the examples easy to copy into `TODO/`.

## Context

This work builds on [[bootstrap-todo-kanstack]] and should stay aligned with the active schema docs.

## Checklist

- [x] Review `docs/schemas/kanban-parser-schema.ts`
- [x] Identify missing board and card fields in `TODO/README.md`
- [ ] Update the examples and guidance
- [ ] Verify the final examples render cleanly

## Review Notes

- Added a board example that matches the current parser and app behavior.
- Added a card example that matches the current editor fields and file format.

## Verification

- [ ] Compare the README examples against the schema
- [ ] Open the board/card in the app and spot-check the structure
```

Card notes:

- Keep the filename slug simple, for example `readme-schema-coverage.md`.
- Unknown frontmatter keys are preserved, so custom fields like `story_points` or external IDs are safe.
- Long-form sections are encouraged; cards hold the planning detail while boards hold status and ordering.
- The stored card `body` excludes the canonical `# title` heading because the serializer writes that heading separately.

## Card metadata today

- Editable in the current card editor: `title`, `type`, `priority`, `assignee`, `due`, `tags`, `estimate`, `body`
- Parsed and preserved by the file format: `owners`, `due`, `blocked_by`, `blocks`, `related`, `scheduled`, `started`, `completed`, `template`
- `type`: `task`, `bug`, `feature`, `research`, `chore`
- `priority`: `low`, `medium`, `high`
- Relationship fields use card slugs, for example `blocked_by`, `blocks`, and `related`.
- Common preserved custom fields: `story_points`, sprint IDs, external issue IDs, team-specific notes
- `due` should use a local datetime string in `YYYY-MM-DDTHH:mm` format
- Other optional dates should use a consistent string format such as `YYYY-MM-DD`
