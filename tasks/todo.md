- [x] Review current repo context and previous markdown board direction
- [x] Create initial single-file markdown board demo
- [x] Revise schema for card-per-file markdown architecture
- [x] Clarify how much data the board file should hold versus each card file
- [x] Propose updated layout using wikilinks like `[[card]]`
- [x] Add review notes after the revised design is approved
- [x] Review current board-per-file markdown layout for sub-board impact
- [x] Clarify the intended meaning of sub boards in the markdown model
- [x] Propose a sub-board design that stays fully markdown-native
- [x] Update the demo files and design doc for sub-board support
- [x] Review how sections can fit inside columns without breaking board links
- [x] Extend the board markdown design to support per-column sections
- [x] Update the demo boards and design doc for column sections
- [x] Review where board-level preferences fit in the markdown layout
- [x] Add a dedicated preferences section to each demo board
- [x] Update the design doc for board preferences
- [x] Review the provided Obsidian-style board example
- [x] Move board preferences to a footer settings block
- [x] Update the design doc to use `%% kanban:settings` JSON preferences
- [x] Remove unnecessary `kanban-plugin: board` frontmatter from demo boards
- [x] Review the current schema before proposing a focused v2
- [x] Define a focused v2 feature set for boards, columns, and cards
- [x] Write the v2 schema proposal to `docs/plans`
- [x] Update the demo boards to use v2 footer settings
- [x] Update the demo cards to use v2 frontmatter metadata
- [x] Refresh the current schema notes to mention implemented v2 fields
- [x] Remove explicit card ID prefixes from the demo schema
- [x] Define a parser schema for normalized board and card output
- [x] Add the parser schema doc and type definitions to `docs`

## Review

- Replaced the earlier single-file demo with a board-plus-card-files structure.
- Added `boards/main.md` as the canonical board ordering file using `[[card]]` links only.
- Added demo card notes in `cards/` with frontmatter, checklists, and relationship sections.
- Wrote the revised schema summary to `docs/plans/2026-03-10-markdown-kanban-design.md`.
- Added `## Sub Boards` support so any board can link to child boards with wikilinks.
- Added demo child boards in `boards/auth-flow.md` and `boards/auth-testing.md`.
- Added optional `###` section headings inside columns so cards can be grouped within a column.
- Replaced the top-level preferences section with a footer `%% kanban:settings` JSON block inspired by the provided Obsidian Kanban format.
- Removed unnecessary `kanban-plugin: board` frontmatter from board files.
- Added a focused v2 proposal covering richer card metadata, column settings, saved views, defaults, inheritance, and custom fields in `docs/plans/2026-03-10-markdown-kanban-v2-proposal.md`.
- Updated the demo boards to use v2 settings such as `column-settings`, `defaults`, `inherit`, `saved-views`, and badge preferences.
- Updated the demo cards to use v2 metadata such as `type`, `estimate`, `owners`, dependency fields, scheduling dates, and custom fields.
- Removed `K-###` card IDs from filenames, wikilinks, and relationship fields in favor of clean slugs like `auth` and `session-model`.
- Added normalized parser target types in `docs/schemas/kanban-parser-schema.ts` and parsing rules in `docs/plans/2026-03-10-markdown-kanban-parser-schema.md`.

## Frontend Brainstorm

- [x] Explore current repo context, existing board markdown, and prior frontend code
- [x] Clarify the frontend target and success criteria
- [x] Propose UI approaches for a simple board renderer with an OpenCode.ai aesthetic
- [x] Present the recommended frontend design for approval
- [x] Write the approved design doc to `docs/plans`
- [x] Convert the design into an implementation plan

## Frontend Implementation

- [x] Scaffold a fresh root Vue 3 + TypeScript + Tauri 2 app with minimal dependencies
- [x] Implement workspace loading against the schema in `docs/schemas/kanban-parser-schema.ts`
- [x] Build a modular minimal UI for board selection, board columns, and card details
- [x] Verify with `npm run build` and `cargo check --manifest-path src-tauri/Cargo.toml`

## Frontend Review

- Added the approved minimal frontend design to `docs/plans/2026-03-10-kanstack-frontend-design.md`.
- Scaffolded a new root Vue + Tauri app with a single-header shell and no router or global store.
- Implemented workspace loading from a local folder and parsed boards/cards to the canonical schema in `docs/schemas/kanban-parser-schema.ts`.
- Built a minimal OpenCode-inspired board renderer with modular components in `src/components/` and a simple card detail modal.
- Verified the frontend with `npm run build` and the desktop shell with `cargo check --manifest-path src-tauri/Cargo.toml`.

## Frontend Bugfix Review

- Replaced `gray-matter` with a browser-safe frontmatter splitter plus `yaml` parsing to remove the runtime `Buffer` dependency in the WebView frontend.
- Kept the parser aligned to `docs/schemas/kanban-parser-schema.ts` while preserving the same board/card normalization flow.
- Re-verified the fix with `npm run build` and `cargo check --manifest-path src-tauri/Cargo.toml`.

