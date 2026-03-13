# KanStack Global Columns Design

## Goal

Make board columns a shared workspace-wide schema instead of a per-board structure that can drift.

## Behavior

- adding a column adds it to every board
- renaming a column renames it in every board
- deleting a column removes it from every board
- new boards inherit the shared column layout
- `Archive` is part of the shared layout but cannot be renamed or deleted

## Interaction

- click a column header to select that column
- click the already-selected column title to rename it inline
- `+ column` in the board header creates `Untitled Column`
- `Delete` deletes the selected column when no card selection/editor/input is active
- native `Board` menu gets `New Column`, `Rename Column`, and `Delete Column`

## Safety

- column deletion is blocked if any board still has cards in that column
- `Archive` rename/delete is blocked
- global column mutations rewrite all board files in one backend operation

## Implementation

- derive a canonical global column schema from the current workspace
- add serializer helpers for add/rename/delete column board rewrites
- add a transactional backend command to save multiple board files and return a fresh workspace snapshot
- keep selected column state at the app level, separate from card selection

## Verification

- new columns appear across all boards
- renamed columns update across all boards
- delete is blocked when any board still has cards in the selected column
- sub-boards created later inherit the shared layout
