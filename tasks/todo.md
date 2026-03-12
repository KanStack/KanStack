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

## Refactor Implementation

- [x] Write the approved refactor design to `docs/plans/2026-03-11-kanstack-refactor-design.md`
- [x] Restore section-aware board parsing, view modeling, and serialization
- [x] Extract board actions out of `src/components/board/BoardCanvas.vue`
- [x] Harden card editor autosave/session handling and drag/workspace lifecycles
- [x] Add focused parser/serializer tests and verify with build checks

## Refactor Implementation Review

- Restored section-aware board parsing and serialization in `src/utils/parseWorkspace.ts`, `src/utils/buildBoardView.ts`, and `src/utils/serializeBoard.ts`, and updated `src/components/board/BoardColumn.vue` to render named sections again.
- Extracted board persistence concerns into `src/composables/useBoardActions.ts`, leaving `src/components/board/BoardCanvas.vue` focused on view composition and UI events.
- Hardened editor and lifecycle behavior by queueing autosaves in `src/composables/useCardEditor.ts`, tightening modal session syncing in `src/components/card/CardEditorModal.vue`, explicitly replacing workspace watchers in `src/composables/useWorkspace.ts`, and cleaning drag teardown in `src/composables/useBoardPointerDrag.ts`.
- Centralized markdown helpers with `src/utils/kanbanPath.ts`, `src/utils/workspaceSnapshot.ts`, and shared board settings block serialization in `src/utils/serializeBoardSettings.ts`.
- Added parser/serializer coverage in `src/utils/boardMarkdown.test.ts` and verified the refactor with `npm test`, `npm run build`, and `cargo check --manifest-path src-tauri/Cargo.toml`.
- Added transactional-style multi-file writes in `src-tauri/src/main.rs` so card creation can write the card file and board file through one backend command with rollback if a later write fails.
- Updated `delete_card_file` in `src-tauri/src/main.rs` to stage board detach rewrites before removing the card file and roll board changes back if the file delete fails.
- Updated `src/composables/useBoardActions.ts` to use the new `create_card_in_board` backend command instead of chaining separate frontend write calls.

## Archive Column Feature

- [x] Write the approved archive column design to `docs/plans/2026-03-11-kanstack-archive-column-design.md`
- [x] Preserve source board ownership when selecting cards from rolled-up views
- [x] Add hidden-by-default archive column toggle and persistence
- [x] Add archive action in the editor that moves cards into `Archive`
- [x] Add/archive-focused tests and verify with build checks

## Archive Column Feature Review

- Added archive constants in `src/utils/archiveColumn.ts` and a persisted board setting in `docs/schemas/kanban-parser-schema.ts` so boards can hide `Archive` by default and reveal it on demand.
- Preserved source board ownership through selection by passing `{ slug, sourceBoardSlug }` from board tiles into `src/composables/useWorkspace.ts`, then through `src/App.vue` into `src/components/card/CardEditorModal.vue`.
- Added the archive toggle in `src/components/board/BoardCanvas.vue` and filtered the rendered column set so `Archive` stays hidden unless `show-archive-column` is enabled.
- Added editor-driven archive moves in `src/components/card/CardEditorModal.vue` and `src/composables/useBoardActions.ts`, using `src/utils/serializeBoard.ts` to create the `Archive` column on demand.
- Added archive contract coverage in `src/utils/boardMarkdown.test.ts` and verified the feature with `npm test`, `npm run build`, and `cargo check --manifest-path src-tauri/Cargo.toml`.

## Sub-Board Button Feature

- [x] Write the approved sub-board button design to `docs/plans/2026-03-11-kanstack-sub-board-button-design.md`
- [x] Add serializer/helpers for creating linked sub boards
- [x] Add transactional backend command for new sub-board creation
- [x] Wire a `new sub board` button into the board header and navigate to the new board
- [x] Add focused tests and verify with build checks

## Sub-Board Button Feature Review

- Added board creation/linking helpers in `src/utils/serializeBoard.ts` and a board slug helper in `src/utils/slug.ts` so sub boards can be created from the current board structure and linked under `## Sub Boards`.
- Added a transactional `create_sub_board` backend command in `src-tauri/src/main.rs` that writes the new child board file and the updated parent board file together.
- Updated `src/composables/useBoardActions.ts` with `createSubBoard()` and wired a `new sub board` button into `src/components/board/BoardCanvas.vue` that immediately navigates to the new board after creation.
- Added serializer coverage for child board creation/linking in `src/utils/boardMarkdown.test.ts` and verified the feature with `npm test`, `npm run build`, and `cargo check --manifest-path src-tauri/Cargo.toml`.