## Layout Bugfix Review

- Fixed column/card overflow by making the board rail fill the available height and letting each column body scroll internally.
- Added the required `min-height: 0` flex constraints in `src/components/board/BoardCanvas.vue` and `src/components/board/BoardColumn.vue`.
- Re-verified the layout fix with `npm run build`.

## Workspace Watch

- [x] Plan a minimal markdown change-watching approach for the current workspace loader
- [x] Implement automatic workspace refresh when board/card markdown files change
- [x] Verify the watcher flow with `npm run build`

## Workspace Watch Review

- Replaced polling with a real Tauri-backed file watcher in `src-tauri/src/main.rs` that emits workspace change events for markdown edits.
- Updated `src/composables/useWorkspace.ts` to listen for watcher events and silently refresh while preserving the current board and selected card when possible.
- Re-verified the change with `npm run build` and `cargo check --manifest-path src-tauri/Cargo.toml`.

## Editing Brainstorm

- [x] Review the current markdown-rendering frontend and schema constraints for editing
- [x] Propose robust but minimal editing approaches for card content and board moves
- [x] Clarify the desired editing interaction model
- [x] Present the recommended editing design for approval

## Editing Design Review

- Wrote the approved editing design to `docs/plans/2026-03-10-kanstack-editing-design.md`.
- Wrote the implementation phases to `docs/plans/2026-03-10-kanstack-editing-plan.md`.
- Locked the editing direction to modal-based card editing, board-file moves, and watcher-driven refresh after disk writes.

## Editing Implementation

- [x] Add robust Tauri write commands for card and board markdown files
- [x] Implement minimal card editor state and markdown serialization
- [x] Wire the card editor modal into the existing UI
- [x] Verify with `npm run build` and `cargo check --manifest-path src-tauri/Cargo.toml`

## Editing Implementation Review

- Added atomic markdown write commands for cards and boards in `src-tauri/src/main.rs`.
- Added card serialization in `src/utils/serializeCard.ts` and a focused editor workflow in `src/composables/useCardEditor.ts`.
- Added `src/components/card/CardEditorModal.vue` and wired it from `src/App.vue` and `src/components/card/CardModal.vue`.
- Kept the write flow simple: save to disk through Tauri, then rely on the existing watcher refresh instead of maintaining a second client-side source of truth.

## Sub-board Brainstorm

- [x] Review the current board rendering shape and sub-board representation
- [x] Clarify how sub-board cards should roll up into parent boards
- [x] Propose robust but minimal approaches for rendering sub-board items in parent boards
- [x] Present the recommended design for approval

## Sub-board Design Review

- Wrote the approved recursive rollup design with a simple sub-board toggle to `docs/plans/2026-03-11-kanstack-subboard-rollup-design.md`.
- Wrote the implementation phases to `docs/plans/2026-03-11-kanstack-subboard-rollup-plan.md`.
- Locked the first version to recursive descendant rollup, one visibility toggle, and inline source indicators on child-board cards.

## Sub-board Implementation Review

- Added a recursive board-view builder in `src/utils/buildBoardView.ts` that merges descendant boards into the active view while guarding against duplicate traversal.
- Updated `src/components/board/BoardCanvas.vue` with a simple sub-board visibility toggle and render-time rollup behavior.
- Updated `src/components/board/BoardColumn.vue` and `src/components/board/CardTile.vue` so rolled-up cards render inline and show a small source indicator.
- Verified the implementation with `npm run build` and `cargo check --manifest-path src-tauri/Cargo.toml`.
- Persisted the sub-board toggle in board settings via `src/utils/serializeBoardSettings.ts`, `src/components/board/BoardCanvas.vue`, and `src-tauri/src/main.rs`.

## Theme Review

- Shifted the app to a monochrome base by updating global tokens in `src/style.css`.
- Kept semantic red/green accents only for save and error states while converting board, header, and card accents to grayscale.
- Re-verified the theme pass with `npm run build`.
- Normalized remaining component hardcoded colors into shared tokens so visual surfaces, hover states, backdrops, and error styling now derive from `src/style.css`.

## Autosave Editor Review

- Removed explicit save/cancel actions from `src/components/card/CardEditorModal.vue` and replaced them with a single close action plus live save status.
- Added debounced autosave and blur-triggered flush behavior in `src/composables/useCardEditor.ts`.
- Prevented watcher refreshes from resetting the active editor session for the same card while editing.
- Re-verified the autosave editor flow with `npm run build`.

## Drag Brainstorm

- Reviewed a simple drag model for reordering and moving cards across columns.
- Adjusted the direction so rolled-up sub-board cards can participate too, while preserving their existing columns/status by default.
- Updated the drag direction again so rolled-up sub-board cards can move across columns by writing back to their source board and creating the destination column there when needed.

