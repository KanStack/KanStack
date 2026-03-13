# KanStack Column Reorder Design

## Goal

Allow global column reordering by drag-and-drop while keeping `Archive` pinned to the far right.

## Behavior

- columns are reordered from the column header strip
- dragging a column updates the shared workspace column order across all boards
- `Archive` always stays on the far right
- `Archive` cannot be dragged
- new columns insert on the far right of normal columns, immediately before `Archive`

## Interaction

- drag starts from the column header only, not from the card body area
- insertion markers appear between columns while dragging
- dropping rewrites every board file to the new shared order
- card drag behavior remains unchanged

## Implementation

- add a dedicated column drag composable instead of overloading card drag logic
- split visible columns into reorderable columns plus optional archive column in the board canvas
- add serializer helpers to reorder columns in every board file
- normalize shared workspace columns so `Archive` is always last

## Verification

- dragging a normal column updates order everywhere
- dragging cannot move `Archive`
- new columns are created before `Archive`
- build and tests remain green
