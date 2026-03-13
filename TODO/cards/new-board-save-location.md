---
title: New Board Save Location
type: feature
priority: high
tags:
  - boards
  - ux
  - file-system
assignee: ai-agent
---

# New Board Save Location

Change board creation so the app asks where to save a new board, whether it ends up being a child board, the current root, or a parent discovered later.

## Spec

- Review the current `New Sub Board` flow in the frontend and Tauri backend.
- Define how the app should ask for a target save location before creating a board root.
- Clarify how a newly created board becomes linked, discovered, or opened when it is not necessarily a direct child of the current board.
- Keep planning in this card until the design is approved.

## Checklist

- [x] Review the current board creation flow
- [x] Clarify save-location behavior and constraints
- [x] Propose options and recommend one
- [x] Capture the approved design and implementation plan
- [x] Replace the child-specific frontend action with a generic `New Board` flow
- [x] Add a backend board-creation command that writes a new `TODO/` root without linking it
- [x] Update menu/header labels and related docs/tests
- [x] Run verification and move the card to `Review`

## Review Notes

- Current `createSubBoard` always generates a child directory name under the current board's project tree and creates `TODO/todo.md`, `TODO/README.md`, and `TODO/cards/` there automatically.
- The app already uses Tauri dialog capabilities, so asking for a location should likely build on that instead of a custom path textbox first.
- Correction from the user: creation should become a generic `New Board` flow, not only a direct sub-board flow.
- New implication: the created board may later be linked into the known-board tree automatically, or it may sit above the current board and act as a future parent/root instead.
- Approved direction: `New Board` should create a board anywhere, without linking it or changing the current session; discovery is a separate follow-up action.
- Revised design doc saved at `docs/plans/2026-03-12-new-board-save-location-design.md`.
- Implemented a generic `New Board` action with a native folder picker and no automatic board linking.
- Replaced the child-specific backend create command with a generic `create_board` flow that writes a new `TODO/` root at the selected destination.
- The current board stays open after creation, and the new board is registered into the known-board set so later tree rebuilds can relate it automatically.

## Verification

- [x] Revised design covers generic board creation, discovery behavior, and current-board follow-up actions
- [x] `npm test`
- [x] `npm run build`
- [x] `cargo test --manifest-path src-tauri/Cargo.toml`
- [x] `cargo check --manifest-path src-tauri/Cargo.toml`
