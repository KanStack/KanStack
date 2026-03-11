# Kanstack Editing Design

## Goal

Add editing to `kanstack` without breaking the markdown-first model or introducing a heavy client architecture.

## Core Rules

- card content lives in `cards/*.md`
- board placement and ordering live in `boards/*.md`
- content edits only write card files
- move and reorder actions only write board files
- the filesystem remains the source of truth and the watcher refreshes the UI after writes

## Scope

- edit card title
- edit core metadata such as `type`, `priority`, `assignee`, `tags`, and `estimate`
- edit the markdown body of a card
- move cards between columns and sections
- reorder cards within a section
- reorder sub-boards with simple controls

## Out of Scope

- inline editing directly on the board canvas
- simultaneous multi-card editing
- arbitrary board structure editing in v1
- optimistic merge logic
- multi-user conflict resolution

## UX Shape

### Card Editing

- click a card to open a modal editor
- modal shows a small structured form for common metadata
- modal includes a raw markdown textarea for the card body
- save writes the full card file atomically
- cancel closes the modal without writing

### Board Moves

- drag and drop moves cards between columns and sections
- drag and drop also supports reorder within the same section
- sub-boards use simple up/down controls instead of drag and drop in v1
- move actions write the full board file atomically

## Data Flow

- UI opens an editor or move interaction
- frontend converts the current normalized model into a small edit payload
- Tauri command writes the target markdown file
- existing file watcher emits a workspace change event
- frontend reloads the workspace from disk and re-renders

## Serialization Strategy

### Card Files

- parse current card markdown into frontmatter and body
- replace approved editable metadata keys
- replace body markdown
- serialize frontmatter first, then the markdown body
- preserve the overall card file layout shape

### Board Files

- parse the current board markdown into normalized sections and card links
- move or reorder the target wikilink bullet
- serialize the board back using the existing heading structure
- keep settings blocks and sub-board sections intact

## Architecture

- `src/components/card/CardEditorModal.vue` for the editing UI
- `src/composables/useCardEditor.ts` for local edit state and save flow
- `src/utils/serializeCard.ts` for card markdown writes
- `src/utils/serializeBoard.ts` for board markdown writes
- new Tauri commands for `save_card_file` and `save_board_file`
- board move actions live close to the board components, not in a global store

## Error Handling

- failed writes show a simple error state in the modal or action surface
- frontend does not mutate persisted state until the file write succeeds
- if the watcher refresh reveals a changed file shape, disk wins and UI reloads from disk

## Testing and Verification

- verify card edits persist to the correct `cards/*.md` file
- verify moving a card only changes the target `boards/*.md` file
- verify reordering sub-boards only changes the `## Sub Boards` block
- verify watcher-driven refresh updates the UI after save
- run `npm run build` and `cargo check --manifest-path src-tauri/Cargo.toml`