## Rename Behavior Feature

- [x] Write the approved rename behavior design to `docs/plans/2026-03-11-kanstack-rename-behavior-design.md`
- [x] Add shared rename target helpers and board/card rename serialization support
- [x] Add transactional backend rename commands that rewrite board links safely
- [x] Keep current board selection and card editor state attached through rename mutations
- [x] Add focused tests and verify with frontend and Rust test/build checks

## Rename Behavior Feature Review

- Added shared rename target planning in `src/utils/renameTarget.ts` and board rename serialization in `src/utils/serializeBoard.ts`.
- Added `rename_card` and `rename_board` commands plus shared link-rewrite helpers/tests in `src-tauri/src/main.rs` so file renames and board link rewrites happen transactionally.
- Updated `src/composables/useWorkspace.ts` to apply returned mutation snapshots immediately, preserving board/card selection without waiting for watcher refresh timing.
- Added inline board title editing in `src/components/board/BoardCanvas.vue` and restored true card rename behavior in `src/composables/useCardEditor.ts` with mutation propagation through `src/components/card/CardEditorModal.vue` and `src/App.vue`.
- Verified with `npm test`, `npm run build`, and `cargo test --manifest-path src-tauri/Cargo.toml`.

## Board Navigation Feature

- [x] Write the approved board navigation design to `docs/plans/2026-03-11-kanstack-board-navigation-design.md`
- [x] Derive breadcrumb lineage, siblings, and child boards in workspace state
- [x] Replace the flat header selector with breadcrumb and context panel navigation
- [x] Move `new sub board` into the header navigation panel
- [x] Verify with tests/build checks and review the resulting navigation flow

## Board Navigation Feature Review

- Replaced the flat board `<select>` in `src/components/app/AppHeader.vue` with breadcrumb-based navigation and a current-board context panel for siblings, sub boards, and `new sub board`.
- Derived lineage, sibling, and child board context in `src/composables/useWorkspace.ts` from the existing `subBoards` graph.
- Moved `new sub board` creation into header navigation by wiring `src/App.vue` to a header-level `useBoardActions` instance and removing the duplicate button from `src/components/board/BoardCanvas.vue`.
- Verified the redesign with `npm run build` and `npm test`.

## Shortcuts and Selection Feature

- [x] Write the approved shortcuts/selection design to `docs/plans/2026-03-11-kanstack-shortcuts-selection-design.md`
- [x] Add app-level visible-board selection state and range/toggle selection behavior
- [x] Add keyboard shortcut dispatch for selection-aware actions
- [x] Add native Tauri menu items that trigger the same actions
- [x] Verify with tests/build checks and review desktop interaction flow

## Shortcuts and Selection Feature Review

- Added visible-board multi-selection state in `src/composables/useBoardSelection.ts` and wired single-click, cmd/ctrl-click, shift-click, and double-click card interactions through `src/components/board/CardTile.vue`, `src/components/board/BoardColumn.vue`, `src/components/board/BoardCanvas.vue`, and `src/App.vue`.
- Added app-level keyboard dispatch in `src/App.vue` for `Escape`, `Enter`, `Delete`/`Backspace`, `Cmd/Ctrl+O`, `Cmd/Ctrl+N`, `Cmd/Ctrl+Shift+N`, `Cmd/Ctrl+Shift+A`, and `Cmd/Ctrl+.` with editable-field safety checks.
- Added custom close/cancel event bridging so shortcuts can safely close the editor and cancel inline board rename through `src/components/card/CardEditorModal.vue` and `src/components/board/BoardCanvas.vue`.
- Added native Tauri menu items and menu-action event forwarding in `src-tauri/src/main.rs`, mirroring the same frontend actions for file, board, and card commands.
- Verified the feature with `npm run build`, `npm test`, `cargo check --manifest-path src-tauri/Cargo.toml`, and `cargo test --manifest-path src-tauri/Cargo.toml`.
- Added arrow-key selection navigation in `src/composables/useBoardSelection.ts` and `src/App.vue`, with left/up moving to the previous visible card and right/down moving to the next visible card when the editor is not open.
- Refined horizontal arrow navigation so `ArrowLeft` and `ArrowRight` move between columns by nearest row position, using visible column and row metadata emitted from `src/components/board/BoardCanvas.vue`.

