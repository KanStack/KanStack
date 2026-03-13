---
title: Add Board Sorting and Filtering
type: feature
priority: high
assignee: AGENT
tags:
  - board
  - ux
  - settings
---

# Add Board Sorting and Filtering

Add clean, simple, durable sorting and filtering for board views without breaking the markdown-first model.

## Spec

- Design sorting and filtering as board-view behavior, not ad hoc UI state.
- Persist the chosen sort/filter behavior globally in a unified local `config.md`, alongside known boards and future machine-local settings.
- Remove board-level sorting/filtering settings rather than supporting per-board overrides for this feature.
- Keep canonical board ordering safe and understandable by changing render order only, not markdown order.
- Make the feature simple enough for daily use, but structured enough to grow later.
- Support filtering by custom card metadata fields, not just built-in fields, when the field values are suitable for a clean dropdown/value picker flow.

## Checklist

- [x] Audit current board-view, settings, and metadata capabilities
- [x] Confirm the first sorting/filtering use case and scope
- [x] Compare a few implementation approaches and choose one
- [x] Write the approved design before implementation
- [x] Add unified local `config.md` persistence and migrate known boards/local workspace state
- [x] Add frontend global config state and view preferences wiring
- [x] Implement render-only sorting/filtering across all boards
- [x] Add compact global view controls and disable ambiguous reorder interactions
- [x] Verify persistence, rendering behavior, and migrations

## Approved Direction

- Use a single machine-local `config.md` file for known boards, global view preferences, and future local settings.
- Apply one global sorting/filtering view across all boards.
- Keep markdown order canonical and unchanged; sorting and filtering affect rendering only.
- Remove board-level ownership of sorting/filtering behavior for this feature.
- Disable reorder interactions when an active sort/filter would make persisted ordering ambiguous.

## Review Notes

- Approved global-view design written in `docs/plans/2026-03-13-global-board-sorting-filtering-design.md`.
- Revised persistence direction: replace separate local json files with a unified machine-local markdown config.
- Added backend `config.md` persistence plus legacy known-board migration in `src-tauri/src/backend/commands/config.rs`.
- Moved workspace-path and global view state into frontend app config handling in `src/composables/useWorkspace.ts`.
- Added global render-only sort/filter derivation and then simplified the controls to search + sort dropdown + one filter dropdown/value pair.
- Replaced native selects in the board view with a custom in-app dropdown component for a more consistent shell.
- Card reordering now disables automatically whenever active view preferences make rendered order non-canonical.

## Verification

- [x] Design approved for a global, persistent, render-only sorting/filtering model backed by unified local `config.md`
- [x] `npm test -- src/utils/boardViewPreferences.test.ts src/components/board/columnHeaderInteraction.test.ts src/utils/boardMarkdown.test.ts`
- [x] `npm run build`
- [x] `cargo test --manifest-path "src-tauri/Cargo.toml"`
- [x] `cargo check --manifest-path "src-tauri/Cargo.toml"`
- [x] Simplified the view controls to one active filter path with custom dropdowns in `src/components/board/BoardViewControls.vue`
