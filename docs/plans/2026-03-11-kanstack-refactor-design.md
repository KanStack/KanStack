# KanStack Refactor Design

## Goal

Reduce the highest-risk technical debt in the active app by separating UI orchestration from file persistence, making editor saves reliable, and bringing the live board model back into alignment with the markdown contract.

## Scope

- keep the current markdown-first product shape and UI intact
- refactor the board, workspace, drag, and card editor flows without changing the visible interaction model
- repair the board section contract end-to-end instead of continuing to flatten sections away
- remove duplicated markdown formatting logic where one canonical helper is enough
- add focused automated tests around parser and serializer behavior

## Architecture Direction

### 1. Thin Vue composition surfaces

- `src/App.vue` stays a shell that wires workspace state into feature components
- `src/components/board/BoardCanvas.vue` becomes a composition surface for board view state, board actions, and drag state
- persistence and markdown write logic move into composables or utilities instead of living directly in the component

### 2. Focused feature composables

- `useWorkspace` keeps workspace ownership but splits internal responsibilities into smaller helpers for snapshot application, watch lifecycle, and selection persistence
- `useCardEditor` becomes a small editor session state machine with explicit dirty tracking and queued saves
- board write actions move into a dedicated composable so create, move, and settings updates share one file-write boundary

### 3. Honest markdown contract

- board `###` sections become first-class again in parsing, derived board views, and serialization
- drop targets and board movement logic write to real sections instead of sentinel-only placeholders
- if a board has no named sections in a column, the unnamed section remains supported as the default case

### 4. Shared markdown helpers

- unify board settings block serialization in one helper
- centralize slug and link normalization rules used by parser, workspace indexing, and board mutation logic

## Refactor Plan

### Phase 1: Contract cleanup

- restore section parsing in `src/utils/parseWorkspace.ts`
- preserve sections in `src/utils/serializeBoard.ts`
- update `src/utils/buildBoardView.ts` so board views carry section-aware card placement metadata
- replace duplicated slug/path normalization helpers with shared utilities

### Phase 2: Board action extraction

- create a board actions composable responsible for move, create, and settings persistence
- remove direct Tauri write calls from `src/components/board/BoardCanvas.vue`
- keep `BoardCanvas` focused on computed view state and child event wiring

### Phase 3: Editor reliability

- add save queueing in `src/composables/useCardEditor.ts` so edits made during an in-flight save are flushed afterward
- narrow modal sync logic to stable session identity rather than whole-object watching
- keep autosave behavior the same from the user perspective

### Phase 4: Workspace and drag lifecycle hardening

- make workspace watch replacement explicit when the root path changes
- reduce `useWorkspace` helper duplication and move signature/indexing logic into focused functions
- guarantee `useBoardPointerDrag.ts` cleans up pointer state, ghost DOM, animation frames, and `document.body` mutations on end and unmount

### Phase 5: Verification

- add parser/serializer tests for section round-tripping and settings preservation
- add board serialization tests for moves across columns and sections
- run `npm run build`
- run `cargo check --manifest-path src-tauri/Cargo.toml`

## Data Flow

- props still flow down from `App.vue`
- board child components emit UI intents up
- `BoardCanvas` translates those intents into board actions through a composable API
- board actions produce full markdown writes and then rely on the existing workspace refresh path
- card editor writes stay local to the current session and flush through one queued save path

## Safety Rules

- no destructive git or workspace operations
- preserve existing board file formatting conventions where possible
- keep section writes stable for both named and unnamed sections
- prefer small, typed helpers over new global stores

## Success Criteria

- board section headings survive parse -> edit -> serialize round trips
- creating or moving cards works through extracted board actions without changing UX
- card autosave never drops the latest local draft when edits happen during a save
- switching workspaces cleanly replaces the watcher without relying on implicit backend behavior
- drag cleanup leaves no ghost element or stale body styles behind