## Drag Implementation Review

- Added `src/utils/serializeBoard.ts` to move a card within its owning board and create missing destination columns when needed.
- Updated `src/components/board/BoardCanvas.vue`, `src/components/board/BoardColumn.vue`, and `src/components/board/CardTile.vue` to support drag start, drop zones, and persisted moves from rolled-up parent views.
- Kept drag writes scoped to the source board while using the merged parent view as the drag surface.
- Verified the implementation with `npm run build` and `cargo check --manifest-path src-tauri/Cargo.toml`.
- Stabilized the drag DOM in `src/components/board/BoardColumn.vue` by keeping drop zones mounted and only toggling their active state with CSS.
- Reworked drag targeting in `src/components/board/BoardColumn.vue` so the whole section accepts drops and computes an insertion position from cursor location.
- Replaced native HTML5 drag handling with a pointer-based drag composable in `src/composables/useBoardPointerDrag.ts`, following the reliable pattern from `Old/`.
- Smoothed drag visuals in `src/composables/useBoardPointerDrag.ts` by frame-batching pointer updates and skipping redundant target state changes.

## Group Removal Review

- Removed task-group handling from the active board experience by flattening board sections at parse time in `src/utils/parseWorkspace.ts`.
- Simplified the derived board view in `src/utils/buildBoardView.ts` to column-level card lists.
- Simplified board drag rendering in `src/components/board/BoardColumn.vue` and target lookup in `src/components/board/BoardCanvas.vue`.
- Updated `src/utils/serializeBoard.ts` so saved boards no longer preserve `###` subgroup headings.
- Verified the flattening change with `npm run build` and `cargo check --manifest-path src-tauri/Cargo.toml`.

## Drag Ghost Review

- Added a cloned card ghost in `src/composables/useBoardPointerDrag.ts` that follows the cursor once pointer drag passes the movement threshold.
- Kept the ghost synced inside the existing frame-batched drag loop and cleaned it up on pointer release.
- Verified the ghost interaction with `npm run build`.

## New Card Review

- Added a `new card` button to the board header in `src/components/board/BoardCanvas.vue`.
- Creating a card now writes a new markdown file with a unique `untitled-card` slug, inserts it into the first column of the active board, and opens it in the editor.
- Reused `src/utils/serializeCard.ts` and `src/utils/serializeBoard.ts` for minimal file creation and board insertion logic.
- Verified the flow with `npm run build` and `cargo check --manifest-path src-tauri/Cargo.toml`.

## Delete Review

- Added `delete_card_file` in `src-tauri/src/main.rs` to remove the card file and strip matching card bullets from `boards/*.md`.
- Added a confirmed delete action in `src/components/card/CardEditorModal.vue` backed by `src/composables/useCardEditor.ts`.
- Kept the delete flow minimal: delete from the editor, emit workspace refresh, and close the modal.
- Verified the delete flow with `npm run build` and `cargo check --manifest-path src-tauri/Cargo.toml`.

## Example Workspace Brainstorm

- [x] Review current example workspace and recent shipped app progress
- [x] Clarify that the example should reflect shipped work plus near-term work
- [x] Refine the scope to a single board only
- [x] Present the recommended single-board example design for approval

## Example Workspace Review

- Wrote the approved single-board refresh design to `docs/plans/2026-03-11-example-workspace-refresh-design.md`.
- Replaced the old auth-focused example with one realistic project board in `Example Workspace/boards/main.md` using `Backlog`, `In Progress`, `Review`, and `Done`.
- Added a fresh set of title-driven example card files in `Example Workspace/cards/` based on shipped app work and believable next steps.
- Removed obsolete example sub-boards so the workspace now matches the current single-board app model.

## Refactor Audit

- [x] Inspect the active app structure and isolate the highest-risk modules
- [x] Review frontend components and composables for complexity, coupling, and extraction opportunities
- [x] Review parser, serializer, and Tauri integration code for tech debt and design issues
- [x] Document prioritized refactor recommendations with concrete file-level notes

## Refactor Audit Review

- Identified `src/components/board/BoardCanvas.vue` and `src/composables/useWorkspace.ts` as the main orchestration hotspots with mixed UI, persistence, and state responsibilities.
- Found a likely autosave race in `src/composables/useCardEditor.ts` where edits made during an in-flight save can be left dirty without a guaranteed follow-up save.
- Confirmed a schema/implementation mismatch around board sections across `docs/schemas/kanban-parser-schema.ts`, `src/utils/parseWorkspace.ts`, and `src/utils/serializeBoard.ts` that makes round-trip saves lossy.
- Found multi-file workspace mutations split across frontend and Rust commands, with duplicated markdown mutation rules and no transactional guardrails.
- Confirmed there are currently no automated test files covering the parser, serializers, drag logic, or Tauri file commands.
