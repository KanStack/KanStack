# Markdown Kanban Design

## Goal

Represent the Kanban board entirely in markdown while keeping board order and card content easy to edit by hand.

## File Layout

- `boards/*.md` stores board definitions
- `cards/*.md` stores one card per file
- board files link to cards with wikilinks like `[[auth]]`

## Board Rules

- board frontmatter stores only lightweight board metadata
- `##` headings define columns
- optional `###` headings inside a column define sections within that column
- bullet order under a column or section defines card order
- each bullet under a column must contain exactly one wikilink
- the board file is the source of truth for column membership and order
- boards may also include a `## Sub Boards` section
- each bullet in `## Sub Boards` links to another board file, preferably with a path like `[[boards/auth-flow]]`
- sub-board order is the bullet order inside `## Sub Boards`

## Section Rules

- sections are optional and exist only inside normal board columns
- use `###` headings for section names, such as `### Auth` or `### UX`
- cards may appear directly under a column or under a section, but using sections consistently is easier to parse
- section order is the heading order inside the column
- card order inside a section is the bullet order under that section
- `## Sub Boards` is not a normal column and should contain board links, not section headings for cards

## Preferences Rules

- board preferences live in a footer comment block using the Obsidian-style `%% kanban:settings` wrapper
- the settings payload is a fenced `json` block so it stays easy to parse and easy to preserve
- example preferences include sort order, grouping mode, card preview mode, empty-column visibility, and list-collapse state
- v2 settings may also include `column-settings`, `defaults`, `inherit`, and `saved-views`
- unknown preferences should be preserved during save so boards can evolve without migrations

## Card Rules

- each card is a standalone markdown file with frontmatter for structured fields
- card body stores description, checklist, notes, and relationships
- card files should not duplicate column status because status comes from board placement
- v2 card frontmatter may include `type`, `estimate`, `owners`, `blocked_by`, `blocks`, `related`, `scheduled`, `started`, and `completed`
- unknown frontmatter keys should be preserved so custom fields like `story_points`, `initiative`, or `parent_card` survive round trips
- relationships between cards can use wikilinks inside sections like `## Depends On` or `## Links`

## Sub-Board Rules

- a sub-board is just another board note referenced from a parent board's `## Sub Boards` section
- sub-boards keep the same schema as any other board and can themselves have `## Sub Boards`
- `parent_board` in frontmatter is optional helper metadata; the parent board link remains the canonical relationship
- use board links for board-to-board relationships and card links for column membership

## Demo Files

- `boards/main.md`
- `boards/auth-flow.md`
- `boards/auth-testing.md`
- `cards/session-model.md`
- `cards/auth.md`
- `cards/filters.md`
- `cards/oauth-spike.md`
- `cards/dnd-polish.md`
- `cards/markdown-parser.md`
- `cards/board-shell.md`
- `cards/password-hashing.md`
- `cards/session-timeout.md`
- `cards/login-errors.md`
- `cards/auth-copy.md`
- `cards/auth-test-matrix.md`

## Parser Schema

- normalized parser target types live in `docs/schemas/kanban-parser-schema.ts`
- parsing and normalization rules are documented in `docs/plans/2026-03-10-markdown-kanban-parser-schema.md`