## Global Columns Feature

- [x] Write the approved global columns design to `docs/plans/2026-03-11-kanstack-global-columns-design.md`
- [x] Add shared global column derivation and board rewrite helpers
- [x] Add app-level column selection and inline column rename flow
- [x] Add global add/rename/delete column actions plus Board menu items
- [x] Verify with tests/builds and review shared column behavior

## Global Columns Feature Review

- Added shared workspace column derivation in `src/utils/workspaceColumns.ts` and board rewrite helpers in `src/utils/serializeBoard.ts` so columns can be added, renamed, and deleted across every board file.
- Added transactional workspace-wide board saves in `src-tauri/src/main.rs` via `save_workspace_boards`, and added native `Board` menu items for `New Column`, `Rename Column`, and `Delete Column`.
- Added app-level column selection state and global column actions in `src/App.vue`, including `Delete` key support, menu dispatch, and protected handling for the `Archive` column.
- Updated `src/components/board/BoardCanvas.vue` and `src/components/board/BoardColumn.vue` so clicking a column header selects it, clicking the selected title renames it inline, and `+ column` adds a shared `Untitled Column`.
- Updated board markdown tests in `src/utils/boardMarkdown.test.ts` and verified with `npm test`, `npm run build`, and `cargo check --manifest-path src-tauri/Cargo.toml`.

## Column Reorder Feature

- [x] Write the approved column reorder design to `docs/plans/2026-03-11-kanstack-column-reorder-design.md`
- [x] Add shared archive-aware column ordering helpers and board rewrites
- [x] Add header-based column drag and insertion markers
- [x] Save reordered columns globally while keeping `Archive` pinned right
- [x] Verify with tests/builds and review drag behavior

## Column Reorder Feature Review

- Added archive-aware workspace column ordering helpers in `src/utils/workspaceColumns.ts` and board reorder/sync helpers in `src/utils/serializeBoard.ts` so global column order stays consistent and `Archive` remains pinned right.
- Added a dedicated column drag composable in `src/composables/useBoardColumnDrag.ts` and wired header-based drag interactions plus insertion markers through `src/components/board/BoardCanvas.vue` and `src/components/board/BoardColumn.vue`.
- Updated `src/App.vue` and `src/composables/useBoardActions.ts` so reordered columns are saved across every board file and new columns are inserted immediately before `Archive`.
- Added reorder coverage to `src/utils/boardMarkdown.test.ts` and verified with `npm test`, `npm run build`, and `cargo check --manifest-path src-tauri/Cargo.toml`.

## Undo Redo Plan

- [x] Add an in-memory action manager with capped `past`/`future` stacks (100 items max) and action labels
- [x] Add a backend workspace snapshot restore/apply command for session-only undo/redo replay
- [x] Route board and column mutations through a single action execution layer for the first rollout
- [ ] Add undo/redo shortcuts and native menu items with disabled states/labels
- [ ] Coalesce card editor autosave changes into grouped edit actions instead of per-keystroke history

## Undo Redo Review

- Added an in-memory history manager in `src/history/useActionHistory.ts` with capped `past`/`future` stacks and no cross-session persistence.
- Added `apply_workspace_snapshot` in `src-tauri/src/main.rs` so undo/redo can replay full workspace snapshots safely for the current session.
- Routed phase-1 board and column actions through tracked execution in `src/App.vue`, including board rename/delete, archive/sub-board visibility toggles, and column add/rename/delete/reorder.
- Added native `Edit -> Undo` / `Redo` menu items and keyboard shortcuts in `src-tauri/src/main.rs` and `src/App.vue`.
- Routed card create, sub-board create, card drag/keyboard move, archive, and delete through the same tracked history flow in `src/App.vue`, `src/components/board/BoardCanvas.vue`, and `src/components/card/CardEditorModal.vue`.
- Remaining follow-up: coalesce card editor autosave/title/body/metadata edits into grouped undoable edit actions and improve native menu label/disabled-state updates.
