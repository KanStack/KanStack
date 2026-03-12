# Kanstack Undo Redo Design

## Goal

Add session-only global undo/redo with a capped in-memory history stack.

## Constraints

- history is in memory only
- history is capped to the last 100 actions
- no persistence across app restarts
- new actions clear the redo stack after an undo

## Architecture

- add a global frontend action history manager with `past` and `future` stacks
- each history record stores:
  - `label`
  - `before` app state snapshot
  - `after` app state snapshot
- app state snapshot includes:
  - workspace snapshot
  - selected board
  - selected card
  - selected column

## Replay Model

- add a Tauri `apply_workspace_snapshot` command that rewrites the current `boards/` and `cards/` directories to match a provided snapshot
- undo replays the `before` snapshot
- redo replays the `after` snapshot
- frontend then applies the returned snapshot immediately without waiting for filesystem watcher refreshes

## Phase 1 Scope

- board rename
- board settings toggles
- column add / rename / delete / reorder
- board delete

## Later Phases

- card create / move / archive / delete / rename
- coalesced editor text edits as grouped history steps

## UX

- `Cmd/Ctrl+Z` = undo
- `Cmd/Ctrl+Shift+Z` and `Cmd/Ctrl+Y` = redo
- native menu gets `Edit -> Undo` and `Edit -> Redo`
- history labels are human-readable, e.g. `Rename Column`, `Delete Board`, `Toggle Archive Column`

## Verification

- undo/redo restores workspace files and UI selection correctly
- history never exceeds 100 items
- redo clears after any new action following undo
- destructive actions in phase 1 restore correctly within the current session
